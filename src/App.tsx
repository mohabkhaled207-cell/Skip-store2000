import React, { useState, useEffect, useRef, useTransition } from 'react';
import defaultState from './data/defaultState.json';
import {
  StoreState,
  StoreSettings,
  Product,
  PW_SALT,
  PW_HASH,
  digits,
  phoneShow,
  buildWaLink,
  buildProductWaMessage,
  getNeededSizes,
  buildMapsLink,
  tiktokHandle,
  countAr,
  formatPrice,
  getCategories,
  filterProducts,
  countInStock,
  normalizeUrl,
  sha256,
  verifyAdminPassword,
  resolveLatestState,
  isStateNewer,
} from './utils/store';
import {
  saveStoreStateToFirestore,
  deleteProductFromFirestore,
  getStoreStateFromFirestore,
  subscribeToStoreState,
  testConnection,
  isFirestoreQuotaExceeded,
  markQuotaExceeded,
  getFirestoreConsoleUrl,
} from './utils/firebase';

// SVG Icons
const Icons = {
  wa: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.2a8.8 8.8 0 0 0-7.5 13.4L3.2 20.8l4.3-1.2A8.8 8.8 0 1 0 12 3.2z" />
      <path d="M9.2 8.4c-.4.7-.3 1.7.5 2.9.9 1.4 2.1 2.4 3.6 3 .8.3 1.4.2 1.9-.3l.4-.8-1.9-1-.7.6c-.8-.4-1.6-1.1-2-1.9l.6-.7-1-1.9z" />
    </svg>
  ),
  fb: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M14.2 20.5v-7.3h2.4l.4-2.9h-2.8V8.6c0-.8.3-1.4 1.4-1.4H17V4.6c-.3 0-1.1-.1-2.1-.1-2.2 0-3.6 1.3-3.6 3.7v2.1H8.9v2.9h2.4v7.3z" />
    </svg>
  ),
  tt: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4v10.2a3.6 3.6 0 1 1-3.6-3.6M14.5 4c.3 2.5 2 4.3 4.5 4.6" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 1 1 13 0c0 5.3-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  chev: (
    <svg className="chev" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  hanger: (
    <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 8V6.6a2 2 0 1 1 2.2 2L12 10.2 3.4 16c-.9.6-.5 2 .6 2h16c1.1 0 1.5-1.4.6-2L12 10.2" />
    </svg>
  ),
};

const LOCAL_STORAGE_KEY = 'skip_store_active_state_v1';

export default function App() {
  const [state, setState] = useState<StoreState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.settings && Array.isArray(parsed.products)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return defaultState as StoreState;
  });

  const [activeFilter, setActiveFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'pw' | 'detail' | 'product' | 'settings' | null>(null);

  // Modal forms
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<{
    id: string | null;
    name: string;
    category: string;
    price: string;
    sizes: string;
    soldOut: boolean;
    image: string;
  }>({
    id: null,
    name: '',
    category: '',
    price: '',
    sizes: '',
    soldOut: false,
    image: '',
  });
  const [settingsForm, setSettingsForm] = useState<StoreSettings>({ ...state.settings });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [formError, setFormError] = useState('');
  const [pwLockUntil, setPwLockUntil] = useState(0);
  const [pwFailCount, setPwFailCount] = useState(0);

  // Customer order size selection
  const [orderClothesSize, setOrderClothesSize] = useState('');
  const [orderPantsSize, setOrderPantsSize] = useState('');
  const [orderShoeSize, setOrderShoeSize] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const openDetailModal = (p: Product) => {
    setSelectedProduct(p);
    setOrderClothesSize('');
    setOrderPantsSize('');
    setOrderShoeSize('');
    setOrderNotes('');
    setActiveModal('detail');
  };

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persistent state saving to Server API & Firebase Firestore (never hangs)
  const persistState = async (newState: StoreState, successMessage: string) => {
    setIsBusy(true);
    const now = Date.now();
    const stampedState: StoreState = {
      ...newState,
      updatedAt: Math.max(newState.updatedAt || 0, now),
    };

    // 1. Update in-memory state and localStorage immediately (instant optimistic UI)
    setState(stampedState);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stampedState));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
    setIsDirty(false);
    setConfirmExit(false);

    try {
      // 2. Dispatch save to server API (saves to disk instantly) with strict timeout
      const serverFetchPromise = fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stampedState),
      }).then(async (r) => {
        if (!r.ok) return false;
        const resData = await r.json().catch(() => null);
        if (resData?.quotaExceeded) {
          markQuotaExceeded();
        }
        return true;
      }).catch(() => false);

      // 3. Dispatch to Firestore in background ONLY if quota is not exceeded
      if (!isFirestoreQuotaExceeded()) {
        saveStoreStateToFirestore(stampedState).catch(() => {});
      }

      // Race server response with a 1500ms safety timeout
      await Promise.race([
        serverFetchPromise,
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1500)),
      ]);

      showToast(successMessage, 3500);
      return true;
    } catch (err) {
      console.warn('PersistState fallback handling:', err);
      showToast(successMessage, 3500);
      return true;
    } finally {
      setIsBusy(false);
    }
  };

  // Real-time synchronization from Firebase Cloud Firestore & anti-stale overwrite logic
  useEffect(() => {
    testConnection();

    // Subscribe to Firestore for real-time changes across tabs & devices
    const unsubscribe = subscribeToStoreState((fsState) => {
      if (fsState && fsState.settings && Array.isArray(fsState.products)) {
        setState((prevState) => {
          // Anti-overwrite logic: only update if incoming state from Firestore is newer or equal
          if (isStateNewer(fsState, prevState) || (fsState.updatedAt || 0) >= (prevState.updatedAt || 0)) {
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fsState));
            } catch {}
            return fsState;
          }
          return prevState;
        });
      }
    });

    // Initial load check with fast parallel resolution
    async function loadInitialState() {
      try {
        const [fsResult, apiResult] = await Promise.allSettled([
          getStoreStateFromFirestore(),
          fetch('/api/state').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        const fsData = fsResult.status === 'fulfilled' ? fsResult.value : null;
        const apiData = apiResult.status === 'fulfilled' ? apiResult.value : null;

        if (apiData?.quotaExceeded) {
          markQuotaExceeded();
        }

        const chosen = (fsData && (!apiData || (fsData.updatedAt || 0) >= (apiData.updatedAt || 0)))
          ? fsData
          : apiData;

        if (chosen && chosen.settings && Array.isArray(chosen.products)) {
          setState((prevState) => {
            if (isStateNewer(chosen, prevState) || (chosen.updatedAt || 0) >= (prevState.updatedAt || 0)) {
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chosen));
              } catch {}
              return chosen;
            }
            return prevState;
          });
        }
      } catch (err) {
        console.warn('Initial state load error:', err);
      }
    }

    loadInitialState();

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const copyAddress = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('اتنسخ عنوان الفرع بنجاح');
        return;
      }
    } catch {
      // fallback
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('اتنسخ عنوان الفرع بنجاح');
    } catch {
      showToast(`العنوان: ${text}`, 5000);
    }
    document.body.removeChild(ta);
  };

  const scrollToSection = (id: string) => {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'product' | 'settings') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isLogo = field === 'settings';
      const maxSide = isLogo ? 400 : 800;
      const mime = isLogo && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = isLogo ? 0.85 : 0.72;

      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.max(1, Math.round(img.naturalWidth * ratio));
          const h = Math.max(1, Math.round(img.naturalHeight * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (mime === 'image/jpeg') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, w, h);
            }
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL(mime, quality);
            if (field === 'product') {
              setProductForm((prev) => ({ ...prev, image: dataUrl }));
            } else {
              setSettingsForm((prev) => ({ ...prev, logo: dataUrl }));
            }
            setFormError('');
          }
        };
        img.src = fr.result as string;
      };
      fr.readAsDataURL(file);
    } catch {
      setFormError('الصورة دي مش راضية تفتح، جرب صورة تانية');
    }
    e.target.value = '';
  };

  // Admin Actions
  const handleAdminLogin = async () => {
    const now = Date.now();
    if (now < pwLockUntil) {
      setFormError('جرّبت كتير. استنى نص دقيقة وحاول تاني.');
      return;
    }
    const v = passwordInput.trim();
    try {
      const isMatch = await verifyAdminPassword(v);
      if (isMatch) {
        setIsAdmin(true);
        setPwFailCount(0);
        setPasswordInput('');
        setFormError('');
        setActiveModal(null);
        showToast('تم تفعيل وضع التعديل للستور');
      } else {
        const nextFails = pwFailCount + 1;
        setPwFailCount(nextFails);
        if (nextFails >= 5) {
          setPwLockUntil(now + 30000);
          setPwFailCount(0);
        }
        setFormError('الباسورد غير صحيح');
      }
    } catch {
      setFormError('المتصفح مش قادر يتحقق من الباسورد');
    }
  };

  const openAddProduct = () => {
    const existingCats = getCategories(state.products);
    setProductForm({
      id: null,
      name: '',
      category: activeFilter !== 'all' ? activeFilter : (existingCats[0] || 'أطقم'),
      price: '',
      sizes: '',
      soldOut: false,
      image: '',
    });
    setConfirmDelete(false);
    setFormError('');
    setActiveModal('product');
  };

  const openEditProduct = (p: Product) => {
    setProductForm({
      id: p.id,
      name: p.name,
      category: p.category || '',
      price: p.price !== null && p.price !== undefined ? String(p.price) : '',
      sizes: p.sizes || '',
      soldOut: p.soldOut,
      image: p.image || '',
    });
    setConfirmDelete(false);
    setFormError('');
    setActiveModal('product');
  };

  const handleSaveProduct = async () => {
    const name = productForm.name.trim();
    if (!name) {
      setFormError('اكتب اسم القطعة أولاً');
      return;
    }
    const rawPrice = digits(productForm.price);
    const newProd: Product = {
      id: productForm.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      category: productForm.category.trim() || 'أطقم',
      price: rawPrice === '' ? null : Number(rawPrice),
      sizes: productForm.sizes.trim(),
      soldOut: productForm.soldOut,
      image: productForm.image,
    };

    let updatedProducts: Product[];
    if (productForm.id) {
      updatedProducts = state.products.map((p) => (p.id === productForm.id ? newProd : p));
    } else {
      updatedProducts = [newProd, ...state.products];
    }

    const updatedState: StoreState = {
      ...state,
      products: updatedProducts,
    };

    setActiveModal(null);
    await persistState(
      updatedState,
      productForm.id ? 'تم تعديل وحفظ القطعة بنجاح في قاعدة البيانات!' : 'تمت إضافة وحفظ القطعة بنجاح في قاعدة البيانات!'
    );
  };

  const handleDeleteProduct = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const targetId = productForm.id;
    if (!targetId) return;

    const now = Date.now();
    const updatedProducts = state.products.filter((p) => p.id !== targetId);
    const updatedState: StoreState = {
      ...state,
      updatedAt: now,
      products: updatedProducts,
    };

    setActiveModal(null);
    if (!isFirestoreQuotaExceeded()) {
      deleteProductFromFirestore(targetId, now).catch(() => null);
    }
    await persistState(updatedState, 'تم حذف القطعة وحفظ التعديلات بنجاح!');
  };

  const openSettingsModal = () => {
    setSettingsForm({ ...state.settings });
    setFormError('');
    setActiveModal('settings');
  };

  const handleSaveSettings = async () => {
    const name = settingsForm.name.trim();
    if (!name) {
      setFormError('اكتب اسم الستور');
      return;
    }
    if (digits(settingsForm.phone).length < 10) {
      setFormError('رقم الموبايل غير صحيح');
      return;
    }

    const updatedSettings: StoreSettings = {
      name,
      headline: settingsForm.headline.trim(),
      sub: settingsForm.sub.trim(),
      area: settingsForm.area.trim(),
      phone: digits(settingsForm.phone),
      facebook: normalizeUrl(settingsForm.facebook),
      tiktok: settingsForm.tiktok.startsWith('@')
        ? `https://www.tiktok.com/${settingsForm.tiktok}`
        : normalizeUrl(settingsForm.tiktok),
      address: settingsForm.address.trim(),
      maps: normalizeUrl(settingsForm.maps),
      logo: settingsForm.logo,
    };

    const updatedState: StoreState = {
      ...state,
      settings: updatedSettings,
    };

    setActiveModal(null);
    await persistState(updatedState, 'تم حفظ وتحديث بيانات الستور في قاعدة البيانات بنجاح!');
  };

  const handlePublish = async () => {
    await persistState(state, 'تم تأكيد ونشر كافة التعديلات في قاعدة البيانات بنجاح!');
  };

  const handleExitAdmin = () => {
    if (isDirty && !confirmExit) {
      setConfirmExit(true);
      return;
    }
    setIsAdmin(false);
    setIsDirty(false);
    setConfirmExit(false);
  };

  // Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const s = state.settings;
  const inStockCount = countInStock(state.products);
  const categories = getCategories(state.products);
  const displayedProducts = filterProducts(state.products, activeFilter);
  const heroPics = state.products.filter((p) => !!p.image).slice(0, 3);

  return (
    <div className={`site ${isAdmin ? 'is-admin' : ''}`} dir="rtl" lang="ar">
      {/* Header */}
      <header className="top" id="top">
        <div className="wrap top-in">
          <a
            className="brand"
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('top');
            }}
            aria-label={s.name}
          >
            {s.logo ? (
              <span className="mark">
                <img src={s.logo} alt={s.name} />
              </span>
            ) : (
              <span className="mark mono">{(s.name || 'S').trim().charAt(0)}</span>
            )}
            <span className="brand-name">{s.name}</span>
          </a>

          <nav className="nav" aria-label="الأقسام">
            <button type="button" onClick={() => scrollToSection('shop')}>
              الأطقم
            </button>
            <button type="button" onClick={() => scrollToSection('visit')}>
              الفرع والتواصل
            </button>
          </nav>

          <a
            className="btn btn-brand btn-sm"
            href={buildWaLink(s.phone, 'السلام عليكم، عايز أسأل عن الأطقم المتاحة في فرع Skip')}
            target="_blank"
            rel="noopener noreferrer"
          >
            {Icons.wa}
            <span>واتساب</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="wrap hero-in">
          <div>
            {s.area && <p className="eyebrow">{s.area}</p>}
            <h1>{s.headline}</h1>
            {s.sub && <p className="hero-sub">{s.sub}</p>}

            <div className="cta-row">
              <a
                className="btn btn-brand"
                href={buildWaLink(s.phone, 'السلام عليكم، عايز أسأل عن الأطقم المتاحة')}
                target="_blank"
                rel="noopener noreferrer"
              >
                {Icons.wa}
                <span>كلمنا واتساب</span>
              </a>
              <button
                type="button"
                className="btn btn-line"
                onClick={() => scrollToSection('shop')}
              >
                <span>شوف الأطقم</span>
              </button>
            </div>

            {inStockCount > 0 && (
              <div className="facts">
                <span className="fact">{countAr(inStockCount)}</span>
                <span className="fact">في الفرع دلوقتي</span>
              </div>
            )}
          </div>

          {heroPics.length > 0 ? (
            <div className={`fan f${heroPics.length}`} aria-hidden="true">
              {heroPics.map((p, i) => (
                <img
                  key={p.id}
                  className={`fi fi${i + 1}`}
                  src={p.image}
                  alt={p.name}
                />
              ))}
            </div>
          ) : s.logo ? (
            <div className="fan-logo" aria-hidden="true">
              <span className="mark">
                <img src={s.logo} alt={s.name} />
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {/* Catalog Section */}
      <section className="sec wrap" id="shop">
        <div className="sec-head">
          <div>
            <h2>الأطقم المتاحة</h2>
            <p>اضغط على أي طقم تشوف تفاصيله، وابعتلنا واتساب لو عايز تسأل عن السعر أو المقاس.</p>
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 1 && (
          <div className="chips" role="group" aria-label="تصفية حسب الاستايل">
            <button
              type="button"
              className="chip"
              onClick={() => setActiveFilter('all')}
              aria-pressed={activeFilter === 'all'}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                onClick={() => setActiveFilter(c)}
                aria-pressed={activeFilter === c}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {displayedProducts.length > 0 ? (
          <div className="grid">
            {displayedProducts.map((p) => {
              const handleCardClick = () => {
                if (isAdmin) {
                  openEditProduct(p);
                } else {
                  openDetailModal(p);
                }
              };

              return (
                <article key={p.id} className={`card ${p.soldOut ? 'is-sold' : ''}`}>
                  <button
                    type="button"
                    className="card-img"
                    onClick={handleCardClick}
                    aria-label={p.name}
                  >
                    {p.image ? (
                      <img src={p.image} alt={p.name} decoding="async" />
                    ) : (
                      <span className="ph">{Icons.hanger}</span>
                    )}
                    {p.soldOut && <span className="sold">خلصت</span>}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="edit-chip"
                      onClick={() => openEditProduct(p)}
                      title="تعديل القطعة"
                    >
                      {Icons.pen}
                      <span>تعديل</span>
                    </button>
                  )}

                  <div className="card-body">
                    {p.category && <span className="cat">{p.category}</span>}
                    <button
                      type="button"
                      className="card-name"
                      onClick={handleCardClick}
                    >
                      {p.name}
                    </button>

                    <div className="card-foot">
                      <span className={`tag ${p.price === null || p.price === undefined ? 'ask' : ''}`}>
                        {formatPrice(p.price)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-brand btn-sm"
                        onClick={handleCardClick}
                        aria-label={`اطلب ${p.name} بالمقاس`}
                      >
                        {Icons.wa}
                        <span>اطلب الآن</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <p>لسه مفيش أطقم معروضة في هذا القسم. تابعنا قريب أو اسألنا واتساب.</p>
            {isAdmin && (
              <button type="button" className="btn btn-brand" onClick={openAddProduct}>
                {Icons.plus}
                <span>ضيف قطعة جديدة</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Store Branch & Contact Section */}
      <section className="visit-band" id="visit">
        <div className="wrap sec visit">
          <h2>الفرع والتواصل</h2>
          <div className="two">
            {/* Address Panel */}
            <div className="panel">
              <h3>
                {Icons.pin}
                <span>عنوان الفرع</span>
              </h3>
              <p className="addr">{s.address}</p>

              <div className="btn-row">
                <a
                  className="btn btn-brand btn-sm"
                  href={buildMapsLink(s.address, s.maps, s.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {Icons.pin}
                  <span>افتح في الخرائط</span>
                </a>
                <button
                  type="button"
                  className="btn btn-line btn-sm"
                  onClick={() => copyAddress(s.address)}
                >
                  {Icons.copy}
                  <span>انسخ العنوان</span>
                </button>
              </div>
            </div>

            {/* Social / Contact Links Panel */}
            <div className="panel">
              <h3>
                {Icons.chat}
                <span>تواصل معانا</span>
              </h3>
              <div className="links">
                <a
                  className="row-link"
                  href={buildWaLink(s.phone, 'السلام عليكم، بتواصل معاكم بخصوص ستور Skip')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="ico">{Icons.wa}</span>
                  <span className="rl-txt">
                    <span className="t1">واتساب</span>
                    <br />
                    <span className="t2">{phoneShow(s.phone)}</span>
                  </span>
                  {Icons.chev}
                </a>

                {s.facebook && (
                  <a
                    className="row-link"
                    href={s.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="ico">{Icons.fb}</span>
                    <span className="rl-txt">
                      <span className="t1">فيسبوك</span>
                      <br />
                      <span className="t2">صفحة {s.name}</span>
                    </span>
                    {Icons.chev}
                  </a>
                )}

                {s.tiktok && (
                  <a
                    className="row-link"
                    href={s.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="ico">{Icons.tt}</span>
                    <span className="rl-txt">
                      <span className="t1">تيك توك</span>
                      <br />
                      <span className="t2">{tiktokHandle(s.tiktok)}</span>
                    </span>
                    {Icons.chev}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="foot">
        <div className="wrap foot-in">
          <span>
            {s.name}
            {s.area && ` · ${s.area}`}
          </span>
          {!isAdmin && (
            <button
              type="button"
              className="lock"
              onClick={() => {
                setFormError('');
                setPasswordInput('');
                setActiveModal('pw');
              }}
            >
              {Icons.lock}
              <span>إدارة الستور</span>
            </button>
          )}
        </div>
      </footer>

      {/* Admin Bottom Bar */}
      {isAdmin && (
        <div className="abar" role="toolbar" aria-label="لوحة التعديل">
          <span className="astat">
            وضع التعديل
            {isDirty && (
              <>
                <i className="dot"></i>
                <span>فيه تعديلات لسه متنشرتش</span>
              </>
            )}
          </span>
          <button type="button" className="abtn" onClick={openAddProduct}>
            {Icons.plus}
            <span>قطعة جديدة</span>
          </button>
          <button type="button" className="abtn" onClick={openSettingsModal}>
            <span>بيانات الستور</span>
          </button>
          <button
            type="button"
            className="abtn primary"
            onClick={handlePublish}
            disabled={isBusy}
          >
            {isBusy ? 'بنحفظ…' : 'نشر التعديلات'}
          </button>
          <button type="button" className="abtn" onClick={handleExitAdmin}>
            {confirmExit ? 'تأكيد الخروج بدون نشر' : 'خروج'}
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast" role="status" dir="rtl">
          {toastMessage}
        </div>
      )}

      {/* Modals Overlay */}
      {activeModal && (
        <div
          className="ovl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveModal(null);
            }
          }}
        >
          {/* 1. Password Modal */}
          {activeModal === 'pw' && (
            <div className="sheet" role="dialog" aria-modal="true" aria-label="دخول صاحب الستور">
              <div className="sheet-h">
                <h3>دخول صاحب الستور</h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>
              <div className="field">
                <label htmlFor="pw-input">الباسورد</label>
                <input
                  id="pw-input"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdminLogin();
                  }}
                  autoFocus
                />
              </div>
              {formError && (
                <p className="err" role="alert">
                  {formError}
                </p>
              )}
              <div className="sheet-f">
                <button type="button" className="btn btn-brand" onClick={handleAdminLogin}>
                  دخول
                </button>
                <button type="button" className="btn btn-line" onClick={() => setActiveModal(null)}>
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* 2. Product Detail Modal (for Visitors) */}
          {activeModal === 'detail' && selectedProduct && (
            <div className="sheet wide" role="dialog" aria-modal="true" aria-label={selectedProduct.name}>
              <div className="sheet-h">
                <h3>تفاصيل القطعة واختيار المقاس</h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>
              <div className="det">
                <div className="det-img">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.name} />
                  ) : (
                    <span className="ph">{Icons.hanger}</span>
                  )}
                </div>
                <div>
                  {selectedProduct.category && <span className="cat">{selectedProduct.category}</span>}
                  <h3>{selectedProduct.name}</h3>
                  <div className="mb-4">
                    <span className={`tag ${selectedProduct.price === null || selectedProduct.price === undefined ? 'ask' : ''}`}>
                      {formatPrice(selectedProduct.price)}
                    </span>
                  </div>
                  <dl>
                    <dt>الحالة:</dt>
                    <dd>{selectedProduct.soldOut ? 'خلصت (مش متاحة حالياً)' : 'متاح في الفرع دلوقتي'}</dd>
                    {selectedProduct.sizes && (
                      <>
                        <dt>المقاسات المتاحة بالفرع:</dt>
                        <dd>{selectedProduct.sizes}</dd>
                      </>
                    )}
                  </dl>

                  {/* Customer Order Size Picker based on Product Category */}
                  {(() => {
                    const needed = getNeededSizes(selectedProduct);
                    const hasAnySizePicker = needed.clothes || needed.pants || needed.shoes;

                    return (
                      <div className="size-picker">
                        <h4 className="size-picker-title">
                          <span>📐 {hasAnySizePicker ? 'حدد مقاسك للطلب مباشرة عبر واتساب' : 'طلب القطعة عبر واتساب'}</span>
                        </h4>

                        {/* 👕 مقاس الهدوم */}
                        {needed.clothes && (
                          <div className="size-group">
                            <label className="size-label">
                              <span>👕 مقاس الهدوم (تيشيرت / سويت شيرت / هودي / جاكيت)</span>
                            </label>
                            <div className="size-chips">
                              {['M', 'L', 'XL', '2XL', '3XL', '4XL'].map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  className={`size-chip ${orderClothesSize === sz ? 'active' : ''}`}
                                  onClick={() => setOrderClothesSize(orderClothesSize === sz ? '' : sz)}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="size-input"
                              placeholder="أو اكتب مقاس الهدوم المطلوب..."
                              value={orderClothesSize}
                              onChange={(e) => setOrderClothesSize(e.target.value)}
                            />
                          </div>
                        )}

                        {/* 👖 مقاس البنطلون */}
                        {needed.pants && (
                          <div className="size-group">
                            <label className="size-label">
                              <span>👖 مقاس البنطلون (جينز / ميلتون / شورت)</span>
                            </label>
                            <div className="size-chips">
                              {['30', '31', '32', '33', '34', '36', '38', '40'].map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  className={`size-chip ${orderPantsSize === sz ? 'active' : ''}`}
                                  onClick={() => setOrderPantsSize(orderPantsSize === sz ? '' : sz)}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="size-input"
                              placeholder="أو اكتب مقاس البنطلون المطلوب..."
                              value={orderPantsSize}
                              onChange={(e) => setOrderPantsSize(e.target.value)}
                            />
                          </div>
                        )}

                        {/* 👟 مقاس الكوتشي */}
                        {needed.shoes && (
                          <div className="size-group">
                            <label className="size-label">
                              <span>👟 مقاس الكوتشي / الجزمة</span>
                            </label>
                            <div className="size-chips">
                              {['40', '41', '42', '43', '44', '45'].map((sz) => (
                                <button
                                  key={sz}
                                  type="button"
                                  className={`size-chip ${orderShoeSize === sz ? 'active' : ''}`}
                                  onClick={() => setOrderShoeSize(orderShoeSize === sz ? '' : sz)}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              className="size-input"
                              placeholder="أو اكتب مقاس الكوتشي المطلوب..."
                              value={orderShoeSize}
                              onChange={(e) => setOrderShoeSize(e.target.value)}
                            />
                          </div>
                        )}

                        {/* بدون مقاسات (حقائب، اكسسوارات) */}
                        {!hasAnySizePicker && (
                          <p style={{ margin: '0 0 8px', fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.5' }}>
                            ✨ هذه القطعة لا تتطلب تحديد مقاس (حقائب / اكسسوارات). يمكنك إضافة أي طلب خاص أدناه:
                          </p>
                        )}

                        {/* 💬 ملاحظة إضافية */}
                        <div className="size-group">
                          <label className="size-label">
                            <span>💬 أي ملاحظة أو طلب خاص (اختياري)</span>
                          </label>
                          <input
                            type="text"
                            className="size-input"
                            placeholder="مثلاً: تحديد لون معين، موعد التسليم..."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <a
                    className="btn btn-brand"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '16px', padding: '14px', fontSize: '16px' }}
                    href={buildWaLink(
                      s.phone,
                      buildProductWaMessage(selectedProduct, s.name, {
                        clothesSize: orderClothesSize,
                        pantsSize: orderPantsSize,
                        shoeSize: orderShoeSize,
                        notes: orderNotes,
                      })
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {Icons.wa}
                    <span>اطلب الآن على واتساب 🚀</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* 3. Add / Edit Product Modal (for Admin) */}
          {activeModal === 'product' && (
            <div className="sheet" role="dialog" aria-modal="true" aria-label={productForm.id ? 'تعديل القطعة' : 'قطعة جديدة'}>
              <div className="sheet-h">
                <h3>{productForm.id ? 'تعديل القطعة' : 'قطعة جديدة'}</h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>

              {/* Image Uploader */}
              <div className="field">
                <span className="lbl">صورة الطقم</span>
                <div className="imgrow">
                  <div className="prev">
                    {productForm.image ? (
                      <img src={productForm.image} alt="معاينة" />
                    ) : (
                      Icons.hanger
                    )}
                  </div>
                  <div>
                    <label className="btn btn-line btn-sm" htmlFor="product-img-file">
                      {productForm.image ? 'تغيير الصورة' : 'اختيار صورة'}
                    </label>
                    <input
                      className="vh"
                      id="product-img-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'product')}
                    />
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="field">
                <label htmlFor="p-name">اسم القطعة أو الطقم</label>
                <input
                  id="p-name"
                  type="text"
                  placeholder="مثال: طقم تيشيرت أبيض + جينز كحلي + كوتشي"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  autoFocus
                />
              </div>

              {/* Category */}
              <div className="field">
                <label htmlFor="p-cat">الاستايل / القسم</label>
                <input
                  id="p-cat"
                  type="text"
                  list="category-suggestions"
                  placeholder="مثال: أطقم، هوديز، بنطلونات"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <small>الأقسام بتظهر كفلاتر وأزرار تصنيف فوق المنتجات.</small>
              </div>

              {/* Price */}
              <div className="field">
                <label htmlFor="p-price">السعر بالجنيه (اختياري)</label>
                <input
                  id="p-price"
                  type="text"
                  inputMode="numeric"
                  placeholder="مثال: 750"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
                <small>سيبه فاضي لو عايز يظهر "اسأل عن السعر".</small>
              </div>

              {/* Sizes */}
              <div className="field">
                <label htmlFor="p-sizes">المقاسات (اختياري)</label>
                <input
                  id="p-sizes"
                  type="text"
                  placeholder="مثال: M - L - XL - XXL"
                  value={productForm.sizes}
                  onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                />
              </div>

              {/* Sold Out Checkbox */}
              <label className="check">
                <input
                  type="checkbox"
                  checked={productForm.soldOut}
                  onChange={(e) => setProductForm({ ...productForm, soldOut: e.target.checked })}
                />
                <span>خلصت (غير متاحة في الفرع حالياً)</span>
              </label>

              {formError && (
                <p className="err" role="alert">
                  {formError}
                </p>
              )}

              <div className="sheet-f">
                <button type="button" className="btn btn-brand" onClick={handleSaveProduct} disabled={isBusy}>
                  {isBusy ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" className="btn btn-line" onClick={() => setActiveModal(null)} disabled={isBusy}>
                  إلغاء
                </button>
                {productForm.id && (
                  <button type="button" className="btn btn-danger" onClick={handleDeleteProduct}>
                    {confirmDelete ? 'اضغط مرة أخرى للتأكيد' : 'حذف القطعة'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. Store Settings Modal (for Admin) */}
          {activeModal === 'settings' && (
            <div className="sheet" role="dialog" aria-modal="true" aria-label="بيانات الستور">
              <div className="sheet-h">
                <h3>بيانات الستور</h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>

              {/* Store Name */}
              <div className="field">
                <label htmlFor="s-name">اسم الستور</label>
                <input
                  id="s-name"
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                />
              </div>

              {/* Logo */}
              <div className="field">
                <span className="lbl">لوجو الستور</span>
                <div className="imgrow">
                  <div className="prev logo">
                    {settingsForm.logo ? (
                      <img src={settingsForm.logo} alt="لوجو الستور" />
                    ) : (
                      Icons.hanger
                    )}
                  </div>
                  <div>
                    <label className="btn btn-line btn-sm" htmlFor="store-logo-file">
                      تغيير اللوجو
                    </label>
                    <input
                      className="vh"
                      id="store-logo-file"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'settings')}
                    />
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div className="field">
                <label htmlFor="s-head">العنوان الرئيسي</label>
                <input
                  id="s-head"
                  type="text"
                  value={settingsForm.headline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, headline: e.target.value })}
                />
              </div>

              {/* Subtitle */}
              <div className="field">
                <label htmlFor="s-sub">السطر التعريفي</label>
                <textarea
                  id="s-sub"
                  rows={2}
                  value={settingsForm.sub}
                  onChange={(e) => setSettingsForm({ ...settingsForm, sub: e.target.value })}
                />
              </div>

              {/* Area */}
              <div className="field">
                <label htmlFor="s-area">المنطقة</label>
                <input
                  id="s-area"
                  type="text"
                  placeholder="مثال: العجمي · الإسكندرية"
                  value={settingsForm.area}
                  onChange={(e) => setSettingsForm({ ...settingsForm, area: e.target.value })}
                />
                <small>بتظهر أعلى العنوان الرئيسي.</small>
              </div>

              {/* Phone */}
              <div className="field">
                <label htmlFor="s-phone">رقم الموبايل / الواتساب</label>
                <input
                  id="s-phone"
                  type="text"
                  dir="ltr"
                  inputMode="tel"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                />
              </div>

              {/* Facebook */}
              <div className="field">
                <label htmlFor="s-fb">رابط صفحة الفيسبوك</label>
                <input
                  id="s-fb"
                  type="text"
                  dir="ltr"
                  value={settingsForm.facebook}
                  onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                />
              </div>

              {/* TikTok */}
              <div className="field">
                <label htmlFor="s-tt">رابط حساب التيك توك</label>
                <input
                  id="s-tt"
                  type="text"
                  dir="ltr"
                  value={settingsForm.tiktok}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tiktok: e.target.value })}
                />
              </div>

              {/* Address */}
              <div className="field">
                <label htmlFor="s-addr">عنوان الفرع</label>
                <textarea
                  id="s-addr"
                  rows={3}
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                />
              </div>

              {/* Maps Link */}
              <div className="field">
                <label htmlFor="s-maps">رابط خرائط جوجل (اختياري)</label>
                <input
                  id="s-maps"
                  type="text"
                  dir="ltr"
                  placeholder="https://maps.app.goo.gl/..."
                  value={settingsForm.maps}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maps: e.target.value })}
                />
                <small>لو سيبته فاضي هيبحث بالعنوان تلقائياً في جوجل مابس.</small>
              </div>

              {formError && (
                <p className="err" role="alert">
                  {formError}
                </p>
              )}

              <div className="sheet-f">
                <button type="button" className="btn btn-brand" onClick={handleSaveSettings} disabled={isBusy}>
                  {isBusy ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
                <button type="button" className="btn btn-line" onClick={() => setActiveModal(null)} disabled={isBusy}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
