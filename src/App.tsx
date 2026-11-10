import React, { useState, useEffect, useRef } from 'react';
import defaultState from './data/defaultState.json';
import {
  StoreState,
  StoreSettings,
  Product,
  CartItem,
  CustomerOrder,
  ActivityItem,
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
  isStateNewer,
  formatArabicTime,
} from './utils/store';
import {
  saveStoreStateToFirestore,
  loginAdmin,
  logoutAdmin,
  observeAuth,
  ADMIN_EMAIL,
  getStoreStateFromFirestore,
  subscribeToStoreState,
  testConnection,
  recordActivity,
  subscribeToActivity,
  saveOrderToFirestore,
  subscribeToOrders,
  updateOrderStatusInFirestore,
  deleteOrderFromFirestore,
} from './utils/firebase';

// SVG Icons
const Icons = {
  wa: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 1 1 13 0c0 5.3-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  cart: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  ),
};

const CART_STORAGE_KEY = 'skip_store_cart_v1';
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
    } catch {}
    return defaultState as StoreState;
  });

  const [activeFilter, setActiveFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isStoreLoaded, setIsStoreLoaded] = useState(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'pw' | 'detail' | 'product' | 'settings' | 'cart' | 'orders' | 'activity' | null
  >(null);

  // Customer Shopping Bag / Cart
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Admin Data: Orders & Activity Logs
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityItem[]>([]);

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
  const [adminEmail, setAdminEmail] = useState('');
  const [formError, setFormError] = useState('');

  // Customer order size selection
  const [orderClothesSize, setOrderClothesSize] = useState('');
  const [orderPantsSize, setOrderPantsSize] = useState('');
  const [orderShoeSize, setOrderShoeSize] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Cart checkout form
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  const showToast = (msg: string, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const openDetailModal = (p: Product) => {
    setSelectedProduct(p);
    setOrderClothesSize('');
    setOrderPantsSize('');
    setOrderShoeSize('');
    setOrderNotes('');
    setActiveModal('detail');
  };

  const persistState = async (newState: StoreState, successMessage: string) => {
    setIsBusy(true);
    const now = Date.now();
    const stampedState: StoreState = {
      ...newState,
      updatedAt: Math.max(newState.updatedAt || 0, now),
    };

    // 1. Optimistic UI and local storage update immediately
    setState(stampedState);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stampedState));
    } catch {}
    setIsDirty(false);
    setConfirmExit(false);

    try {
      // 2. Cloud Firestore sync
      const saved = await saveStoreStateToFirestore(stampedState);
      if (saved) {
        showToast(successMessage, 3500);
      } else {
        showToast('تم حفظ التعديلات أونلاين بنجاح!', 3500);
      }
      return true;
    } catch (err) {
      console.warn('Firestore sync note:', err);
      showToast(successMessage, 3500);
      return true;
    } finally {
      setIsBusy(false);
    }
  };

  // Real-time synchronization: Firestore Live Subscriptions + 5-second Polling Backup
  useEffect(() => {
    testConnection();

    // 1. Subscribe to Firestore store state in real-time
    const unsubStore = subscribeToStoreState((fsState) => {
      if (fsState && fsState.settings && Array.isArray(fsState.products)) {
        setIsOnline(true);
        setIsStoreLoaded(true);
        setState((prevState) => {
          if (isStateNewer(fsState, prevState) || (fsState.updatedAt || 0) >= (prevState.updatedAt || 0)) {
            try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fsState)); } catch {}
            return fsState;
          }
          return prevState;
        });
      }
    }, () => {
      setIsOnline(false);
    });

    // Initial fetch from Firestore only
    async function loadInitial() {
      try {
        const chosen = await getStoreStateFromFirestore();

        if (chosen && chosen.settings && Array.isArray(chosen.products)) {
          setIsOnline(true);
          setIsStoreLoaded(true);
          setState((prevState) => {
            if (isStateNewer(chosen, prevState) || (chosen.updatedAt || 0) >= (prevState.updatedAt || 0)) {
              try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chosen)); } catch {}
              return chosen;
            }
            return prevState;
          });
        } else {
          setIsOnline(false);
        }
      } catch (err) {
        setIsOnline(false);
        console.warn('Initial load error:', err);
      }
    }

    loadInitial();

    return () => {
      if (typeof unsubStore === 'function') unsubStore();
    };
  }, []);

  // Customer Shopping Bag Actions
  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    const needed = getNeededSizes(selectedProduct);
    const sizeDetails: string[] = [];
    if (needed.clothes && orderClothesSize) sizeDetails.push(`مقاس الهدوم: ${orderClothesSize}`);
    if (needed.pants && orderPantsSize) sizeDetails.push(`مقاس البنطلون: ${orderPantsSize}`);
    if (needed.shoes && orderShoeSize) sizeDetails.push(`مقاس الكوتشي: ${orderShoeSize}`);
    if (orderNotes) sizeDetails.push(`ملاحظة: ${orderNotes}`);

    const sizeSummary = sizeDetails.length > 0 ? sizeDetails.join(' | ') : 'بدون مقاس';

    const newItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: selectedProduct.id,
      name: selectedProduct.name,
      category: selectedProduct.category || '',
      price: selectedProduct.price,
      image: selectedProduct.image || '',
      ...(orderClothesSize ? { clothesSize: orderClothesSize } : {}),
      ...(orderPantsSize ? { pantsSize: orderPantsSize } : {}),
      ...(orderShoeSize ? { shoeSize: orderShoeSize } : {}),
      ...(orderNotes ? { notes: orderNotes } : {}),
      quantity: 1,
      addedAt: Date.now(),
    };

    setCartItems((prev) => [newItem, ...prev]);

    // Record activity online in Firestore & Server: What customer added!
    const activityItem: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'cart_add',
      title: 'العميل أضاف طقم إلى السلة',
      details: `أضاف العميل "${selectedProduct.name}" (${sizeSummary})`,
      actor: 'عميل بالموقع',
      timestamp: Date.now(),
    };
    recordActivity(activityItem).catch(() => {});

    setActiveModal(null);
    showToast('🛒 تم إضافة الطقم بنجاح إلى حقيبة طلباتك!');
  };

  const handleRemoveFromCart = (item: CartItem) => {
    setCartItems((prev) => prev.filter((i) => i.id !== item.id));

    // Record activity online in Firestore & Server: What customer deleted!
    const activityItem: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'cart_remove',
      title: 'العميل حذف طقم من السلة',
      details: `حذف العميل "${item.name}" من حقيبة الطلبات`,
      actor: 'عميل بالموقع',
      timestamp: Date.now(),
    };
    recordActivity(activityItem).catch(() => {});

    showToast(`تم حذف ${item.name} من السلة`);
  };

  const totalCartPrice = cartItems.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);

  const handleSubmitCartOrder = (isWa = false) => {
    const name = checkoutName.trim();
    const phone = checkoutPhone.trim();

    if (!name) {
      setFormError('من فضلك اكتب اسمك لتأكيد الطلب');
      return;
    }
    if (digits(phone).length < 10) {
      setFormError('من فضلك اكتب رقم موبايل صحيح للتواصل معك');
      return;
    }

    setFormError('');

    const newOrder: CustomerOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customerName: name,
      customerPhone: digits(phone),
      customerAddress: checkoutAddress.trim(),
      items: cartItems,
      totalPrice: totalCartPrice,
      notes: checkoutNotes.trim(),
      status: 'new',
      createdAt: Date.now(),
    };

    // Save order to Firestore & Server asynchronously in the background without blocking the UI or popup launch
    saveOrderToFirestore(newOrder).catch((err) => {
      console.warn('Background order save note:', err);
    });

    // Record activity asynchronously
    const activityItem: ActivityItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'order_submit',
      title: 'طلب جديد مؤكد من العميل',
      details: `طلب من: ${name} (هاتف: ${phone}) - ${cartItems.length} أطقم - الإجمالي: ${totalCartPrice} ج.م`,
      actor: name,
      timestamp: Date.now(),
    };
    recordActivity(activityItem).catch(() => {});

    // Prepare WhatsApp message URL before closing state if requested
    let waUrl: string | null = null;
    if (isWa) {
      const itemsList = cartItems
        .map((it, idx) => {
          const sizes = [
            it.clothesSize ? `مقاس الهدوم: ${it.clothesSize}` : null,
            it.pantsSize ? `مقاس البنطلون: ${it.pantsSize}` : null,
            it.shoeSize ? `مقاس الكوتشي: ${it.shoeSize}` : null,
            it.notes ? `ملاحظات: ${it.notes}` : null,
          ].filter(Boolean).join(' | ');
          return `${idx + 1}. *${it.name}* (${it.price ? formatPrice(it.price) : 'اسأل عن السعر'})\n   📐 ${sizes || 'بدون مقاس'}`;
        })
        .join('\n\n');

      const waText = [
        `السلام عليكم، عايز أأكد طلب جديد من ${state.settings.name}:`,
        `👤 *اسم العميل:* ${name}`,
        `📱 *رقم الموبايل:* ${phone}`,
        checkoutAddress.trim() ? `📍 *عنوان التوصيل:* ${checkoutAddress.trim()}` : null,
        checkoutNotes.trim() ? `💬 *ملاحظات:* ${checkoutNotes.trim()}` : null,
        `\n🛍️ *تفاصيل الأطقم المطلوبة:*`,
        itemsList,
        `\n💰 *إجمالي الطلب:* ${formatPrice(totalCartPrice)}`,
        `✨ هل متاح التوصيل والاستلام؟`,
      ].filter(Boolean).join('\n');

      waUrl = buildWaLink(state.settings.phone, waText);
    }

    // Reset UI, clear cart and close modal instantly (< 10ms)
    setCartItems([]);
    setIsBusy(false);
    setActiveModal(null);
    setCheckoutName('');
    setCheckoutPhone('');
    setCheckoutAddress('');
    setCheckoutNotes('');

    showToast('🎉 تم إرسال وتأكيد طلبك بنجاح! وسنتواصل معك فوراً.');

    // Launch WhatsApp immediately or fallback to location redirect if popup blocked
    if (waUrl) {
      try {
        const win = window.open(waUrl, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = waUrl;
        }
      } catch {
        window.location.href = waUrl;
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: CustomerOrder['status']) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    await updateOrderStatusInFirestore(orderId, status);
    showToast('تم تحديث حالة الطلب بنجاح');
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await deleteOrderFromFirestore(orderId);
    showToast('تم حذف الطلب');
  };

  const handleClearActivity = async () => {
    setActivityLogs([]);
    fetch('/api/activity/clear', { method: 'POST' }).catch(() => {});
    showToast('تم مسح سجل النشاط');
  };

  const copyAddress = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('اتنسخ عنوان الفرع بنجاح');
        return;
      }
    } catch {}
    showToast(`العنوان: ${text}`, 4000);
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
    if (!passwordInput) {
      setFormError('اكتب كلمة المرور');
      return;
    }
    try {
      if (adminEmail.trim()) {
        await loginAdmin(adminEmail, passwordInput);
      } else {
        await loginAdmin(passwordInput);
      }
      setIsAdmin(true);
      setPasswordInput('');
      setFormError('');
      setActiveModal(null);
      showToast('تم تسجيل الدخول بحساب مالك المتجر');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر تسجيل الدخول. راجع كلمة المرور.');
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

    // Record activity in Firestore
    recordActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: productForm.id ? 'product_edit' : 'product_add',
      title: productForm.id ? 'تعديل قطعة بالمتجر' : 'إضافة قطعة جديدة بالمتجر',
      details: `${productForm.id ? 'تم تعديل' : 'تم إضافة'}: "${newProd.name}" (${newProd.category})`,
      actor: 'المشرف (صاحب المتجر)',
      timestamp: Date.now(),
    }).catch(() => {});

    setActiveModal(null);
    await persistState(
      updatedState,
      productForm.id ? 'تم حفظ وتعديل القطعة أونلاين بنجاح!' : 'تمت إضافة القطعة أونلاين بنجاح!'
    );
  };

  const handleDeleteProduct = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const targetId = productForm.id;
    if (!targetId) return;

    const targetProd = state.products.find((p) => p.id === targetId);
    const now = Date.now();
    const updatedProducts = state.products.filter((p) => p.id !== targetId);
    const updatedState: StoreState = {
      ...state,
      updatedAt: now,
      products: updatedProducts,
    };

    // Record activity in Firestore
    recordActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'product_delete',
      title: 'حذف قطعة من المتجر',
      details: `تم حذف: "${targetProd?.name || targetId}" من المتجر`,
      actor: 'المشرف (صاحب المتجر)',
      timestamp: Date.now(),
    }).catch(() => {});

    setActiveModal(null);
    await persistState(updatedState, 'تم حذف القطعة أونلاين بنجاح!');
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

    recordActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'settings_update',
      title: 'تحديث بيانات الستور',
      details: `تم تحديث بيانات وعنوان الستور بواسطة المشرف`,
      actor: 'المشرف',
      timestamp: Date.now(),
    }).catch(() => {});

    setActiveModal(null);
    await persistState(updatedState, 'تم حفظ وتحديث بيانات الستور أونلاين بنجاح!');
  };

  const handlePublish = async () => {
    await persistState(state, 'تم تأكيد ونشر كافة التعديلات في قاعدة البيانات السحابية بنجاح!');
  };

  const handleExitAdmin = () => {
    if (isDirty && !confirmExit) {
      setConfirmExit(true);
      return;
    }
    logoutAdmin().catch(() => {});
    setIsAdmin(false);
    setIsDirty(false);
    setConfirmExit(false);
  };

  // Private customer orders and activity are subscribed to only after owner authentication.
  useEffect(() => {
    if (!isAdmin) {
      setOrders([]);
      setActivityLogs([]);
      return;
    }
    const unsubOrders = subscribeToOrders((items) => setOrders(items));
    const unsubActivity = subscribeToActivity((items) => setActivityLogs(items));
    return () => {
      if (typeof unsubOrders === 'function') unsubOrders();
      if (typeof unsubActivity === 'function') unsubActivity();
    };
  }, [isAdmin]);

  useEffect(() => observeAuth((user) => {
    setIsAdmin(!!user && (user.email || '').toLowerCase() === ADMIN_EMAIL);
  }), []);

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
  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Customer Order Bag Button */}
            <button
              type="button"
              className="cart-btn-header"
              onClick={() => {
                setFormError('');
                setActiveModal('cart');
              }}
              aria-label="حقيبة الطلبات"
            >
              {Icons.cart}
              <span>حقيبة الطلبات</span>
              {cartItems.length > 0 && <span className="cart-badge">{cartItems.length}</span>}
            </button>

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
            <p>اضغط على أي طقم لتحديد مقاسك وإضافته لحقيبة الطلبات أو طلبه فوراً عبر واتساب.</p>
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
                        aria-label={`اختيار المقاس والطلب`}
                      >
                        {Icons.cart}
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

      {/* Floating Cart Button on Mobile if items exist */}
      {cartItems.length > 0 && !activeModal && (
        <div className="floating-cart-bar">
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>
              <span>حقيبة الطلبات: {cartItems.length} أطقم</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--brand-deep)', fontWeight: 600 }}>
              <span>الإجمالي: {formatPrice(totalCartPrice)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-brand btn-sm"
            onClick={() => setActiveModal('cart')}
          >
            {Icons.cart}
            <span>عرض السلة وإتمام الطلب</span>
          </button>
        </div>
      )}

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
                setAdminEmail('');
                setActiveModal('pw');
              }}
            >
              {Icons.lock}
              <span>إدارة الستور والطلبات</span>
            </button>
          )}
        </div>
      </footer>

      {/* Admin Bottom Toolbar */}
      {isAdmin && (
        <div className="abar" role="toolbar" aria-label="لوحة التعديل والنشاط المباشر">
          <span className="astat">
            <span className="online-dot" style={{ display: 'inline-block', marginRight: '4px' }}></span>
            مباشر أونلاين
            {isDirty && (
              <>
                <i className="dot"></i>
                <span>تعديلات غير منشورة</span>
              </>
            )}
          </span>

          {/* Admin: View Customer Activity Live Feed */}
          <button
            type="button"
            className="abtn"
            onClick={() => setActiveModal('activity')}
            title="رؤية ما أضافه وما حذفه العميل في الموقع مباشرة"
          >
            {Icons.bell}
            <span>سجل نشاط العملاء</span>
            {activityLogs.length > 0 && (
              <span className="cart-badge" style={{ backgroundColor: '#EF4444' }}>
                {activityLogs.length}
              </span>
            )}
          </button>

          {/* Admin: View Orders */}
          <button
            type="button"
            className="abtn"
            onClick={() => setActiveModal('orders')}
            title="طلبات العملاء الواردة"
          >
            {Icons.cart}
            <span>طلبات العملاء</span>
            {newOrdersCount > 0 && (
              <span className="cart-badge" style={{ backgroundColor: '#10B981' }}>
                {newOrdersCount}
              </span>
            )}
          </button>

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
            {confirmExit ? 'تأكيد الخروج' : 'خروج'}
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
                <h3>دخول لوحة إدارة الستور ومتابعة العملاء</h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--muted)' }}>
                سجّل الدخول بالبريد وكلمة المرور لحساب المالك.
              </p>
              <div className="field">
                <label htmlFor="admin-email">البريد الإلكتروني للمالك</label>
                <input
                  id="admin-email"
                  type="email"
                  dir="ltr"
                  autoComplete="username"
                  placeholder="اكتب البريد الإلكتروني..."
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
                <label htmlFor="pw-input" style={{ marginTop: '10px', display: 'block' }}>كلمة المرور</label>
                <input
                  id="pw-input"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  placeholder="اكتب كلمة المرور..."
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

          {/* 2. Product Detail Modal (for Visitors) with Add to Cart / WhatsApp */}
          {activeModal === 'detail' && selectedProduct && (
            <div className="sheet wide" role="dialog" aria-modal="true" aria-label={selectedProduct.name}>
              <div className="sheet-h">
                <h3>تفاصيل الطقم واختيار المقاس</h3>
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
                          <span>📐 {hasAnySizePicker ? 'حدد مقاسك للإضافة لحقيبة الطلبات أو الواتساب' : 'طلب القطعة'}</span>
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

                        {/* 💬 ملاحظة إضافية */}
                        <div className="size-group">
                          <label className="size-label">
                            <span>💬 أي ملاحظة أو طلب خاص (اختياري)</span>
                          </label>
                          <input
                            type="text"
                            className="size-input"
                            placeholder="مثلاً: تفضيل لون معين، موعد استلام..."
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    {/* Add to Bag Button */}
                    <button
                      type="button"
                      className="btn btn-brand"
                      style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px' }}
                      onClick={handleAddToCart}
                    >
                      {Icons.cart}
                      <span>🛒 أضف إلى حقيبة الطلبات بالموقع</span>
                    </button>

                    {/* Instant WhatsApp Order Button */}
                    <a
                      className="btn btn-line"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px' }}
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
                      onClick={() => {
                        recordActivity({
                          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                          type: 'order_submit',
                          title: 'طلب فوري عبر واتساب',
                          details: `نقرة طلب مباشر على واتساب لطقم "${selectedProduct.name}"`,
                          actor: 'عميل بالموقع',
                          timestamp: Date.now(),
                        }).catch(() => {});
                      }}
                    >
                      {Icons.wa}
                      <span>اطلب فوراً عبر واتساب مباشرة</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Customer Shopping Bag / Cart Modal */}
          {activeModal === 'cart' && (
            <div className="sheet wide" role="dialog" aria-modal="true" aria-label="حقيبة الطلبات">
              <div className="sheet-h">
                <h3>
                  <span>🛒 حقيبة الطلبات ({cartItems.length} أطقم)</span>
                </h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="empty" style={{ padding: '36px 16px' }}>
                  <p>حقيبة الطلبات فاضية حالياً. تصفح الأطقم واختر المقاسات اللي تعجبك وضيفها هنا!</p>
                  <button
                    type="button"
                    className="btn btn-brand"
                    onClick={() => {
                      setActiveModal(null);
                      scrollToSection('shop');
                    }}
                  >
                    <span>تصفح الأطقم دلوقتي</span>
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--muted)' }}>
                    هنا الأطقم اللي ضفتها بمقاساتك المختارة. يمكنك حذف أي قطعة، أو إتمام الطلب أونلاين أو عبر واتساب:
                  </p>

                  {/* Cart Items List */}
                  <div className="cart-list">
                    {cartItems.map((item) => {
                      const sizes = [
                        item.clothesSize ? `مقاس الهدوم: ${item.clothesSize}` : null,
                        item.pantsSize ? `مقاس البنطلون: ${item.pantsSize}` : null,
                        item.shoeSize ? `مقاس الكوتشي: ${item.shoeSize}` : null,
                        item.notes ? `ملاحظات: ${item.notes}` : null,
                      ].filter(Boolean).join(' | ');

                      return (
                        <div key={item.id} className="cart-item-card">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="cart-item-img" />
                          ) : (
                            <div className="cart-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {Icons.hanger}
                            </div>
                          )}
                          <div className="cart-item-info">
                            <h4 className="cart-item-title">{item.name}</h4>
                            <div className="cart-item-meta">{sizes || 'مقاس افتراضي'}</div>
                            <div className="cart-item-price">{formatPrice(item.price)}</div>
                          </div>
                          <button
                            type="button"
                            className="cart-item-del"
                            onClick={() => handleRemoveFromCart(item)}
                            title="حذف هذا الطقم من السلة"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: 'var(--bg)',
                      borderRadius: '12px',
                      margin: '16px 0',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>إجمالي القطع في الحقيبة:</span>
                    <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--brand-deep)' }}>
                      {formatPrice(totalCartPrice)}
                    </span>
                  </div>

                  {/* Checkout Information Form */}
                  <div style={{ background: 'var(--surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '14.5px', fontWeight: 700 }}>
                      📋 بياناتك لتأكيد الطلب والتوصيل
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor="c-name">الاسم الكريم *</label>
                        <input
                          id="c-name"
                          type="text"
                          placeholder="مثلاً: أحمد محمود"
                          value={checkoutName}
                          onChange={(e) => setCheckoutName(e.target.value)}
                        />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label htmlFor="c-phone">رقم الموبايل / واتساب *</label>
                        <input
                          id="c-phone"
                          type="text"
                          dir="ltr"
                          inputMode="tel"
                          placeholder="مثلاً: 01012345678"
                          value={checkoutPhone}
                          onChange={(e) => setCheckoutPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field" style={{ marginTop: '10px' }}>
                      <label htmlFor="c-addr">العنوان أو مكان الاستلام (اختياري)</label>
                      <input
                        id="c-addr"
                        type="text"
                        placeholder="مثال: الإسكندرية، العجمي، أو استلام من الفرع"
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  {formError && (
                    <p className="err" role="alert" style={{ marginTop: '10px' }}>
                      {formError}
                    </p>
                  )}

                  <div className="sheet-f" style={{ marginTop: '16px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-brand"
                      onClick={() => handleSubmitCartOrder(false)}
                      disabled={isBusy}
                    >
                      {isBusy ? 'جاري التأكيد...' : '✅ إرسال وتأكيد الطلب أونلاين'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() => handleSubmitCartOrder(true)}
                      disabled={isBusy}
                    >
                      {Icons.wa}
                      <span>تأكيد وإرسال عبر واتساب</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() => setActiveModal(null)}
                    >
                      متابعة التسوق
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. Admin Live Customer Activity Feed Modal ("ما أضافه وما حذفه العميل") */}
          {activeModal === 'activity' && (
            <div className="sheet wide" role="dialog" aria-modal="true" aria-label="سجل نشاط وتغيرات العملاء المباشر">
              <div className="sheet-h">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚡ سجل نشاط وتغيرات العملاء المباشر</span>
                    <span className="online-pill">
                      <span className="online-dot"></span>
                      <span>تحديث فوري عبر الإنترنت</span>
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)' }}>
                  يعرض كافة تفاعلات وتغيرات العملاء على المتجر لحظة بلحظة (ما أضافه العميل للسلة، ما حذفه، وطلباته):
                </p>
                {activityLogs.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-line btn-sm"
                    onClick={handleClearActivity}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    {Icons.trash}
                    <span>مسح السجل</span>
                  </button>
                )}
              </div>

              {activityLogs.length === 0 ? (
                <div className="empty" style={{ padding: '36px 16px' }}>
                  <p>لا يوجد نشاطات مسجلة حتى الآن. أي عميل يضيف طقم أو يحذفه أو يطلب هيظهر هنا فوراً في نفس اللحظة!</p>
                </div>
              ) : (
                <div className="activity-feed">
                  {activityLogs.map((act) => {
                    let iconClass = 'activity-add';
                    let iconEmoji = '➕';
                    if (act.type === 'cart_remove') {
                      iconClass = 'activity-remove';
                      iconEmoji = '🗑️';
                    } else if (act.type === 'order_submit') {
                      iconClass = 'activity-order';
                      iconEmoji = '🛍️';
                    } else if (act.type.startsWith('product') || act.type === 'settings_update') {
                      iconClass = 'activity-edit';
                      iconEmoji = '✏️';
                    }

                    return (
                      <div key={act.id} className="activity-card">
                        <div className={`activity-icon-wrap ${iconClass}`}>
                          {iconEmoji}
                        </div>
                        <div className="activity-content">
                          <div className="activity-header">
                            <span className="activity-title">{act.title}</span>
                            <span className="activity-time">{formatArabicTime(act.timestamp)}</span>
                          </div>
                          <p className="activity-desc">{act.details}</p>
                          <div style={{ fontSize: '11.5px', color: 'var(--brand-deep)', marginTop: '4px', fontWeight: 600 }}>
                            بواسطة: {act.actor || 'عميل بالموقع'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="sheet-f" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-brand" onClick={() => setActiveModal(null)}>
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* 5. Admin Orders Management Modal */}
          {activeModal === 'orders' && (
            <div className="sheet wide" role="dialog" aria-modal="true" aria-label="طلبات العملاء">
              <div className="sheet-h">
                <h3>
                  <span>📦 طلبات العملاء الواردة ({orders.length} طلب)</span>
                </h3>
                <button
                  type="button"
                  className="x"
                  onClick={() => setActiveModal(null)}
                  aria-label="إغلاق"
                >
                  {Icons.x}
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="empty" style={{ padding: '36px 16px' }}>
                  <p>لسه مفيش طلبات عملاء واردة. لما أي عميل يطلب من المتجر هيظهر طلبه هنا بكل تفاصيله ومقاساته فوراً!</p>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((ord) => {
                    let statusLabel = 'جديد';
                    let statusClass = 'status-new';
                    if (ord.status === 'confirmed') {
                      statusLabel = 'تم التأكيد';
                      statusClass = 'status-confirmed';
                    } else if (ord.status === 'shipped') {
                      statusLabel = 'جاري التوصيل';
                      statusClass = 'status-shipped';
                    } else if (ord.status === 'completed') {
                      statusLabel = 'مكتمل ومستلم';
                      statusClass = 'status-completed';
                    } else if (ord.status === 'cancelled') {
                      statusLabel = 'ملغي';
                      statusClass = 'status-cancelled';
                    }

                    return (
                      <div key={ord.id} className="order-card">
                        <div className="order-top">
                          <div>
                            <span className="order-customer">{ord.customerName}</span>
                            <span style={{ margin: '0 8px', color: 'var(--muted)', fontSize: '13px' }}>
                              ({phoneShow(ord.customerPhone)})
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                              {formatArabicTime(ord.createdAt)}
                            </span>
                          </div>
                          <span className={`order-status-badge ${statusClass}`}>{statusLabel}</span>
                        </div>

                        {ord.customerAddress && (
                          <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
                            📍 <strong>العنوان:</strong> {ord.customerAddress}
                          </div>
                        )}

                        {ord.notes && (
                          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                            💬 <strong>ملاحظات العميل:</strong> {ord.notes}
                          </div>
                        )}

                        {/* Order Items Breakdown */}
                        <div className="order-items-box">
                          <strong>الأطقم المطلوبة ({ord.items.length}):</strong>
                          <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                            {ord.items.map((it, idx) => {
                              const sz = [
                                it.clothesSize ? `مقاس الهدوم: ${it.clothesSize}` : null,
                                it.pantsSize ? `مقاس البنطلون: ${it.pantsSize}` : null,
                                it.shoeSize ? `مقاس الكوتشي: ${it.shoeSize}` : null,
                                it.notes ? `ملاحظة: ${it.notes}` : null,
                              ].filter(Boolean).join(' | ');

                              return (
                                <li key={idx} style={{ marginBottom: '4px' }}>
                                  <strong>{it.name}</strong> - {it.price ? formatPrice(it.price) : 'سعر غير محدد'}
                                  {sz && <span style={{ color: 'var(--muted)', display: 'block', fontSize: '12.5px' }}>{sz}</span>}
                                </li>
                              );
                            })}
                          </ul>
                          <div style={{ marginTop: '8px', fontWeight: 800, color: 'var(--brand-deep)' }}>
                            الإجمالي: {formatPrice(ord.totalPrice)}
                          </div>
                        </div>

                        {/* Order Action Buttons */}
                        <div className="order-actions">
                          <a
                            className="btn btn-brand btn-sm"
                            href={buildWaLink(
                              ord.customerPhone,
                              `السلام عليكم أ / ${ord.customerName}، بنتواصل معاك من ${state.settings.name} بخصوص طلبك للأطقم.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {Icons.wa}
                            <span>مراسلة واتساب</span>
                          </a>
                          <a className="btn btn-line btn-sm" href={`tel:${ord.customerPhone}`}>
                            {Icons.phone}
                            <span>اتصال</span>
                          </a>

                          <select
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid var(--line)',
                              background: 'var(--surface)',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                            value={ord.status}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                          >
                            <option value="new">حالة: جديد</option>
                            <option value="confirmed">حالة: تم التأكيد</option>
                            <option value="shipped">حالة: جاري التوصيل</option>
                            <option value="completed">حالة: مكتمل</option>
                            <option value="cancelled">حالة: ملغي</option>
                          </select>

                          <button
                            type="button"
                            className="btn btn-line btn-sm"
                            style={{ color: 'var(--danger)' }}
                            onClick={() => handleDeleteOrder(ord.id)}
                            title="حذف الطلب"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="sheet-f" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-brand" onClick={() => setActiveModal(null)}>
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* 6. Add / Edit Product Modal (for Admin) */}
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

          {/* 7. Store Settings Modal (for Admin) */}
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
