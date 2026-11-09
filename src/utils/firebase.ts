import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  disableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { StoreState, StoreSettings, Product } from './store';

// Suppress internal Firestore SDK verbose logging to prevent console pollution
try {
  setLogLevel('silent');
} catch {}

if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const str = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ');
    if (
      str.includes('RESOURCE_EXHAUSTED') ||
      str.includes('Quota limit exceeded') ||
      str.includes('quota metric') ||
      str.includes('Free daily write units') ||
      str.includes('Using maximum backoff delay') ||
      str.includes('GrpcConnection RPC')
    ) {
      markQuotaExceeded();
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const ADMIN_EMAIL = 'skipstore27@gmail.com';
export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
export async function loginAdmin(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  if ((credential.user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    await signOut(auth);
    throw new Error('هذا الحساب غير مصرح له بإدارة المتجر');
  }
  return credential.user;
}
export async function logoutAdmin(): Promise<void> {
  await signOut(auth);
}


export function getFirestoreConsoleUrl(): string {
  return `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const QUOTA_STORAGE_KEY = 'skip_firestore_quota_until';
let quotaExceededState = false;

// Safe promise timeout wrapper that never rejects or hangs
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => {
    clearTimeout(timer);
    return fallback;
  });
}

export function isFirestoreQuotaExceeded(): boolean {
  if (quotaExceededState) return true;
  if (typeof window !== 'undefined') {
    try {
      const untilStr = localStorage.getItem(QUOTA_STORAGE_KEY);
      if (untilStr) {
        const until = Number(untilStr);
        if (Date.now() < until) {
          quotaExceededState = true;
          return true;
        } else {
          localStorage.removeItem(QUOTA_STORAGE_KEY);
          quotaExceededState = false;
        }
      }
    } catch {}
  }
  return false;
}

export function markQuotaExceeded(): void {
  quotaExceededState = true;
  if (typeof window !== 'undefined') {
    try {
      const twelveHours = 12 * 60 * 60 * 1000;
      localStorage.setItem(QUOTA_STORAGE_KEY, String(Date.now() + twelveHours));
    } catch {}
  }
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

// Initial check on load - safely disable network write streams only if actually locked
if (isFirestoreQuotaExceeded()) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const exceeded = (
    msg.includes('resource-exhausted') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('quota limits') ||
    msg.includes('quota metric') ||
    msg.includes('GrpcConnection RPC') ||
    msg.includes('maximum backoff delay')
  );
  if (exceeded) {
    markQuotaExceeded();
  }
  return exceeded;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaExceededError(error)) {
    return;
  }
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
}

export async function testConnection() {
  if (isFirestoreQuotaExceeded()) return;
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 1500, null);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration.");
    } else if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
  }
}

// Fetch complete store state from separate collections (/store_config/settings + /products) - with strict 1500ms timeout
export async function getStoreStateFromFirestore(): Promise<StoreState | null> {
  if (isFirestoreQuotaExceeded()) return null;

  const fetchPromise = (async (): Promise<StoreState | null> => {
    try {
      const settingsSnap = await getDoc(doc(db, 'store_config', 'settings'));

      if (settingsSnap.exists()) {
        const settings = settingsSnap.data().settings as StoreSettings;
        const updatedAt = (settingsSnap.data().updatedAt as number) || Date.now();
        const productsSnap = await getDocs(collection(db, 'products'));
        const products: Product[] = [];
        productsSnap.forEach((docSnap) => {
          products.push(docSnap.data() as Product);
        });

        if (settings) {
          return {
            v: 1,
            updatedAt,
            settings,
            products,
          };
        }
      }

      // Read-only fallback for legacy document without attempting write
      const legacySnap = await getDoc(doc(db, 'store_config', 'latest')).catch(() => null);
      if (legacySnap && legacySnap.exists()) {
        const legacyState = legacySnap.data() as StoreState;
        if (legacyState && legacyState.settings && Array.isArray(legacyState.products)) {
          return legacyState;
        }
      }

      return null;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        handleFirestoreError(error, OperationType.GET, 'store_config/settings');
      }
      return null;
    }
  })();

  return withTimeout(fetchPromise, 1500, null);
}

// Delete a single product directly and atomically from Firestore with 1500ms timeout
export async function deleteProductFromFirestore(productId: string, newUpdatedAt: number): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) return false;

  const deletePromise = (async (): Promise<boolean> => {
    try {
      const batch = writeBatch(db);
      const prodRef = doc(db, 'products', productId);
      batch.delete(prodRef);

      const settingsRef = doc(db, 'store_config', 'settings');
      batch.set(settingsRef, { updatedAt: newUpdatedAt }, { merge: true });

      const legacyRef = doc(db, 'store_config', 'latest');
      batch.delete(legacyRef);

      await batch.commit();
      return true;
    } catch (error) {
      if (isQuotaExceededError(error)) {
        return false;
      }
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      return false;
    }
  })();

  return withTimeout(deletePromise, 1500, false);
}

// Save complete store state safely into individual documents with strict 1500ms timeout
export async function saveStoreStateToFirestore(state: StoreState): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) return false;

  const savePromise = (async (): Promise<boolean> => {
    try {
      const batch = writeBatch(db);
      const now = state.updatedAt || Date.now();

      // 1. Save settings
      const settingsRef = doc(db, 'store_config', 'settings');
      batch.set(settingsRef, {
        settings: state.settings,
        updatedAt: now,
        v: state.v || 1,
      });

      // 2. Fetch existing products to delete removed ones explicitly
      const existingSnap = await getDocs(collection(db, 'products'));
      const currentProductIds = new Set(state.products.map((p) => p.id));

      existingSnap.forEach((dSnap) => {
        if (!currentProductIds.has(dSnap.id)) {
          batch.delete(dSnap.ref);
        }
      });

      // 3. Save each product as an individual document
      for (const p of state.products) {
        const pRef = doc(db, 'products', p.id);
        batch.set(pRef, p);
      }

      // 4. Delete legacy store_config/latest document to prevent stale restores
      const legacyRef = doc(db, 'store_config', 'latest');
      batch.delete(legacyRef);

      await batch.commit();
      return true;
    } catch (error) {
      if (isQuotaExceededError(error)) {
        return false;
      }
      handleFirestoreError(error, OperationType.WRITE, 'store_config/settings');
      return false;
    }
  })();

  return savePromise;
}

// Real-time listener across settings and products collection
export function subscribeToStoreState(
  onUpdate: (state: StoreState) => void,
  onError?: (err: unknown) => void
) {
  if (isFirestoreQuotaExceeded()) return () => {};

  let currentSettings: StoreSettings | null = null;
  let currentUpdatedAt = 0;
  let currentProductsMap: Map<string, Product> | null = null;

  const emit = () => {
    if (currentSettings && currentProductsMap !== null) {
      onUpdate({
        v: 1,
        updatedAt: currentUpdatedAt,
        settings: currentSettings,
        products: Array.from(currentProductsMap.values()),
      });
    }
  };

  try {
    const unsubSettings = onSnapshot(
      doc(db, 'store_config', 'settings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.settings) {
            currentSettings = data.settings;
            currentUpdatedAt = Math.max(currentUpdatedAt, data.updatedAt || 0);
            emit();
          }
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          // quota marked
        } else if (onError) {
          onError(error);
        }
      }
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const newMap = new Map<string, Product>();
        snap.forEach((dSnap) => {
          newMap.set(dSnap.id, dSnap.data() as Product);
        });
        currentProductsMap = newMap;
        emit();
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          // quota marked
        } else if (onError) {
          onError(error);
        }
      }
    );

    return () => {
      try {
        unsubSettings();
        unsubProducts();
      } catch {}
    };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      // quota marked
    }
    return () => {};
  }
}


// Orders and activity are stored in Firestore as well, with live listeners.
export async function recordActivity(item: import('./store').ActivityItem): Promise<void> {
  await setDoc(doc(db, 'activity', item.id), item);
}

export function subscribeToActivity(callback: (items: import('./store').ActivityItem[]) => void) {
  return onSnapshot(query(collection(db, 'activity'), orderBy('timestamp', 'desc')), (snap) => {
    callback(snap.docs.map((d) => d.data() as import('./store').ActivityItem));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'activity'));
}

export async function saveOrderToFirestore(order: import('./store').CustomerOrder): Promise<void> {
  await setDoc(doc(db, 'orders', order.id), order);
}

export function subscribeToOrders(callback: (items: import('./store').CustomerOrder[]) => void) {
  return onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
    callback(snap.docs.map((d) => d.data() as import('./store').CustomerOrder));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
}

export async function updateOrderStatusInFirestore(orderId: string, status: import('./store').CustomerOrder['status']): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error('الطلب غير موجود');
  await updateDoc(orderRef, { status });
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  await deleteDoc(doc(db, 'orders', orderId));
}
