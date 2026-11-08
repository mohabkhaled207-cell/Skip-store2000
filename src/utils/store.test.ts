import test from 'node:test';
import assert from 'node:assert/strict';
import {
  digits,
  waDigits,
  phoneShow,
  buildWaLink,
  buildProductWaMessage,
  getNeededSizes,
  buildMapsLink,
  countAr,
  formatPrice,
  getCategories,
  filterProducts,
  countInStock,
  normalizeUrl,
  tiktokHandle,
  sha256,
  verifyAdminPassword,
  checkAdminPassword,
  isStateNewer,
  resolveLatestState,
  PW_SALT,
  PW_HASH,
  Product,
  StoreState,
} from './store';

test('digits extracts digits and converts Arabic-Indic digits', () => {
  assert.equal(digits('01090435343'), '01090435343');
  assert.equal(digits('٠١٠٩٠٤٣٥٣٤٣'), '01090435343');
  assert.equal(digits('+20 (10) 9043-5343'), '201090435343');
  assert.equal(digits(''), '');
  assert.equal(digits(null), '');
});

test('waDigits prepares proper international format for Egypt numbers', () => {
  assert.equal(waDigits('01090435343'), '201090435343');
  assert.equal(waDigits('201090435343'), '201090435343');
  assert.equal(waDigits('00201090435343'), '201090435343');
});

test('phoneShow formats Egyptian mobile numbers for display', () => {
  assert.equal(phoneShow('01090435343'), '010 9043 5343');
  assert.equal(phoneShow('201090435343'), '010 9043 5343');
});

test('buildWaLink creates valid WhatsApp URL with encoded message', () => {
  const url = buildWaLink('01090435343', 'السلام عليكم');
  assert.equal(url.includes('https://wa.me/201090435343?text='), true);
  assert.equal(url.includes(encodeURIComponent('السلام عليكم')), true);
});

test('buildProductWaMessage formats product details nicely', () => {
  const sampleProduct: Product = {
    id: 'p1',
    name: 'طقم تيشيرت أبيض + جينز',
    category: 'أطقم',
    price: 750,
    sizes: 'M - L - XL',
    soldOut: false,
    image: 'https://example.com/shirt.jpg',
  };
  const msg = buildProductWaMessage(sampleProduct, 'Skip');
  assert.equal(msg.includes('طقم تيشيرت أبيض + جينز'), true);
  assert.equal(msg.includes('أطقم'), true);
  assert.equal(msg.includes('750 ج.م'), true);
  assert.equal(msg.includes('https://example.com/shirt.jpg'), true);
});

test('buildProductWaMessage formats customer chosen sizes and notes', () => {
  const sampleProduct: Product = {
    id: 'p2',
    name: 'طقم سبورت شتوي',
    category: 'أطقم',
    price: 950,
    sizes: 'M - L - XL - 2XL',
    soldOut: false,
    image: 'https://example.com/sport.jpg',
  };
  const msg = buildProductWaMessage(sampleProduct, 'Skip', {
    clothesSize: 'XL',
    pantsSize: '34',
    shoeSize: '43',
    notes: 'عايز استلام من الفرع اليوم',
  });
  assert.equal(msg.includes('طقم سبورت شتوي'), true);
  assert.equal(msg.includes('مقاس الهدوم المطلوب:* XL'), true);
  assert.equal(msg.includes('مقاس البنطلون المطلوب:* 34'), true);
  assert.equal(msg.includes('مقاس الكوتشي/الجزمة المطلوب:* 43'), true);
  assert.equal(msg.includes('ملاحظات الزبون:* عايز استلام من الفرع اليوم'), true);
});

test('getNeededSizes correctly detects size requirements per category and product name', () => {
  // 1. Full Outfit / Set -> All 3 sizes
  const setProduct: Product = { id: '1', name: 'طقم كاجوال شتوي', category: 'أطقم', price: 1000, sizes: '', soldOut: false, image: '' };
  assert.deepEqual(getNeededSizes(setProduct), { clothes: true, pants: true, shoes: true });

  // 2. Pants only -> Pants size only
  const pantsProduct: Product = { id: '2', name: 'بنطلون جينز أزرق غامق', category: 'بنطلونات', price: 450, sizes: '', soldOut: false, image: '' };
  assert.deepEqual(getNeededSizes(pantsProduct), { clothes: false, pants: true, shoes: false });

  // 3. T-shirt / Hoodie / Jacket -> Clothes size only
  const tshirtProduct: Product = { id: '3', name: 'تيشيرت أبيض أوفر سايز', category: 'تيشيرتات', price: 300, sizes: '', soldOut: false, image: '' };
  assert.deepEqual(getNeededSizes(tshirtProduct), { clothes: true, pants: false, shoes: false });

  const jacketProduct: Product = { id: '4', name: 'جاكيت بامب ووتر بروف', category: 'جواكيت', price: 850, sizes: '', soldOut: false, image: '' };
  assert.deepEqual(getNeededSizes(jacketProduct), { clothes: true, pants: false, shoes: false });

  // 4. Shoes -> Shoes size only
  const shoeProduct: Product = { id: '5', name: 'كوتشي فلات أبيض', category: 'كوتشيات', price: 600, sizes: '', soldOut: false, image: '' };
  assert.deepEqual(getNeededSizes(shoeProduct), { clothes: false, pants: false, shoes: true });

  // 5. Bag -> No sizes required
  const bagProduct: Product = { id: '6', name: 'حقيبة ظهر كروس جلد', category: 'حقائب وشنط', price: 250, sizes: '', soldOut: false, image: '' };
  assert.deepEqual(getNeededSizes(bagProduct), { clothes: false, pants: false, shoes: false });
});

test('buildMapsLink handles custom and fallback address maps URL', () => {
  const fallback = buildMapsLink('العجمي الإسكندرية', '', 'Skip');
  assert.equal(fallback.includes('https://www.google.com/maps/search/?api=1&query='), true);

  const custom = buildMapsLink('العجمي', 'https://maps.google.com/?q=test', 'Skip');
  assert.equal(custom, 'https://maps.google.com/?q=test');
});

test('tiktokHandle extracts username', () => {
  assert.equal(tiktokHandle('https://www.tiktok.com/@hamoskip'), '@hamoskip');
  assert.equal(tiktokHandle(''), 'تيك توك');
});

test('countAr formats Arabic count descriptions accurately', () => {
  assert.equal(countAr(1), 'طقم واحد متاح');
  assert.equal(countAr(2), 'طقمين متاحين');
  assert.equal(countAr(5), '5 أطقم متاحة');
  assert.equal(countAr(12), '12 طقم متاح');
});

test('formatPrice formats Egyptian pound amounts or returns ask', () => {
  assert.equal(formatPrice(null), 'اسأل عن السعر');
  assert.equal(formatPrice(undefined), 'اسأل عن السعر');
  assert.equal(formatPrice(750), '750 ج.م');
  assert.equal(formatPrice(1200), '1,200 ج.م');
});

test('filterProducts filters items correctly by category', () => {
  const sampleProducts: Product[] = [
    { id: '1', name: 'طقم 1', category: 'أطقم', price: 500, sizes: 'M', soldOut: false, image: '' },
    { id: '2', name: 'هودي', category: 'هوديز', price: 400, sizes: 'L', soldOut: false, image: '' },
    { id: '3', name: 'طقم 2', category: 'أطقم', price: 600, sizes: 'XL', soldOut: true, image: '' },
  ];

  assert.equal(getCategories(sampleProducts).length, 2);
  assert.deepEqual(getCategories(sampleProducts), ['أطقم', 'هوديز']);
  assert.equal(filterProducts(sampleProducts, 'all').length, 3);
  assert.equal(filterProducts(sampleProducts, 'أطقم').length, 2);
  assert.equal(filterProducts(sampleProducts, 'هوديز').length, 1);
  assert.equal(countInStock(sampleProducts), 2);
});

test('normalizeUrl prepends https:// when missing', () => {
  assert.equal(normalizeUrl('facebook.com/skip'), 'https://facebook.com/skip');
  assert.equal(normalizeUrl('https://facebook.com/skip'), 'https://facebook.com/skip');
  assert.equal(normalizeUrl(''), '');
});

test('sha256 computes expected hash format and validates PW_SALT', async () => {
  const hash = await sha256('test');
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64);
  assert.equal(typeof PW_SALT, 'string');
  assert.equal(PW_HASH.length, 64);
});

test('verifyAdminPassword and checkAdminPassword accept Skip2000 and fallback credentials', async () => {
  assert.equal(await verifyAdminPassword('Skip2000'), true);
  assert.equal(await verifyAdminPassword('skip2000'), true);
  assert.equal(await checkAdminPassword('Skip2000'), true);
  assert.equal(await checkAdminPassword('skip2000'), true);
  assert.equal(await verifyAdminPassword('skip'), true);
  assert.equal(await verifyAdminPassword('Skip'), true);
  assert.equal(await verifyAdminPassword('admin'), true);
  assert.equal(await verifyAdminPassword('01090435343'), true);
  assert.equal(await verifyAdminPassword('wrongpassword123'), false);
  assert.equal(await verifyAdminPassword(''), false);
});

test('isStateNewer compares timestamps correctly', () => {
  const oldState: StoreState = {
    v: 1,
    updatedAt: 1000,
    settings: { name: 'Skip', headline: '', sub: '', area: '', logo: '', phone: '', facebook: '', tiktok: '', address: '', maps: '' },
    products: []
  };
  const newState: StoreState = {
    ...oldState,
    updatedAt: 2000
  };

  assert.equal(isStateNewer(newState, oldState), true);
  assert.equal(isStateNewer(oldState, newState), false);
  assert.equal(isStateNewer(oldState, oldState), false);
  assert.equal(isStateNewer(null, oldState), false);
  assert.equal(isStateNewer(oldState, null), true);
});

test('resolveLatestState prevents stale server response from overwriting newer local edits', () => {
  const fallback: StoreState = {
    v: 1,
    updatedAt: 100,
    settings: { name: 'Skip', headline: 'Default', sub: '', area: '', logo: '', phone: '', facebook: '', tiktok: '', address: '', maps: '' },
    products: []
  };

  const oldServerState: StoreState = {
    ...fallback,
    updatedAt: 100
  };

  const newerLocalState: StoreState = {
    ...fallback,
    updatedAt: 500,
    settings: { ...fallback.settings, headline: 'New Edited Headline' }
  };

  const res1 = resolveLatestState(newerLocalState, oldServerState, fallback);
  assert.equal(res1.state.settings.headline, 'New Edited Headline');
  assert.equal(res1.needsPushToServer, true);

  const newerServerState: StoreState = {
    ...fallback,
    updatedAt: 1000,
    settings: { ...fallback.settings, headline: 'Server Headline 1000' }
  };

  const res2 = resolveLatestState(newerLocalState, newerServerState, fallback);
  assert.equal(res2.state.settings.headline, 'Server Headline 1000');
  assert.equal(res2.needsPushToServer, false);
});


