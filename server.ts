import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // AI Studio requires the dev server to run on port 3000 (nginx proxy runs on 8080)
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const dataDir = path.resolve(__dirname, 'data');
  const dataFile = path.resolve(dataDir, 'state.json');
  const defaultStateFile = path.resolve(__dirname, 'src/data/defaultState.json');

  let inMemoryState: any = null;
  let firestoreDb: any = null;

  app.use(express.json({ limit: '50mb' }));

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Intercept and suppress noisy Firebase SDK stream errors in server console
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
      serverQuotaExceeded = true;
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Initialize Firebase Firestore on server
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, setLogLevel } = await import('firebase/firestore');
      try {
        setLogLevel('silent');
      } catch {}
      const firebaseApp = initializeApp(firebaseConfig);
      firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      console.log('Firebase Firestore initialized in server.ts');
    }
  } catch (err) {
    console.warn('Could not initialize Firebase in server.ts:', err);
  }

  // Initialize in-memory state
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf8');
      inMemoryState = JSON.parse(raw);
    } else if (fs.existsSync(defaultStateFile)) {
      const raw = fs.readFileSync(defaultStateFile, 'utf8');
      inMemoryState = JSON.parse(raw);
      if (!inMemoryState.updatedAt) {
        inMemoryState.updatedAt = 1730592000000;
      }
      fs.writeFileSync(dataFile, JSON.stringify(inMemoryState, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Error initializing state:', err);
  }

  const quotaFile = path.resolve(dataDir, 'quota.json');
  // Default to true since free tier write quota for this project is exhausted today
  let serverQuotaExceeded = true;

  const markServerQuotaExceeded = () => {
    serverQuotaExceeded = true;
    try {
      fs.writeFileSync(quotaFile, JSON.stringify({
        quotaExceeded: true,
        timestamp: Date.now(),
        resetAfter: 24 * 60 * 60 * 1000,
        reason: 'Free daily write units per project (free tier database) limit exceeded'
      }, null, 2), 'utf8');
    } catch {}
  };

  const checkQuotaStatus = (): boolean => {
    try {
      if (fs.existsSync(quotaFile)) {
        const qData = JSON.parse(fs.readFileSync(quotaFile, 'utf8'));
        if (qData.quotaExceeded) {
          const age = Date.now() - (qData.timestamp || 0);
          const resetWindow = qData.resetAfter || (24 * 60 * 60 * 1000);
          if (age < resetWindow) {
            serverQuotaExceeded = true;
            return true;
          }
        }
      } else {
        // Automatically re-create quota file if deleted so protection persists
        markServerQuotaExceeded();
        return true;
      }
    } catch {}
    return serverQuotaExceeded;
  };

  checkQuotaStatus();

  app.get('/api/state', async (_req, res) => {
    try {
      const isQuotaOut = checkQuotaStatus();
      if (firestoreDb && !isQuotaOut) {
        try {
          const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
          const settingsSnap = await getDoc(doc(firestoreDb, 'store_config', 'settings'));

          if (settingsSnap.exists()) {
            const settingsData = settingsSnap.data();
            const productsSnap = await getDocs(collection(firestoreDb, 'products'));
            const products: any[] = [];
            productsSnap.forEach((d) => products.push(d.data()));

            const fsState = {
              v: 1,
              updatedAt: settingsData.updatedAt || Date.now(),
              settings: settingsData.settings,
              products,
              quotaExceeded: isQuotaOut,
            };
            inMemoryState = fsState;
            try {
              fs.writeFileSync(dataFile, JSON.stringify(fsState, null, 2), 'utf8');
            } catch {}
            return res.json(fsState);
          } else {
            // Read-only legacy fallback without writes
            const legacySnap = await getDoc(doc(firestoreDb, 'store_config', 'latest')).catch(() => null);
            if (legacySnap && legacySnap.exists()) {
              const legacyData = legacySnap.data() as any;
              if (legacyData && legacyData.settings && Array.isArray(legacyData.products)) {
                inMemoryState = { ...legacyData, quotaExceeded: isQuotaOut };
                return res.json(inMemoryState);
              }
            }
          }
        } catch (fsErr: any) {
          const msg = fsErr?.message || String(fsErr);
          if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded') || msg.includes('quota metric')) {
            markServerQuotaExceeded();
          }
          console.warn('Firestore read fallback to local state.');
        }
      }

      if (inMemoryState) {
        return res.json({ ...inMemoryState, quotaExceeded: checkQuotaStatus() });
      }
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf8');
        inMemoryState = JSON.parse(raw);
        return res.json({ ...inMemoryState, quotaExceeded: checkQuotaStatus() });
      }
      if (fs.existsSync(defaultStateFile)) {
        const raw = fs.readFileSync(defaultStateFile, 'utf8');
        inMemoryState = JSON.parse(raw);
        return res.json({ ...inMemoryState, quotaExceeded: checkQuotaStatus() });
      }
      return res.status(404).json({ error: 'No state found' });
    } catch (err) {
      console.error('Error reading state:', err);
      if (inMemoryState) return res.json({ ...inMemoryState, quotaExceeded: checkQuotaStatus() });
      return res.status(500).json({ error: 'Failed to read state' });
    }
  });

  app.post('/api/state', async (req, res) => {
    try {
      const incomingState = req.body;
      if (!incomingState || !incomingState.settings || !Array.isArray(incomingState.products)) {
        return res.status(400).json({ error: 'Invalid state format' });
      }

      // Ensure updatedAt is stamped
      const now = Date.now();
      const updatedState = {
        ...incomingState,
        v: incomingState.v || 1,
        updatedAt: Math.max(incomingState.updatedAt || 0, now),
      };

      inMemoryState = updatedState;
      fs.writeFileSync(dataFile, JSON.stringify(updatedState, null, 2), 'utf8');

      const isQuotaOut = checkQuotaStatus();

      // Respond immediately to the client so UI never hangs
      res.json({
        success: true,
        quotaExceeded: isQuotaOut,
        state: updatedState,
        message: 'State saved successfully',
      });

      // Background sync to Firestore only if quota is NOT exceeded
      if (firestoreDb && !isQuotaOut) {
        (async () => {
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Firestore sync timeout')), 3000)
            );
            const syncPromise = (async () => {
              const { doc, setDoc, deleteDoc, collection, getDocs } = await import('firebase/firestore');
              await setDoc(doc(firestoreDb, 'store_config', 'settings'), {
                settings: updatedState.settings,
                updatedAt: updatedState.updatedAt,
                v: updatedState.v,
              });

              const existingProductsSnap = await getDocs(collection(firestoreDb, 'products'));
              const incomingIds = new Set(updatedState.products.map((p: any) => p.id));
              for (const pDoc of existingProductsSnap.docs) {
                if (!incomingIds.has(pDoc.id)) {
                  await deleteDoc(pDoc.ref).catch(() => {});
                }
              }

              for (const p of updatedState.products) {
                await setDoc(doc(firestoreDb, 'products', p.id), p).catch(() => {});
              }

              await deleteDoc(doc(firestoreDb, 'store_config', 'latest')).catch(() => {});
            })();

            await Promise.race([syncPromise, timeoutPromise]);
          } catch (fsErr: any) {
            const msg = fsErr?.message || String(fsErr);
            if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded') || msg.includes('quota metric')) {
              markServerQuotaExceeded();
            }
          }
        })().catch(() => {});
      }
    } catch (err) {
      console.error('Error saving state:', err);
      return res.status(500).json({ error: 'Failed to save state' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/download-project', (_req, res) => {
    const zipPath = path.resolve(__dirname, 'public/skip_store_full_project.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'skip_store_full_project.zip');
    } else {
      res.status(404).json({ error: 'Archive not found' });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
