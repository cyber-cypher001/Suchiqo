import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistance,
  calculateDeliveryEtaMinutes,
  normalizeRoute,
  canAccessRoute,
  extractHinglishQuantity,
  evaluateHinglishVoiceIntent,
  evaluateVoiceBrain,
  humanizeTextForSpeech,
  matchSkusInText,
  DEFAULT_KIRANA_CATALOG,
  mutateCartItems,
  computeCartSummary,
  computeErpKpis,
  updateOrderRecordStatus,
  filterCustomerOrders,
  buildGnaniVoiceTelemetry,
  GNANI_LANGUAGES,
  GNANI_VOICE_PERSONAS,
  GNANI_ACOUSTIC_MODES,
  computeCustomerProfileKpis,
  aggregateFrequentOrderItems,
  reorderItemsIntoCart,
  advanceOrderFulfillmentStage,
  buildPakkaGstInvoice,
  recommendRecipesFromShelf,
  calculateUpdatedStoreRating,
  RegisteredStore,
  ShelfItem,
  AuthSession,
  OrderRecord,
} from './suchiqoLogic';

test('calculateHaversineDistance computes accurate km distance', () => {
  // Same point should be 0 km
  assert.equal(calculateHaversineDistance(21.1458, 79.0882, 21.1458, 79.0882), 0);
  // ~0.7 km away in Nagpur
  const dist = calculateHaversineDistance(21.1458, 79.0882, 21.1508, 79.0932);
  assert.equal(dist > 0.5 && dist < 1.0, true);
  assert.equal(calculateDeliveryEtaMinutes(dist), 10);
});

test('normalizeRoute maps valid routes and defaults unknown to 404', () => {
  assert.equal(normalizeRoute(''), 'home');
  assert.equal(normalizeRoute('#/home'), 'home');
  assert.equal(normalizeRoute('#/how-it-works'), 'how-it-works');
  assert.equal(normalizeRoute('#/shopkeeper'), 'shopkeeper');
  assert.equal(normalizeRoute('#/profile'), 'profile');
  assert.equal(normalizeRoute('#/unknown-aisle'), '404');
});

test('canAccessRoute enforces strict role-isolated route guards including #/profile', () => {
  const customerAuth: AuthSession = {
    role: 'customer',
    name: 'Aarush',
    phone: '9876543210',
    address: 'Civil Lines',
  };
  const shopkeeperAuth: AuthSession = {
    role: 'shopkeeper',
    name: 'Rajesh',
    phone: '9123456780',
    storeName: 'Sharma Kirana',
  };

  assert.equal(canAccessRoute('home', null), true);
  assert.equal(canAccessRoute('customer', null), false);
  assert.equal(canAccessRoute('shopkeeper', null), false);
  assert.equal(canAccessRoute('profile', null), false);
  assert.equal(canAccessRoute('customer', customerAuth), true);
  assert.equal(canAccessRoute('shopkeeper', customerAuth), false);
  assert.equal(canAccessRoute('profile', customerAuth), true);
  assert.equal(canAccessRoute('shopkeeper', shopkeeperAuth), true);
  assert.equal(canAccessRoute('customer', shopkeeperAuth), false);
  assert.equal(canAccessRoute('profile', shopkeeperAuth), true);
});

test('extractHinglishQuantity parses Hindi words and numeric digits', () => {
  assert.equal(extractHinglishQuantity('do packet Aashirvaad Atta'), 2);
  assert.equal(extractHinglishQuantity('teen kilo chawal'), 3);
  assert.equal(extractHinglishQuantity('5 Amul Butter'), 5);
  assert.equal(extractHinglishQuantity('Aashirvaad Atta de do'), 1);
});

test('evaluateHinglishVoiceIntent handles stock queries, GPS requests, and cart additions', () => {
  const sampleShelf: ShelfItem[] = [
    {
      id: 'sku_1',
      name: 'Aashirvaad Atta 5kg',
      category: 'Grocery',
      mrp: 280,
      price: 245,
      stock: 15,
      unit: 'pack',
      emoji: '🌾',
    },
  ];
  const customerAuth: AuthSession = {
    role: 'customer',
    name: 'Aarush',
    phone: '9876543210',
  };

  // Stock query on empty shelf
  const emptyStockRes = evaluateHinglishVoiceIntent('Aaj mujhe kya mil sakta hai?', [], null);
  assert.equal(emptyStockRes.action, 'stock_query');
  assert.equal(emptyStockRes.reply.includes('koi product publish nahi'), true);

  // Stock query on populated shelf
  const populatedStockRes = evaluateHinglishVoiceIntent('Aaj kya mil sakta hai?', sampleShelf, null);
  assert.equal(populatedStockRes.action, 'stock_query');
  assert.equal(populatedStockRes.reply.includes('Aashirvaad Atta 5kg (₹245)'), true);

  // GPS trigger
  const gpsRes = evaluateHinglishVoiceIntent('Meri live GPS location dikhao', sampleShelf, null);
  assert.equal(gpsRes.action, 'gps_trigger');

  // Unauthenticated product match prompts sign-in
  const unauthMatch = evaluateHinglishVoiceIntent('do Aashirvaad Atta', sampleShelf, null);
  assert.equal(unauthMatch.action, 'auth_required');

  // Authenticated customer product match adds to cart with parsed quantity
  const authMatch = evaluateHinglishVoiceIntent('do Aashirvaad Atta', sampleShelf, customerAuth);
  assert.equal(authMatch.action, 'cart_add');
  assert.equal(authMatch.qty, 2);
});

test('mutateCartItems and computeCartSummary calculate accurate totals and savings', () => {
  const shelf: ShelfItem[] = [
    {
      id: 'sku_1',
      name: 'Tata Salt 1kg',
      category: 'Grocery',
      mrp: 30,
      price: 25,
      stock: 5,
      unit: 'pack',
      emoji: '🧂',
    },
  ];

  let cart = mutateCartItems([], shelf, 'sku_1', 2);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 2);

  const summary = computeCartSummary(cart);
  assert.equal(summary.itemCount, 2);
  assert.equal(summary.totalPayable, 50);
  assert.equal(summary.totalSavings, 10);

  // Decrement to 0 removes item
  cart = mutateCartItems(cart, shelf, 'sku_1', -2);
  assert.equal(cart.length, 0);
});

test('computeErpKpis aggregates orders, revenue, SKUs, cashbook, and khata', () => {
  const kpis = computeErpKpis(
    [{ id: '#1001', customerName: 'Aarush', items: '2 Tata Salt', total: 50, status: 'Pending', createdAt: 'Today' }],
    [{ id: 'sku_1', name: 'Tata Salt', category: 'Grocery', mrp: 30, price: 25, stock: 5, unit: 'pack', emoji: '🧂' }],
    [
      { id: 'cb_1', note: 'Wholesale stock', type: 'expense', amount: 200, createdAt: 'Today' },
      { id: 'cb_2', note: 'Counter cash', type: 'income', amount: 500, createdAt: 'Today' },
    ],
    [{ id: 'kh_1', customerName: 'Ramesh', phone: '9876543210', type: 'udhaar', amount: 150, note: 'Monthly ration', createdAt: 'Today' }]
  );

  assert.equal(kpis.orderCount, 1);
  assert.equal(kpis.salesRevenue, 50);
  assert.equal(kpis.publishedSkus, 1);
  assert.equal(kpis.netCashbook, 300);
  assert.equal(kpis.netKhataReceivable, 150);
});

test('updateOrderRecordStatus and filterCustomerOrders manage OrderRecord history and completion state', () => {
  const initialOrders: OrderRecord[] = [
    {
      id: '#1002',
      customerName: 'Aarush',
      items: '1 pack Amul Taaza Milk',
      total: 54,
      status: 'Pending',
      createdAt: '10:30 AM',
    },
    {
      id: '#1001',
      customerName: 'Aarush',
      items: '2 pack Aashirvaad Atta 5kg',
      total: 490,
      status: 'Delivered',
      createdAt: '09:15 AM',
    },
    {
      id: '#1000',
      customerName: 'Priya',
      items: '1 pack Tata Salt',
      total: 25,
      status: 'Delivered',
      createdAt: 'Yesterday',
    },
  ];

  // Filter completed (Delivered) orders for Aarush
  const completedForAarush = filterCustomerOrders(initialOrders, 'completed', 'Aarush');
  assert.equal(completedForAarush.length, 1);
  assert.equal(completedForAarush[0].id, '#1001');
  assert.equal(completedForAarush[0].status, 'Delivered');

  // Update #1002 from Pending to Delivered
  const updatedOrders = updateOrderRecordStatus(initialOrders, '#1002', 'Delivered');
  const afterComplete = filterCustomerOrders(updatedOrders, 'completed', 'Aarush');
  assert.equal(afterComplete.length, 2);
  assert.equal(afterComplete[0].id, '#1002');
  assert.equal(afterComplete[0].status, 'Delivered');
});

test('buildGnaniVoiceTelemetry computes Gnani Prisma v3.0 STT and Timbre v3.0 TTS telemetry across Indic languages', () => {
  assert.equal(GNANI_LANGUAGES.length >= 9, true);
  assert.equal(GNANI_VOICE_PERSONAS.length, 4);
  assert.equal(GNANI_ACOUSTIC_MODES.length, 2);

  const sampleOutcome = evaluateHinglishVoiceIntent(
    'do packet Aashirvaad Atta de do',
    [
      {
        id: 'sku_1',
        name: 'Aashirvaad Atta 5kg',
        category: 'Grocery',
        mrp: 280,
        price: 245,
        stock: 10,
        unit: 'pack',
        emoji: '🌾',
      },
    ],
    { role: 'customer', name: 'Aarush', phone: '9876543210' }
  );

  const telemetry = buildGnaniVoiceTelemetry(
    'do packet Aashirvaad Atta de do',
    'mr-IN',
    'meera-indic',
    'prisma-v3-telephony-8khz',
    sampleOutcome
  );

  assert.equal(telemetry.engineName, 'Gnani.ai Vachana Voice Stack');
  assert.equal(telemetry.sttModel, 'Gnani Prisma v3.0 Far-Field');
  assert.equal(telemetry.ttsModel, 'Gnani Timbre v3.0 Zero-Shot');
  assert.equal(telemetry.languageCode, 'mr-IN');
  assert.equal(telemetry.confidence, 0.98);
  assert.equal(telemetry.apiEndpoint, 'https://api.vachana.ai/v1');
});

test('evaluateVoiceBrain maps multiple questions and multiple item inputs in a single compound sentence without confusion', () => {
  const matches = matchSkusInText(
    '2 packet aata, teen namak aur 4 maggi de do',
    DEFAULT_KIRANA_CATALOG
  );
  assert.equal(matches.length, 3);
  assert.equal(matches[0].sku.id, 'sku_atta_5kg');
  assert.equal(matches[0].qty, 2);
  assert.equal(matches[1].sku.id, 'sku_salt_1kg');
  assert.equal(matches[1].qty, 3);
  assert.equal(matches[2].sku.id, 'sku_maggi_4pk');
  assert.equal(matches[2].qty, 4);

  // Compound utterance on stocked shelf: Price query on 2 items + Cart addition of 2 items + Delivery ETA question + Cart bill summary question
  const brainRes = evaluateVoiceBrain(
    'Atta aur Chawal kitne ka hai, 2 Tata Salt aur 1 Amul Milk add karo, delivery kitni der mein hogi aur total bill kitna bana?',
    {
      shelf: DEFAULT_KIRANA_CATALOG,
      cart: [],
      auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
      autoHydrateCatalog: false,
    }
  );

  // Should classify price_query for Atta & Chawal WITHOUT adding them to cart!
  assert.equal(brainRes.intents.includes('price_query'), true);
  assert.equal(brainRes.intents.includes('cart_add'), true);
  assert.equal(brainRes.intents.includes('delivery_query'), true);
  assert.equal(brainRes.intents.includes('cart_query'), true);
  assert.equal(brainRes.autoHydratedSkus.length, 0);

  // Only Tata Salt (qty 2) and Amul Milk (qty 1) should be in cartMutations
  assert.equal(brainRes.cartMutations.length, 2);
  assert.equal(brainRes.cartMutations[0].sku.id, 'sku_salt_1kg');
  assert.equal(brainRes.cartMutations[0].qty, 2);
  assert.equal(brainRes.cartMutations[1].sku.id, 'sku_milk_1l');
  assert.equal(brainRes.cartMutations[1].qty, 1);

  // Reply should contain price of Atta (₹245), price of Basmati Rice (₹465), delivery time (10 se 15 minute), and total bill (2*25 + 1*56 = ₹106)
  assert.equal(brainRes.reply.includes('₹245'), true);
  assert.equal(brainRes.reply.includes('₹465'), true);
  assert.equal(brainRes.reply.includes('₹106'), true);

  // Spoken reply must be humanized without robotic symbols (×, ₹, /pack)
  assert.equal(brainRes.spokenReply.includes('×'), false);
  assert.equal(brainRes.spokenReply.includes('₹'), false);
  assert.equal(brainRes.spokenReply.includes('245 rupaye'), true);
  assert.equal(
    humanizeTextForSpeech('2× Tata Salt 1kg ₹25/pack hai (MRP ₹30, ₹5 bachat)').includes('2 packet Tata Salt 1 kilo'),
    true
  );
});

test('evaluateVoiceBrain strictly checks available shop shelf and never auto-adds unavailable items', () => {
  // Shop shelf only has Tata Salt in stock
  const partialShelf: ShelfItem[] = [
    {
      id: 'sku_salt_1kg',
      name: 'Tata Salt 1kg',
      category: 'Grocery',
      mrp: 30,
      price: 25,
      stock: 10,
      unit: 'pack',
      emoji: '🧂',
    },
  ];

  // Customer asks for Atta (in catalog but NOT on shop's shelf) and Paneer (custom item NOT on shelf)
  const unavailRes = evaluateVoiceBrain('2 packet Aashirvaad Atta aur 1 Paneer add karo', {
    shelf: partialShelf,
    cart: [],
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
    autoHydrateCatalog: false,
  });

  // Must NEVER auto-hydrate or add unstocked items to cart
  assert.equal(unavailRes.autoHydratedSkus.length, 0);
  assert.equal(unavailRes.cartMutations.length, 0);
  assert.equal(unavailRes.intents.includes('item_unavailable'), true);
  assert.equal(unavailRes.reply.includes('uplabdh nahi hai'), true);
});

test('evaluateVoiceBrain handles multi-turn follow-up answers, payment mode, scheduling, address selection, and ERP inputs', () => {
  // Turn 1: User asks price of Atta and Butter
  const turn1 = evaluateVoiceBrain('Atta aur Butter kitne ka hai?', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    auth: null,
  });
  assert.equal(turn1.intents.includes('price_query'), true);
  assert.equal(turn1.cartMutations.length, 0);
  assert.equal(turn1.updatedMemory.lastReferencedSkuIds.length, 2);

  // Turn 2: User answers "Haan dono 3 packet add kar do" using memory from Turn 1
  const turn2 = evaluateVoiceBrain('Haan dono 3 packet add kar do', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    auth: null,
    memory: turn1.updatedMemory,
  });
  assert.equal(turn2.intents.includes('followup_answer'), true);
  assert.equal(turn2.cartMutations.length, 2);
  assert.equal(turn2.cartMutations[0].qty, 3);
  assert.equal(turn2.cartMutations[1].qty, 3);

  // Voice payment selection + order scheduling + work address selection
  const checkoutVoice = evaluateVoiceBrain(
    'Payment UPI se karunga, mera order shaam 6 baje schedule kar do aur mere office work address par bhejna',
    {
      shelf: DEFAULT_KIRANA_CATALOG,
      cart: [],
      auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
    }
  );
  assert.equal(checkoutVoice.selectedPaymentMode, 'upi');
  assert.equal(checkoutVoice.scheduleUpdate?.slotId, 'evening-5-7');
  assert.equal(checkoutVoice.selectedAddressTag, 'Work');

  // Multi-field profile + Shopkeeper ERP mutations in one input
  const erpTurn = evaluateVoiceBrain(
    'Mera naam Rajesh hai, phone 9876543210, kharcha 350 bijli bill likho aur Ramesh ke naam 450 udhaar likho',
    {
      shelf: DEFAULT_KIRANA_CATALOG,
      cart: [],
      auth: null,
    }
  );
  assert.equal(erpTurn.profileInput?.name, 'Rajesh');
  assert.equal(erpTurn.profileInput?.phone, '9876543210');
  assert.equal(erpTurn.erpMutations.length, 2);
  assert.equal(erpTurn.erpMutations[0].kind, 'add_cashbook');
  assert.equal(erpTurn.erpMutations[0].cashbook?.amount, 350);
  assert.equal(erpTurn.erpMutations[1].kind, 'add_khata');
  assert.equal(erpTurn.erpMutations[1].khata?.amount, 450);
});

test('computeCustomerProfileKpis, aggregateFrequentOrderItems, reorderItemsIntoCart, advanceOrderFulfillmentStage, and buildPakkaGstInvoice work accurately', () => {
  const shelf: ShelfItem[] = [
    {
      id: 'sku_atta',
      name: 'Aashirvaad Atta 5kg',
      category: 'Grocery',
      mrp: 280,
      price: 245,
      stock: 5,
      unit: 'pack',
      emoji: '🌾',
      hsn: '110100',
    },
    {
      id: 'sku_salt',
      name: 'Tata Salt 1kg',
      category: 'Grocery',
      mrp: 30,
      price: 25,
      stock: 10,
      unit: 'pack',
      emoji: '🧂',
      hsn: '250100',
    },
  ];

  const orders: OrderRecord[] = [
    {
      id: '#1001',
      customerName: 'Aarush',
      items: '2 pack Aashirvaad Atta 5kg, 1 pack Tata Salt 1kg',
      total: 515,
      status: 'Pending',
      createdAt: '10:15 AM',
      paymentMode: 'Udhaar Khata',
      storeName: 'Sharma Kirana',
      handoverOtp: '4821',
      voiceTranscript: '2 packet Aashirvaad Atta aur 1 Tata Salt bhej do',
      mrpSavings: 75,
      lineItems: [
        {
          skuId: 'sku_atta',
          name: 'Aashirvaad Atta 5kg',
          qty: 2,
          unit: 'pack',
          mrp: 280,
          price: 245,
          emoji: '🌾',
          hsn: '110100',
        },
        {
          skuId: 'sku_salt',
          name: 'Tata Salt 1kg',
          qty: 1,
          unit: 'pack',
          mrp: 30,
          price: 25,
          emoji: '🧂',
          hsn: '250100',
        },
      ],
    },
  ];

  const khata = [
    {
      id: 'kh_1',
      customerName: 'Aarush',
      phone: '9876543210',
      type: 'udhaar' as const,
      amount: 515,
      note: 'Order #1001',
      createdAt: '10:15 AM',
    },
    {
      id: 'kh_2',
      customerName: 'Aarush',
      phone: '9876543210',
      type: 'jama' as const,
      amount: 200,
      note: 'Partial UPI settlement',
      createdAt: '11:00 AM',
    },
  ];

  const kpis = computeCustomerProfileKpis(orders, khata, 'Aarush');
  assert.equal(kpis.totalOrdersPlaced, 1);
  assert.equal(kpis.totalSpent, 515);
  assert.equal(kpis.lifetimeMrpSavings, 75);
  assert.equal(kpis.runningUdhaarDues, 315);

  const frequent = aggregateFrequentOrderItems(orders, shelf, 'Aarush');
  assert.equal(frequent.length, 2);
  assert.equal(frequent[0].skuId, 'sku_atta');
  assert.equal(frequent[0].totalUnitsOrdered, 2);
  assert.equal(frequent[0].inStock, true);

  const reordered = reorderItemsIntoCart([], orders[0], shelf);
  assert.equal(reordered.addedCount, 3);
  assert.equal(reordered.nextCart.length, 2);

  assert.equal(advanceOrderFulfillmentStage('Pending'), 'Packing');
  assert.equal(advanceOrderFulfillmentStage('Packing'), 'Out for Delivery');
  assert.equal(advanceOrderFulfillmentStage('Out for Delivery'), 'Delivered');

  const invoice = buildPakkaGstInvoice(orders[0], null);
  assert.equal(invoice.invoiceNumber, 'SQ-INV-1001');
  assert.equal(invoice.lines.length, 2);
  assert.equal(invoice.grandTotal, 515);
  assert.equal(invoice.totalMrpSavings, 75);
});

test('recommendRecipesFromShelf and evaluateVoiceBrain recommend Pani Puri & dishes strictly from stocked shelf items, add recipe bundles, and recall past conversations', () => {
  // 1. When shelf is empty, recommendRecipesFromShelf returns 0 recipes and never auto-hydrates shelf
  const emptyRecs = recommendRecipesFromShelf([], 'Aaj main khane mein kya banao?');
  assert.equal(emptyRecs.length, 0);

  const emptyBrain = evaluateVoiceBrain('Aaj main khane mein kya banao?', {
    shelf: [],
    cart: [],
    orders: [],
    cashbook: [],
    khata: [],
    registeredStores: [],
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(emptyBrain.intents.includes('recipe_recommendation'), true);
  assert.equal(emptyBrain.cartMutations.length, 0);
  assert.equal(emptyBrain.reply.includes('0 items'), true);

  // 2. When DEFAULT_KIRANA_CATALOG (18 SKUs including Pani Puri kit) is stocked on the shelf
  const fullRecs = recommendRecipesFromShelf(
    DEFAULT_KIRANA_CATALOG,
    'Aaj main khane mein kya banao pani puri?'
  );
  assert.equal(fullRecs.length > 0, true);
  assert.equal(fullRecs[0].id, 'rec_pani_puri');
  assert.equal(fullRecs[0].availableIngredients.length, 4);

  // 3. Asking "Aaj main khane mein kya banao?" with stocked shelf returns dish recommendations
  const mealBrain = evaluateVoiceBrain('Aaj main khane mein kya banao?', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    orders: [],
    cashbook: [],
    khata: [],
    registeredStores: [],
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(mealBrain.intents.includes('recipe_recommendation'), true);
  assert.equal((mealBrain.recommendedRecipes?.length || 0) > 0, true);

  // 4. Asking "Pani puri ka saara saman add kar do" adds all 4 Pani Puri items to cart
  const bundleBrain = evaluateVoiceBrain('Pani puri ka saara saman add kar do', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    orders: [],
    cashbook: [],
    khata: [],
    registeredStores: [],
    memory: mealBrain.updatedMemory,
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(bundleBrain.intents.includes('recipe_bundle_add'), true);
  assert.equal(bundleBrain.cartMutations.length, 4);

  // 5. Asking "Tumhe mera pichla conversation yaad hai?" recalls past turns & recommended recipes
  const recallBrain = evaluateVoiceBrain('Tumhe mera pichla conversation yaad hai?', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    orders: [],
    cashbook: [],
    khata: [],
    registeredStores: [],
    memory: bundleBrain.updatedMemory,
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(recallBrain.intents.includes('memory_recall'), true);
  assert.equal(recallBrain.reply.includes('Aarush'), true);
});

test('calculateUpdatedStoreRating calculates Bayesian weighted rating and updates review counts and user ratings map', () => {
  const initialStore: RegisteredStore = {
    id: 'store_sharma',
    storeName: 'Sharma General Kirana Store',
    ownerName: 'Rajesh Sharma',
    phone: '9822012345',
    address: 'Near Ram Mandir, Sitabuldi Main Market, Nagpur',
    lat: 21.1458,
    lng: 79.0882,
    rating: 4.8,
    reviewCount: 42,
  };

  // 1. Customer rates 5 stars
  const updated1 = calculateUpdatedStoreRating(initialStore, 5, 'cust_9876543210');
  assert.equal(updated1.reviewCount, 43);
  assert.equal(typeof updated1.rating === 'number' && updated1.rating >= 4.8 && updated1.rating <= 5.0, true);
  assert.equal(updated1.userRatings?.['cust_9876543210'], 5);

  // 2. Same customer updates their rating to 4 stars (reviewCount should not double count)
  const updated2 = calculateUpdatedStoreRating(updated1, 4, 'cust_9876543210');
  assert.equal(updated2.reviewCount, 43);
  assert.equal(updated2.userRatings?.['cust_9876543210'], 4);

  // 3. New customer rates 5 stars
  const updated3 = calculateUpdatedStoreRating(updated2, 5, 'cust_9123456789');
  assert.equal(updated3.reviewCount, 44);
  assert.equal(updated3.userRatings?.['cust_9123456789'], 5);
});

test('evaluateVoiceBrain handles exact user prompt "Aaj mein Khan mein Kya Banao" and recommends Pani Puri recipe from stock', () => {
  const result = evaluateVoiceBrain('Aaj mein Khan mein Kya Banao', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    orders: [],
    cashbook: [],
    khata: [],
    registeredStores: [],
    auth: { role: 'customer', name: 'Aarush Dixit', phone: '9876543210' },
  });

  assert.equal(result.intents.includes('recipe_recommendation'), true);
  assert.equal(result.recommendedRecipes && result.recommendedRecipes.length > 0, true);
  const paniPuri = result.recommendedRecipes?.find((r) => r.id === 'rec_pani_puri');
  assert.equal(Boolean(paniPuri), true);
  assert.equal(paniPuri?.availableIngredients.length, 4);
  assert.equal(result.reply.includes('Pani Puri') || result.reply.includes('paneer') || result.reply.includes('Dal Tadka'), true);
});

test('evaluateVoiceBrain generates order history summary with total spending and order count for Hinglish prompt', () => {
  const sampleOrders: OrderRecord[] = [
    {
      id: '#1001',
      customerName: 'Aarush',
      items: '2 pack Aashirvaad Atta 5kg',
      total: 490,
      status: 'Delivered',
      createdAt: '10:00 AM',
    },
    {
      id: '#1002',
      customerName: 'Aarush',
      items: '1 pack Tata Salt 1kg',
      total: 25,
      status: 'Packed',
      createdAt: '11:00 AM',
    },
  ];

  const result = evaluateVoiceBrain('Mere pichle orders ki summary batao', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    orders: sampleOrders,
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });

  assert.equal(result.intents.includes('order_status_query'), true);
  assert.equal(result.reply.includes('kul 2 order(s)'), true);
  assert.equal(result.reply.includes('total spending ₹515'), true);
  assert.equal(result.spokenReply.includes('515 rupaye'), true);
});

test('evaluateVoiceBrain sets shouldPlaceOrder=true when user speaks "Confirm", "Confirm order", or "Haan confirm"', () => {
  const sampleCart = [
    {
      id: 'sku_atta_5kg',
      name: 'Aashirvaad Shuddh Chakki Atta 5kg',
      category: 'Grocery',
      stock: 10,
      qty: 1,
      mrp: 280,
      price: 245,
      unit: 'pack',
      emoji: '🌾',
    },
  ];

  // Test standalone "Confirm"
  const res1 = evaluateVoiceBrain('Confirm', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: sampleCart,
    orders: [],
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(res1.shouldPlaceOrder, true);
  assert.equal(res1.intents.includes('checkout_confirm'), true);

  // Test "Haan confirm karo"
  const res2 = evaluateVoiceBrain('Haan confirm karo', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: sampleCart,
    orders: [],
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(res2.shouldPlaceOrder, true);

  // Test empty cart guard
  const resEmpty = evaluateVoiceBrain('Confirm order', {
    shelf: DEFAULT_KIRANA_CATALOG,
    cart: [],
    orders: [],
    auth: { role: 'customer', name: 'Aarush', phone: '9876543210' },
  });
  assert.equal(resEmpty.shouldPlaceOrder, false);
  assert.equal(resEmpty.reply.includes('khali hai'), true);
});





