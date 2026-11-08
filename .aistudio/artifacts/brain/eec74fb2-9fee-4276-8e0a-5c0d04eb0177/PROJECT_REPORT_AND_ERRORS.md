# ملف توثيق وسجل مشروع ستور Skip (كامل بالأخطاء والحلول)

---

## 1. نبذة عن المشروع وهيكليته
متجر إلكتروني متكامل لبراند الملابس الرجالية **Skip** (فرع العجمي - الهانوفيل - الإسكندرية).
- **الواجهة الأمامية (Frontend):** React 19 + TypeScript + Tailwind CSS (RTL عربي بالكامل).
- **السيرفر والباك إند (Backend):** Node.js + Express (`server.ts`) مع حفظ محلي دائم فوري في `data/state.json`.
- **قاعدة البيانات السحابية:** Firebase Cloud Firestore + Security Rules لحفظ وتزامن المنتجات والإعدادات عبر الأجهزة.
- **التواصل والطلبات:** نظام تفاعلي لإنشاء رسائل طلب واتساب ذكية ومفصلة بمقاسات التيشيرت/البنطلون/الكوتشي، روابط الخرائط الجغرافية، وحسابات السوشيال ميديا (تيك توك وفيسبوك).

---

## 2. سجل الأخطاء الشامل وكيف تم حل كل خطأ (Root Cause & Fix)

### الخطأ 1: تجاوز حجم المستند الأقصى في Firestore (1MB Document Size Exceeded)
- **رمز الخطأ:** `FirebaseError: Document exceeds maximum allowed size (1,048,576 bytes)`
- **السبب الجذري:** كان التطبيق في البداية يحفظ جميع المنتجات وصورها المرمزة بـ base64 داخل مستند واحد فقط باسم `/store_config/latest`. ومع إضافة عدة أطقم ومنتجات وصور، تجاوز حجم المستند 1 ميجابايت ففشل الحفظ.
- **الحل:** تم تفكيك بنية قاعدة البيانات بالكامل إلى مجموعتين منفصلتين:
  1. `/store_config/settings` لحفظ إعدادات واسم وبيانات تواصل الستور فقط.
  2. `/products/{productId}` لحفظ كل قطعة كوثيقة مستقلة، مما ألغى أي عائق لحجم المنتجات.

---

### الخطأ 2: أذونات غير كافية عند حذف المنتجات (Missing or insufficient permissions)
- **رمز الخطأ:** `FirebaseError: [code=permission-denied]: Missing or insufficient permissions`
- **السبب الجذري:** ملف قواعد الأمان القديم `firestore.rules` كان يسمح فقط بالقراءة والكتابة على المسار القديم `store_config/latest`، ولم يكن يسمح بعمليات الحذف `delete` على مسار `/products/{productId}`.
- **الحل:** تم تحديث ونشر قواعد `firestore.rules` جديدة عبر أمر `DeployRules` تسمح بالقراءة والكتابة والحذف لجميع منتجات المتجر وإعداداته.

---

### الخطأ 3: تجاوز الحصة المجانية لكتابة البيانات في Firebase (RESOURCE_EXHAUSTED)
- **رمز الخطأ:**
  ```text
  @firebase/firestore: Firestore (13.2.0): GrpcConnection RPC 'Write' stream error.
  Code: 8 Message: 8 RESOURCE_EXHAUSTED: Quota limit exceeded.
  Cause - Quota exceeded for quota metric 'Free daily write units per project (free tier database)'
  and limit 'Free daily write units per project (free tier database) per day' of service 'firestore.googleapis.com'
  ```
- **السبب الجذري:** استهلك المتجر الحصة اليومية المجانية المخصصة لمشروع Firebase في خطة Spark المجانية (حد 20,000 عملية كتابة يومياً). وبسبب تكرار محاولات الحفظ التلقائية، أصبح السيرفر والمتصفح يعيدان المحاولة في حلقة مستمرة.
- **الحل:**
  1. إنشاء قاطع دائرة ذكي (Circuit Breaker) في السيرفر والمتصفح يفحص الحصة.
  2. بمجرد اكتشاف انتهاء الحصة، يتم إيقاف فتح أي تدفق كتابة (`Write Stream`) إلى Firebase لمنع ظهور الخطأ في الـ Console.
  3. التحويل الفوري للتخزين المحلي بالسيرفر (`data/state.json`) و`localStorage` في المتصفح.
  4. تستأنف المزامنة السحابية تلقائياً عند تجدد الحصة اليومية عند منتصف الليل.

---

### الخطأ 4: تعليق زر الحفظ على "جاري الحفظ..." و"بنحفظ…" وتجميد الواجهة
- **رمز الخطأ:** `UI Freeze on 'isBusy: true'`
- **السبب الجذري:**
  عندما دخلت مكتبة Firebase Firestore في حالة التراجع الأسي (`maximum backoff delay`) بسبب انتهاء الحصة أو انقطاع الاتصال، فإن دالة `writeBatch.commit()` في الـ JavaScript SDK تظل معلقة (`Pending Promise`) ولا تنتهي ولا ترفض الخطأ. وبما أن دالة `persistState` في `App.tsx` كانت تستخدم `await saveStoreStateToFirestore(...)` بشكل تسلسلي قبل أي خطوة أخرى وبدون مهلة قصوى (Timeout)، كان التنفيذ يعلق هناك ولا يصل أبداً إلى `setIsBusy(false)` في كتلة `finally`.
- **الحل:**
  1. تطبيق تقنية الـ **Optimistic UI**: تحديث حالة المتصفح و`localStorage` في 1 مللي ثانية.
  2. تغليف جميع عمليات Firebase بدالة `withTimeout` بمهلة أمان أقصاها 1500 مللي ثانية، بحيث لا تعلق الدالة إطلاقاً.
  3. إرسال الحفظ إلى سيرفر `POST /api/state` الذي يحفظ على القرص في 5 مللي ثانية ويرد فوراً، بينما تجري المزامنة مع Firestore في الخلفية دون تعطيل واجهة المستخدم.
  4. ضمان استعادة زر الحفظ لحالته الطبيعية وإغلاق النافذة المنبثقة فوراً (< 50ms) مع إظهار إشعار النجاح الأخضر.

---

## 3. ملفات المشروع الأساسية وأدوارها

| اسم الملف | المسار | الوظيفة |
| :--- | :--- | :--- |
| `src/App.tsx` | `/src/App.tsx` | المكون الرئيسي للمتجر: عرض المنتجات، المودالات، فلترة الأقسام، واجهة الأدمن، إدارة المقاسات، والربط بالواتساب. |
| `src/utils/firebase.ts` | `/src/utils/firebase.ts` | تهيئة Firebase Firestore، دوال القراءة والكتابة الآمنة، مراقبة الحصة اليومية، ومهلات الأمان `withTimeout`. |
| `src/utils/store.ts` | `/src/utils/store.ts` | الدوال النقية: معالجة أرقام الموبايل المصرية، إنشاء روابط واتساب، فحص وتوليد مقاسات التيشيرت/البنطلون/الكوتشي، التشفير والتحقق من كلمة المرور. |
| `src/utils/store.test.ts` | `/src/utils/store.test.ts` | 17 اختبار وحدة آلي يغطي كافة منطق الحسابات، الأرقام، المقاسات والتحقق. |
| `server.ts` | `/server.ts` | سيرفر Node.js + Express: توفير API الحفظ `/api/state`، المزامنة، تخزين ملف الحالة `data/state.json`، ومسار تحميل المشروع `/api/download-project`. |
| `firestore.rules` | `/firestore.rules` | قواعد الحماية والصلاحيات لقاعدة بيانات Firestore. |
| `firebase-blueprint.json`| `/firebase-blueprint.json` | المخطط الهيكلي لقاعدة البيانات (Entity definitions & schemas). |
| `firebase-applet-config.json` | `/firebase-applet-config.json` | مفاتيح ومعرفات مشروع Firebase وFirestore. |
| `data/state.json` | `/data/state.json` | الملف الدائم للمنتجات وبيانات المتجر على السيرفر. |

---

## 4. تحميل المشروع كاملاً (Source Code Archive)
تم تجميع ملفات المشروع بالكامل داخل أرشيف مضغوط جاهز للتحميل:
- **مسار الملف على السيرفر:** `/public/skip_store_full_project.zip`
- **رابط التحميل المباشر:**
  `http://localhost:3000/api/download-project` (أو عبر مسار `/skip_store_full_project.zip`)

### طريقة تشغيل المشروع محلياً بعد فك الضغط:
1. فك ضغط الملف `skip_store_full_project.zip`.
2. فتح موجه الأوامر (Terminal) في مجلد المشروع وتشغيل:
   ```bash
   npm install
   ```
3. تشغيل السيرفر المحلي:
   ```bash
   npm run dev
   ```
4. فتح المتصفح على:
   `http://localhost:3000`
