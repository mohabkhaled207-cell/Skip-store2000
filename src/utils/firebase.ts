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
  runTransaction,
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
  return onAuthStateChanged(auth, (user) => {
    if (user && user.email?.toLowerCase() !== ADMIN_EMAIL) {
      void signOut(auth);
      callback(null);
      return;
    }
    callback(user);
  });
}
export async function loginAdmin(emailOrPassword: string, password?: string): Promise<User> {
  const email = password ? emailOrPassword.trim().toLowerCase() : ADMIN_EMAIL;
  const pwd = password || emailOrPassword;
  const credential = await signInWithEmailAndPassword(auth, email, pwd);
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

  return fetchPromise;
}

// Delete a single product directly and atomically from Firestore with 1500ms timeout
export async function deleteProductFromFirestore(
  productId: string,
  expectedUpdatedAt: number
): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) return false;

  try {
    const current = await getStoreStateFromFirestore();
    if (!current) return false;
    if ((current.updatedAt || 0) !== expectedUpdatedAt) {
      throw new Error('STORE_STATE_CONFLICT');
    }

    const nextState: StoreState = {
      ...current,
      updatedAt: Date.now(),
      products: current.products.filter((product) => product.id !== productId),
    };
    return await saveStoreStateToFirestore(nextState, expectedUpdatedAt);
  } catch (error) {
    if (error instanceof Error && error.message === 'STORE_STATE_CONFLICT') {
      throw error;
    }
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return false;
    }
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    return false;
  }
}

// Recursively strips any 'undefined' property values so Firestore setDoc/updateDoc/transaction never fails on 'Unsupported field value: undefined'
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as unknown as T;
  }
  return data;
}

// Save complete store state safely into individual documents with strict safety timeout
export async function saveStoreStateToFirestore(
  state: StoreState,
  expectedUpdatedAt: number = 0
): Promise<boolean> {
  if (isFirestoreQuotaExceeded()) return false;

  try {
    await runTransaction(db, async (transaction) => {
      const settingsRef = doc(db, 'store_config', 'settings');
      const legacyRef = doc(db, 'store_config', 'latest');
      const productsQuery = collection(db, 'products');

      // Read the complete current version before scheduling any writes.
      // The Web SDK transaction API reads document references, not collection queries.
      // Read products first; the settings revision below serializes every store mutation.
      const existingSnap = await getDocs(productsQuery);
      const [settingsSnap, legacySnap] = await Promise.all([
        transaction.get(settingsRef),
        transaction.get(legacyRef),
      ]);

      const currentUpdatedAt = settingsSnap.exists()
        ? Number(settingsSnap.data().updatedAt || 0)
        : legacySnap.exists()
          ? Number((legacySnap.data() as StoreState).updatedAt || 0)
          : 0;

      // Reject stale clients instead of allowing them to restore deleted products
      // or overwrite newer store settings.
      if (currentUpdatedAt !== expectedUpdatedAt) {
        throw new Error('STORE_STATE_CONFLICT');
      }

      const now = state.updatedAt || Date.now();
      const existingById = new Map(existingSnap.docs.map((item) => [item.id, item]));
      const nextProductIds = new Set(state.products.map((product) => product.id));

      transaction.set(settingsRef, sanitizeForFirestore({
        settings: state.settings,
        updatedAt: now,
        v: state.v || 1,
      }));

      for (const existing of existingSnap.docs) {
        if (!nextProductIds.has(existing.id)) {
          transaction.delete(existing.ref);
        }
      }

      for (const product of state.products) {
        const existing = existingById.get(product.id);
        const previousData = existing?.data();
        const cleanProd = sanitizeForFirestore(product);
        if (!previousData || JSON.stringify(previousData) !== JSON.stringify(cleanProd)) {
          transaction.set(doc(db, 'products', product.id), cleanProd);
        }
      }

      if (legacySnap.exists()) {
        transaction.delete(legacyRef);
      }
    });

    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return false;
    }
    if (error instanceof Error && error.message === 'STORE_STATE_CONFLICT') {
      console.warn('Firestore save rejected: a newer store version already exists.');
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, 'store_config/settings + products');
    return false;
  }
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
          markQuotaExceeded();
        } else {
          try {
            handleFirestoreError(error, OperationType.GET, 'store_config/settings');
          } catch {}
          if (onError) onError(error);
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
          markQuotaExceeded();
        } else {
          try {
            handleFirestoreError(error, OperationType.LIST, 'products');
          } catch {}
          if (onError) onError(error);
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
  await setDoc(doc(db, 'activity', item.id), sanitizeForFirestore(item));
}

export function subscribeToActivity(callback: (items: import('./store').ActivityItem[]) => void) {
  return onSnapshot(query(collection(db, 'activity'), orderBy('timestamp', 'desc')), (snap) => {
    callback(snap.docs.map((d) => d.data() as import('./store').ActivityItem));
  }, (error) => handleFirestoreError(error, OperationType.LIST, 'activity'));
}

export async function saveOrderToFirestore(order: import('./store').CustomerOrder): Promise<void> {
  await setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order));
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
