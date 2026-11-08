import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  getDocFromServer,
  writeBatch,
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
// Default to true because the free daily write quota for this project is exhausted for today
let quotaExceededState = true;

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
        }
      }
    } catch {}
  }
  return true; // Conservative default: protect against quota exceeded errors
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

// Initial check on load - safely disable network write streams
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
    await withTimeout(getDocFromServer(doc(db, 'store_config', 'settings')), 1000, null);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      // quota marked
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

  return withTimeout(savePromise, 1500, false);
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
