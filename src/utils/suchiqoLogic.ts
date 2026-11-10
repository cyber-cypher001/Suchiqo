export type ThemeMode = 'saffron' | 'oled';
export type RouteKey =
  | 'home'
  | 'how-it-works'
  | 'for-shopkeepers'
  | 'contact'
  | 'login'
  | 'customer'
  | 'shopkeeper'
  | 'profile'
  | 'creator-vault'
  | '404';

export type UserRole = 'customer' | 'shopkeeper';

export const CREATOR_EMAIL = 'aarushdixit2710@gmail.com';
export const CREATOR_ACCESS_CODE = 'SUCHIQO-CREATOR-2026';

export interface AuthSession {
  role: UserRole;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  storeName?: string;
  memberSince?: string;
  customerId?: string;
}

export interface RegisteredCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  flatOrHouse: string;
  areaOrStreet: string;
  landmark: string;
  city: string;
  pincode: string;
  addressTag: 'Home' | 'Work' | 'Other';
  formattedAddress: string;
  dietaryPreference?: 'all' | 'pure_veg';
  createdAt: string;
  registeredAt?: string;
  lastLoginAt?: string;
}

export interface PersistentVoiceTurn {
  id: string;
  timestamp: string;
  userText: string;
  agentReply: string;
  intents: string[];
  recipeSuggested?: string;
}

export interface CustomerConversationProfile {
  customerKey: string;
  customerName: string;
  customerPhone: string;
  phone?: string;
  turns: PersistentVoiceTurn[];
  lastReferencedSkuIds?: string[];
  lastRecommendedRecipe?: string | null;
  lastRecommendedRecipes?: string[];
  favoriteItemNames: string[];
  favoriteItems?: string[];
  updatedAt: string;
}

export interface BackendAuditLogEntry {
  id: string;
  timestamp: string;
  category: 'customer_auth' | 'store_registry' | 'order' | 'voice_brain' | 'creator_admin' | 'inventory';
  actor: string;
  summary: string;
}

export interface LocalDatabaseSnapshot {
  version: string;
  creatorEmail: string;
  updatedAt: string;
  registeredCustomers: RegisteredCustomer[];
  registeredStores: RegisteredStore[];
  shelf: ShelfItem[];
  orders: OrderRecord[];
  khata: KhataEntry[];
  cashbook: CashbookEntry[];
  customerVoiceProfiles: Record<string, CustomerConversationProfile>;
  auditLogs: BackendAuditLogEntry[];
}

export interface RegisteredStore {
  id: string;
  storeName: string;
  ownerName: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  gstin?: string;
  upiVpa?: string;
  isOpenForVoice?: boolean;
  createdAt?: string;
  rating?: number;
  reviewCount?: number;
  userRatings?: Record<string, number>;
}

/**
 * Calculates updated average 5-star rating and review count for a Kirana store.
 */
export function calculateUpdatedStoreRating(
  store: RegisteredStore,
  newRating: number,
  userKey = 'customer'
): RegisteredStore {
  const cleanScore = Math.max(1, Math.min(5, Math.round(newRating)));
  const isExistingUser = Boolean(store.userRatings && store.userRatings[userKey] !== undefined);
  const userRatings = { ...(store.userRatings || {}) };
  userRatings[userKey] = cleanScore;

  const ratingsList = Object.values(userRatings);
  const baseRating = store.rating !== undefined ? store.rating : 4.9;
  const baseReviews = store.reviewCount !== undefined ? store.reviewCount : 124;

  // Weighted Bayesian average with neighborhood prior
  const weight = 15;
  const newAvg = Number(
    (
      (ratingsList.reduce((sum, r) => sum + r, 0) + baseRating * weight) /
      (ratingsList.length + weight)
    ).toFixed(1)
  );

  return {
    ...store,
    rating: Math.min(5.0, Math.max(1.0, newAvg)),
    reviewCount: isExistingUser ? baseReviews : baseReviews + 1,
    userRatings,
  };
}

export interface ShelfItem {
  id: string;
  name: string;
  category: string;
  mrp: number;
  price: number;
  stock: number;
  unit: string;
  emoji: string;
  isPureVeg?: boolean;
  hsn?: string;
}

export interface CartItem extends ShelfItem {
  qty: number;
}

export type PaymentModeId = 'upi' | 'cod' | 'udhaar_khata' | 'card_pos';

export interface PaymentModeOption {
  id: PaymentModeId;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
}

export const PAYMENT_MODES: PaymentModeOption[] = [
  {
    id: 'upi',
    label: 'UPI Instant Pay (GPay / PhonePe / Paytm)',
    shortLabel: 'UPI Instant',
    badge: 'ZERO FEE • INSTANT',
    description: 'Pay instantly via Google Pay, PhonePe, Paytm, or any BHIM UPI ID.',
  },
  {
    id: 'cod',
    label: 'Cash on Delivery (Pay at Doorstep)',
    shortLabel: 'Cash on Delivery',
    badge: 'DOORSTEP CASH / QR',
    description: 'Pay cash or scan store QR code when your kirana bag arrives at your door.',
  },
  {
    id: 'udhaar_khata',
    label: 'Digital Udhaar Khata (Monthly Kirana Credit)',
    shortLabel: 'Udhaar Khata',
    badge: '0% INTEREST CREDIT',
    description: 'Add bill directly to your trusted neighborhood shopkeeper Udhaar Khata ledger.',
  },
  {
    id: 'card_pos',
    label: 'Card / Tap POS on Delivery',
    shortLabel: 'Card at Doorstep',
    badge: 'DEBIT / CREDIT CARD',
    description: 'Swipe or tap your RuPay, Visa, or Mastercard on the rider POS machine.',
  },
];

export interface DeliverySlotOption {
  id: string;
  label: string;
  windowText: string;
  tag: string;
  etaNote: string;
}

export const DELIVERY_TIME_SLOTS: DeliverySlotOption[] = [
  {
    id: 'instant-15m',
    label: 'Instant Express Delivery',
    windowText: 'Within 10–15 Mins',
    tag: 'FASTEST',
    etaNote: 'Dispatched immediately from nearest kirana counter',
  },
  {
    id: 'morning-7-9',
    label: 'Morning Milk & Breakfast Slot',
    windowText: '7:00 AM – 9:00 AM',
    tag: 'MORNING',
    etaNote: 'Fresh dairy, bread, and morning essentials',
  },
  {
    id: 'midday-12-2',
    label: 'Mid-Day Kitchen Slot',
    windowText: '12:00 PM – 2:00 PM',
    tag: 'AFTERNOON',
    etaNote: 'Lunch groceries, staples, and fresh supplies',
  },
  {
    id: 'evening-5-7',
    label: 'Evening Chai & Snacks Slot',
    windowText: '5:00 PM – 7:00 PM',
    tag: 'EVENING',
    etaNote: 'Evening tea, snacks, and after-work delivery',
  },
  {
    id: 'night-8-10',
    label: 'Night Dinner & Ration Slot',
    windowText: '8:00 PM – 10:00 PM',
    tag: 'NIGHT',
    etaNote: 'Convenient post-office dinner & monthly ration slot',
  },
  {
    id: 'custom',
    label: 'Custom Date & Time Schedule',
    windowText: 'Pick Exact Date & Time',
    tag: 'CUSTOM',
    etaNote: 'Schedule for a specific date, time, or recurring frequency',
  },
];

export interface OrderScheduleConfig {
  mode: 'instant' | 'scheduled';
  slotId: string;
  slotLabel: string;
  customDate: string;
  customTime: string;
  recurring: 'none' | 'daily' | 'weekly';
  instructions: string;
}

export interface CustomerDeliveryAddress {
  id: string;
  tag: 'Home' | 'Work' | 'Other';
  customLabel?: string;
  customTagLabel?: string;
  flatOrHouse: string;
  flatHouseNo?: string;
  areaOrStreet: string;
  areaStreet?: string;
  landmark: string;
  receiverName: string;
  receiverPhone: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
}

export function formatDeliveryAddressSummary(addr: CustomerDeliveryAddress): string {
  const customTag = addr.customLabel || addr.customTagLabel;
  const tagLabel = addr.tag === 'Other' && customTag ? customTag : addr.tag;
  const flatPart = addr.flatOrHouse || addr.flatHouseNo || '';
  const areaPart = addr.areaOrStreet || addr.areaStreet || '';
  const parts = [flatPart, areaPart].filter(Boolean).join(', ');
  const cleanLm = (addr.landmark || '').trim();
  const lmFormatted = cleanLm
    ? /^near\b/i.test(cleanLm)
      ? cleanLm
      : `Near ${cleanLm}`
    : '';
  const landmarkPart = lmFormatted ? ` (${lmFormatted})` : '';
  return `${tagLabel}: ${parts}${landmarkPart}`;
}

export type CustomerStorefrontTab =
  | 'shelf'
  | 'payment'
  | 'schedule'
  | 'addresses'
  | 'history'
  | 'tracking';

export interface OrderLineItem {
  skuId: string;
  name: string;
  qty: number;
  unit: string;
  mrp: number;
  price: number;
  emoji?: string;
  hsn?: string;
}

export type OrderFulfillmentStage =
  | 'Pending'
  | 'Packed'
  | 'Packing'
  | 'Out for Delivery'
  | 'Delivered';

export interface OrderRecord {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: OrderFulfillmentStage;
  createdAt: string;
  paymentMode?: string;
  scheduledFor?: string;
  deliveryAddress?: string;
  storeName?: string;
  handoverOtp?: string;
  voiceTranscript?: string;
  mrpSavings?: number;
  lineItems?: OrderLineItem[];
}

export interface CashbookEntry {
  id: string;
  note: string;
  type: 'income' | 'expense';
  amount: number;
  createdAt: string;
}

export interface KhataEntry {
  id: string;
  customerName: string;
  phone: string;
  type: 'udhaar' | 'jama';
  amount: number;
  note: string;
  createdAt: string;
}

export const VALID_ROUTES: RouteKey[] = [
  'home',
  'how-it-works',
  'for-shopkeepers',
  'contact',
  'login',
  'customer',
  'shopkeeper',
  'profile',
  'creator-vault',
  '404',
];

export const PROTECTED_ROLES: Partial<Record<RouteKey, UserRole>> = {
  customer: 'customer',
  shopkeeper: 'shopkeeper',
};

/**
 * Reference Kirana Catalog used by the Gnani Semantic Mapping Brain
 * so voice queries, recipe recommendations, and multi-item orders recognize Indian kirana & chaat items.
 */
export const DEFAULT_KIRANA_CATALOG: ShelfItem[] = [
  {
    id: 'sku_atta_5kg',
    name: 'Aashirvaad Atta 5kg',
    category: 'Atta, Rice & Dal',
    mrp: 280,
    price: 245,
    stock: 25,
    unit: 'pack',
    emoji: '🌾',
  },
  {
    id: 'sku_salt_1kg',
    name: 'Tata Salt 1kg',
    category: 'Spices & Oil',
    mrp: 30,
    price: 25,
    stock: 40,
    unit: 'pack',
    emoji: '🧂',
  },
  {
    id: 'sku_milk_1l',
    name: 'Amul Taaza Milk 1L',
    category: 'Dairy & Bread',
    mrp: 60,
    price: 56,
    stock: 30,
    unit: 'pack',
    emoji: '🥛',
  },
  {
    id: 'sku_rice_5kg',
    name: 'India Gate Basmati Rice 5kg',
    category: 'Atta, Rice & Dal',
    mrp: 520,
    price: 465,
    stock: 18,
    unit: 'pack',
    emoji: '🍚',
  },
  {
    id: 'sku_oil_1l',
    name: 'Fortune Sunlite Oil 1L',
    category: 'Spices & Oil',
    mrp: 165,
    price: 145,
    stock: 22,
    unit: 'L',
    emoji: '🌻',
  },
  {
    id: 'sku_dal_1kg',
    name: 'Tata Sampann Toor Dal 1kg',
    category: 'Atta, Rice & Dal',
    mrp: 195,
    price: 172,
    stock: 20,
    unit: 'kg',
    emoji: '🍲',
  },
  {
    id: 'sku_sugar_1kg',
    name: 'Madhur Pure Sugar 1kg',
    category: 'Atta, Rice & Dal',
    mrp: 60,
    price: 52,
    stock: 35,
    unit: 'kg',
    emoji: '🍬',
  },
  {
    id: 'sku_tea_500g',
    name: 'Tata Tea Gold 500g',
    category: 'Snacks & Beverages',
    mrp: 310,
    price: 285,
    stock: 16,
    unit: 'pack',
    emoji: '☕',
  },
  {
    id: 'sku_maggi_4pk',
    name: 'Maggi Masala Noodles 4-Pack',
    category: 'Snacks & Beverages',
    mrp: 60,
    price: 55,
    stock: 32,
    unit: 'pack',
    emoji: '🍜',
  },
  {
    id: 'sku_butter_100g',
    name: 'Amul Pasteurised Butter 100g',
    category: 'Dairy & Bread',
    mrp: 60,
    price: 56,
    stock: 24,
    unit: 'pack',
    emoji: '🧈',
  },
  {
    id: 'sku_biscuit_pk',
    name: 'Britannia Good Day Cookies',
    category: 'Snacks & Beverages',
    mrp: 40,
    price: 35,
    stock: 40,
    unit: 'pack',
    emoji: '🍪',
  },
  {
    id: 'sku_masala_100g',
    name: 'Everest Garam Masala 100g',
    category: 'Spices & Oil',
    mrp: 92,
    price: 82,
    stock: 28,
    unit: 'pack',
    emoji: '🌶️',
  },
  {
    id: 'sku_panipuri_kit',
    name: 'Haldiram Pani Puri Golgappa Packet 50pcs',
    category: 'Snacks & Beverages',
    mrp: 75,
    price: 60,
    stock: 30,
    unit: 'pack',
    emoji: '🥙',
  },
  {
    id: 'sku_panipuri_masala',
    name: 'Everest Pani Puri & Jaljeera Masala 100g',
    category: 'Spices & Oil',
    mrp: 55,
    price: 45,
    stock: 25,
    unit: 'pack',
    emoji: '🌿',
  },
  {
    id: 'sku_boondi_sev',
    name: 'Haldiram Crispy Boondi & Sev Chaat Mix 200g',
    category: 'Snacks & Beverages',
    mrp: 65,
    price: 52,
    stock: 28,
    unit: 'pack',
    emoji: '🥣',
  },
  {
    id: 'sku_imli_chutney',
    name: 'Pichkoo Sweet Tamarind Imli Chutney 250g',
    category: 'Spices & Oil',
    mrp: 85,
    price: 70,
    stock: 20,
    unit: 'pack',
    emoji: '🍯',
  },
  {
    id: 'sku_paneer_200g',
    name: 'Amul Fresh Malai Paneer 200g',
    category: 'Dairy & Bread',
    mrp: 95,
    price: 86,
    stock: 18,
    unit: 'pack',
    emoji: '🧀',
  },
  {
    id: 'sku_poha_500g',
    name: 'Rajdhani Indori Thick Poha 500g',
    category: 'Atta, Rice & Dal',
    mrp: 58,
    price: 48,
    stock: 25,
    unit: 'pack',
    emoji: '🥣',
  },
];

/**
 * Haversine distance calculation in kilometers (rounded to 1 decimal place)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Estimates delivery ETA in minutes from distance in km
 */
export function calculateDeliveryEtaMinutes(distanceKm: number): number {
  return Math.max(5, Math.round(distanceKm * 7 + 4));
}

/**
 * Normalizes route key, falling back to '404'
 */
export function normalizeRoute(raw: string): RouteKey {
  const cleaned = raw.replace(/^#\/?/, '').trim().toLowerCase();
  if (!cleaned) return 'home';
  return VALID_ROUTES.includes(cleaned as RouteKey)
    ? (cleaned as RouteKey)
    : '404';
}

/**
 * Checks whether current auth session can access a given route
 */
export function canAccessRoute(
  routeKey: RouteKey,
  auth: AuthSession | null
): boolean {
  if (routeKey === 'profile') {
    return auth !== null;
  }
  const reqRole = PROTECTED_ROLES[routeKey];
  if (!reqRole) return true;
  if (!auth || auth.role !== reqRole) return false;
  return true;
}

/**
 * Parses Hinglish number words and digits from a voice/text phrase
 */
const HINGLISH_NUMBERS: Record<string, number> = {
  ek: 1,
  one: 1,
  single: 1,
  do: 2,
  two: 2,
  dono: 2,
  teen: 3,
  three: 3,
  char: 4,
  chaar: 4,
  four: 4,
  paanch: 5,
  panch: 5,
  five: 5,
  che: 6,
  chhe: 6,
  six: 6,
  saat: 7,
  seven: 7,
  aath: 8,
  eight: 8,
  nau: 9,
  nine: 9,
  das: 10,
  ten: 10,
  gyarah: 11,
  barah: 12,
  aadha: 1,
  pao: 1,
  dedh: 2,
  dhai: 2,
};

export function extractHinglishQuantity(phrase: string): number {
  const lower = phrase
    .toLowerCase()
    .replace(/\b(de|la|bhej|kar|hata|nikal|rakh|daal|dal)\s+do\b/g, '$1');
  const digitMatch = lower.match(/\b(\d+)\b/);
  if (digitMatch) {
    const val = parseInt(digitMatch[1], 10);
    if (val > 0) return val;
  }
  const tokens = lower.split(/[\s,.-]+/);
  for (const token of tokens) {
    if (HINGLISH_NUMBERS[token] !== undefined) {
      return HINGLISH_NUMBERS[token];
    }
  }
  return 1;
}

/**
 * Synonym & Phonetic Alias Map for Kirana SKUs
 * Maps Hindi/Indic/English colloquial terms to canonical tokens found in SKU names.
 */
const KIRANA_ALIAS_GROUPS: Array<{ canonical: string; aliases: string[] }> = [
  {
    canonical: 'atta',
    aliases: ['atta', 'aata', 'gehu', 'wheat', 'flour', 'aashirvaad', 'ashirvad', 'ashirwad', 'chapati'],
  },
  {
    canonical: 'salt',
    aliases: ['salt', 'namak', 'tata salt', 'iodized', 'sendha'],
  },
  {
    canonical: 'milk',
    aliases: ['milk', 'doodh', 'dudh', 'taaza', 'amul milk', 'toned'],
  },
  {
    canonical: 'rice',
    aliases: ['rice', 'chawal', 'basmati', 'india gate', 'daawat', 'biryani rice'],
  },
  {
    canonical: 'oil',
    aliases: ['oil', 'tel', 'sunlite', 'fortune', 'sunflower', 'mustard', 'cooking oil'],
  },
  {
    canonical: 'dal',
    aliases: ['dal', 'daal', 'toor', 'arhar', 'moong', 'masoor', 'lentil', 'sampann'],
  },
  {
    canonical: 'sugar',
    aliases: ['sugar', 'cheeni', 'chini', 'shakkar', 'madhur'],
  },
  {
    canonical: 'tea',
    aliases: ['tea', 'chai', 'chay', 'patti', 'chai patti', 'tata tea', 'red label'],
  },
  {
    canonical: 'maggi',
    aliases: ['maggi', 'maggie', 'noodles', 'noodle', 'instant noodles'],
  },
  {
    canonical: 'butter',
    aliases: ['butter', 'makhan', 'makkhan', 'amul butter'],
  },
  {
    canonical: 'cookies',
    aliases: ['biscuit', 'biscuits', 'cookie', 'cookies', 'good day', 'britannia', 'parle'],
  },
  {
    canonical: 'masala',
    aliases: ['garam masala', 'everest garam', 'spices', 'mirch', 'haldi'],
  },
  {
    canonical: 'pani',
    aliases: ['pani puri', 'panipuri', 'golgappa', 'golgappe', 'puchka', 'gupchup', 'puri packet'],
  },
  {
    canonical: 'jaljeera',
    aliases: ['pani puri masala', 'jaljeera', 'jaljira', 'chaat masala'],
  },
  {
    canonical: 'boondi',
    aliases: ['boondi', 'bundi', 'sev', 'bhel', 'namkeen'],
  },
  {
    canonical: 'imli',
    aliases: ['imli', 'tamarind', 'pichkoo', 'meethi chutney', 'chutney'],
  },
  {
    canonical: 'paneer',
    aliases: ['paneer', 'malai paneer', 'cottage cheese', 'amul paneer'],
  },
  {
    canonical: 'poha',
    aliases: ['poha', 'indori poha', 'chivda', 'flattened rice'],
  },
];

/**
 * Matches a text fragment against a list of ShelfItems using exact words + Hinglish alias groups
 */
export function matchSkusInText(
  text: string,
  catalog: ShelfItem[]
): Array<{ sku: ShelfItem; qty: number; matchIndex: number }> {
  const cleanText = text
    .toLowerCase()
    .replace(/\b(de|la|bhej|kar|hata|nikal|rakh|daal|dal)\s+do\b/g, '$1');

  // Count token frequency across catalog so shared brand tokens (e.g. "tata", "amul")
  // do not falsely match every product of that brand when the user specifies "Tata Salt" or "Amul Milk".
  const tokenFreq = new Map<string, number>();
  for (const sku of catalog) {
    const words = sku.name
      .toLowerCase()
      .split(/[\s-]+/)
      .filter((w) => w.length >= 3 && !/^\d+(kg|g|l|ml|pk|pack|pcs)$/i.test(w));
    for (const w of new Set(words)) {
      tokenFreq.set(w, (tokenFreq.get(w) || 0) + 1);
    }
  }

  const STOP_SKU_TOKENS = new Set([
    'pack',
    'packet',
    'pcs',
    '50pcs',
    'pure',
    'gold',
    'taaza',
    'sunlite',
    'sampann',
    'pasteurised',
    'good',
    'day',
    'india',
    'gate',
    'masala', // handled via alias group unless full match
    'haldiram',
    'everest',
    'thick',
    'fresh',
    'sweet',
    'crispy',
    'mix',
    'chaat',
  ]);

  const results: Array<{ sku: ShelfItem; qty: number; matchIndex: number }> = [];
  const matchedIds = new Set<string>();

  for (const sku of catalog) {
    const skuLower = sku.name.toLowerCase();
    // Distinctive words for this SKU (appearing only once in catalog and not generic modifiers)
    const skuWords = skuLower
      .split(/[\s-]+/)
      .filter(
        (w) =>
          w.length >= 3 &&
          !/^\d+(kg|g|l|ml|pk|pack|pcs)$/i.test(w) &&
          (tokenFreq.get(w) || 0) <= 1 &&
          !STOP_SKU_TOKENS.has(w)
      );

    let matchPos = cleanText.indexOf(skuLower);

    if (matchPos === -1) {
      for (const word of skuWords) {
        const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        const m = wordRegex.exec(cleanText);
        if (m) {
          matchPos = m.index;
          break;
        }
      }
    }

    if (matchPos === -1) {
      // Check alias groups where this SKU contains the group's canonical head noun
      for (const group of KIRANA_ALIAS_GROUPS) {
        const canonicalRegex = new RegExp(`\\b${group.canonical}\\b`, 'i');
        const skuBelongsToGroup = canonicalRegex.test(skuLower);
        if (!skuBelongsToGroup) continue;

        for (const alias of group.aliases) {
          const aliasRegex = new RegExp(
            `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'i'
          );
          const m = aliasRegex.exec(cleanText);
          if (m) {
            matchPos = m.index;
            break;
          }
        }
        if (matchPos !== -1) break;
      }
    }

    if (matchPos !== -1 && !matchedIds.has(sku.id)) {
      matchedIds.add(sku.id);
      // Extract local quantity in the window immediately before or after this SKU match
      const windowStart = Math.max(0, matchPos - 26);
      const beforeSlice = cleanText.slice(windowStart, matchPos);
      // Only take text after the last comma/conjunction in beforeSlice
      const localBefore = beforeSlice.split(/(?:,|\baur\b|\band\b|\bplus\b|\bphir\b)/).pop() || '';
      const afterSlice = cleanText.slice(matchPos, Math.min(cleanText.length, matchPos + skuLower.length + 20));
      const localAfter = afterSlice.split(/(?:,|\baur\b|\band\b|\bplus\b|\bphir\b)/)[0] || '';

      // Strip unit numbers like 5kg, 1kg, 100g, 4-pack so they aren't mistaken for order quantity
      const sanitizeUnits = (s: string) =>
        s.replace(/\b\d+\s*(?:kg|g|gm|ml|l|ltr|litre|pack|pk)\b/gi, '');

      const localContext = `${sanitizeUnits(localBefore)} ${sanitizeUnits(localAfter)}`;
      const localQty = extractHinglishQuantity(localContext);

      results.push({
        sku,
        qty: localQty,
        matchIndex: matchPos,
      });
    }
  }

  return results.sort((a, b) => a.matchIndex - b.matchIndex);
}

/**
 * Evaluates a Hinglish voice/text intent against the current shelf and auth state
 * (Maintains backward compatibility with unit tests while delegating to multi-item matching)
 */
export interface VoiceIntentOutcome {
  action: 'stock_query' | 'gps_trigger' | 'cart_add' | 'auth_required' | 'unmatched';
  reply: string;
  matchedSku?: ShelfItem;
  qty: number;
}

export function evaluateHinglishVoiceIntent(
  rawPhrase: string,
  shelf: ShelfItem[],
  auth: AuthSession | null
): VoiceIntentOutcome {
  const phrase = String(rawPhrase || '').trim();
  const lower = phrase.toLowerCase();
  const qty = extractHinglishQuantity(phrase);

  const skuMatches = shelf.length > 0 ? matchSkusInText(phrase, shelf) : [];

  // If the user explicitly asks about general stock without ordering a specific matched item
  if (
    (lower.includes('kya mil') ||
      lower.includes('stock') ||
      lower.includes('available') ||
      lower.includes('list') ||
      lower.includes('dukaan')) &&
    (skuMatches.length === 0 ||
      lower.includes('kya') ||
      lower.includes('stock') ||
      lower.includes('available'))
  ) {
    if (shelf.length === 0) {
      return {
        action: 'stock_query',
        reply:
          'Dukaan ke shelf par abhi koi product publish nahi kiya gaya hai. Shopkeeper Console mein naye items add karein.',
        qty: 0,
      };
    }
    const itemsList = shelf.map((s) => `${s.name} (₹${s.price})`).join(', ');
    return {
      action: 'stock_query',
      reply: `Dukaan par yeh items stock mein hain: ${itemsList}`,
      qty: 0,
    };
  }

  if (
    lower.includes('location') ||
    lower.includes('map') ||
    lower.includes('gps') ||
    lower.includes('kahan')
  ) {
    return {
      action: 'gps_trigger',
      reply: 'Aapki live GPS location detect ki ja rahi hai!',
      qty: 0,
    };
  }

  if (skuMatches.length > 0) {
    const first = skuMatches[0];
    const resolvedQty = first.qty || qty;
    if (auth?.role === 'customer') {
      const clampedQty = Math.min(resolvedQty, Math.max(1, first.sku.stock));
      return {
        action: 'cart_add',
        matchedSku: first.sku,
        qty: clampedQty,
        reply: `${clampedQty}× ${first.sku.name} aapke cart mein add kar diya gaya hai!`,
      };
    } else {
      return {
        action: 'auth_required',
        matchedSku: first.sku,
        qty: resolvedQty,
        reply: `${first.sku.name} dukaan ke catalog mein uplabdh hai. Order karne ke liye Customer Portal mein Sign In karein.`,
      };
    }
  }

  return {
    action: 'unmatched',
    qty: 0,
    reply: `Voice AI Connected: "${phrase}". Kripya store catalog mein published item ka naam bolein.`,
  };
}

/**
 * ============================================================================
 * GNANI SEMANTIC MAPPING BRAIN (Multi-Question & Multi-Input Conversational Engine)
 * ============================================================================
 */
export type VoiceBrainIntentType =
  | 'stock_query'
  | 'price_query'
  | 'cart_add'
  | 'cart_remove'
  | 'cart_clear'
  | 'cart_query'
  | 'checkout_confirm'
  | 'order_status_query'
  | 'delivery_query'
  | 'payment_query'
  | 'payment_select'
  | 'schedule_order'
  | 'address_select'
  | 'store_info_query'
  | 'profile_input'
  | 'erp_mutation'
  | 'gps_trigger'
  | 'navigate_route'
  | 'followup_answer'
  | 'greeting_help'
  | 'recipe_recommendation'
  | 'recipe_bundle_add'
  | 'memory_recall'
  | 'item_unavailable'
  | 'unmatched';

export interface RecipeRecommendation {
  id: string;
  dishName: string;
  title: string;
  emoji: string;
  hinglishTagline: string;
  hinglishPitch: string;
  prepTime: string;
  prepTimeMinutes: number;
  availableIngredients: ShelfItem[];
  missingIngredientHints: string[];
  missingIngredientNames: string[];
  bundlePrice: number;
  estimatedBundleCost: number;
  matchScore: number;
}

interface RecipeBlueprint {
  id: string;
  dishName: string;
  emoji: string;
  keywords: string[];
  hinglishTagline: string;
  prepTime: string;
  prepTimeMinutes: number;
  requiredKeywordGroups: Array<{ label: string; patterns: RegExp[] }>;
}

const KIRANA_RECIPE_BLUEPRINTS: RecipeBlueprint[] = [
  {
    id: 'rec_pani_puri',
    dishName: 'Chatpati Pani Puri / Golgappa Party',
    emoji: '🥙',
    keywords: ['pani puri', 'panipuri', 'golgappa', 'golgappe', 'puchka', 'chaat', 'chatpata'],
    hinglishTagline: 'Ghar par street-style teekha-meetha Pani Puri aur Chaat banayein!',
    prepTime: '10 Mins',
    prepTimeMinutes: 10,
    requiredKeywordGroups: [
      { label: 'Pani Puri / Golgappa Puris', patterns: [/pani\s*puri\s*golgappa|golgappa|puchka/i] },
      { label: 'Pani Puri / Jaljeera Masala', patterns: [/pani\s*puri.*masala|jaljeera/i] },
      { label: 'Crispy Boondi / Sev Mix', patterns: [/boondi|sev/i] },
      { label: 'Meethi Imli Chutney', patterns: [/imli|tamarind|pichkoo/i] },
    ],
  },
  {
    id: 'rec_dal_chawal',
    dishName: 'Garma-Garam Dal Tadka & Basmati Jeera Rice',
    emoji: '🍛',
    keywords: ['dal chawal', 'daal chawal', 'dal rice', 'tadka dal', 'lunch', 'dinner', 'khana', 'khane'],
    hinglishTagline: 'Comforting ghar ka Dal Chawal Tadka — lunch ya dinner ke liye best!',
    prepTime: '25 Mins',
    prepTimeMinutes: 25,
    requiredKeywordGroups: [
      { label: 'Toor / Arhar Dal', patterns: [/dal|daal|toor/i] },
      { label: 'Basmati Rice', patterns: [/rice|chawal|basmati/i] },
      { label: 'Cooking Oil / Butter', patterns: [/oil|tel|sunlite|butter|makhan/i] },
      { label: 'Garam Masala', patterns: [/garam\s*masala|everest\s*garam/i] },
      { label: 'Tata Salt', patterns: [/salt|namak/i] },
    ],
  },
  {
    id: 'rec_roti_paratha',
    dishName: 'Soft Phulka Roti / Crispy Butter Paratha Meal',
    emoji: '🫓',
    keywords: ['roti', 'chapati', 'paratha', 'phulka', 'dinner', 'lunch', 'khana', 'khane'],
    hinglishTagline: 'Aashirvaad Atta aur Amul Butter ke saath garma-garam Paratha ya Phulka!',
    prepTime: '20 Mins',
    prepTimeMinutes: 20,
    requiredKeywordGroups: [
      { label: 'Whole Wheat Atta', patterns: [/atta|aata|wheat|flour/i] },
      { label: 'Amul Butter / Sunlite Oil', patterns: [/butter|makhan|oil|tel/i] },
      { label: 'Tata Salt', patterns: [/salt|namak/i] },
      { label: 'Everest Masala', patterns: [/garam\s*masala|spices/i] },
    ],
  },
  {
    id: 'rec_butter_maggi',
    dishName: '2-Minute Street-Style Butter Masala Maggi',
    emoji: '🍜',
    keywords: ['maggi', 'noodles', 'nashta', 'snack', 'shaam', 'jhatpat', '2 minute', 'quick'],
    hinglishTagline: 'Jhatpat bhookh ke liye Amul Butter wali garma-garam Masala Maggi!',
    prepTime: '5 Mins',
    prepTimeMinutes: 5,
    requiredKeywordGroups: [
      { label: 'Maggi Masala Noodles', patterns: [/maggi|noodle/i] },
      { label: 'Amul Butter', patterns: [/butter|makhan/i] },
      { label: 'Extra Masala', patterns: [/garam\s*masala/i] },
    ],
  },
  {
    id: 'rec_shahi_paneer',
    dishName: 'Restaurant-Style Paneer Butter Masala',
    emoji: '🧀',
    keywords: ['paneer', 'shahi paneer', 'paneer butter', 'sabzi', 'special dinner'],
    hinglishTagline: 'Fresh Malai Paneer aur Amul Butter ke saath rich Paneer Butter Masala!',
    prepTime: '20 Mins',
    prepTimeMinutes: 20,
    requiredKeywordGroups: [
      { label: 'Fresh Malai Paneer', patterns: [/paneer/i] },
      { label: 'Amul Butter', patterns: [/butter|makhan/i] },
      { label: 'Garam Masala', patterns: [/garam\s*masala/i] },
      { label: 'Cooking Oil', patterns: [/oil|tel/i] },
      { label: 'Atta / Basmati Rice', patterns: [/atta|rice|chawal/i] },
    ],
  },
  {
    id: 'rec_chai_cookies',
    dishName: 'Kadak Masala Chai & Crispy Good Day Cookies',
    emoji: '☕',
    keywords: ['chai', 'tea', 'biscuit', 'cookies', 'subah', 'shaam', 'evening', 'breakfast'],
    hinglishTagline: 'Garma-garam Adrak/Masala Doodh Chai aur Britannia Good Day Cookies!',
    prepTime: '8 Mins',
    prepTimeMinutes: 8,
    requiredKeywordGroups: [
      { label: 'Tata Tea Gold', patterns: [/tea|chai/i] },
      { label: 'Amul Taaza Milk', patterns: [/milk|doodh/i] },
      { label: 'Madhur Sugar', patterns: [/sugar|cheeni/i] },
      { label: 'Good Day Cookies / Biscuits', patterns: [/cookie|biscuit|good\s*day/i] },
    ],
  },
  {
    id: 'rec_indori_poha',
    dishName: 'Indori Kanda Poha & Crispy Sev Nashta',
    emoji: '🥣',
    keywords: ['poha', 'nashta', 'breakfast', 'subah'],
    hinglishTagline: 'Halka aur swadisht Indori Poha upar se crispy Boondi/Sev ke saath!',
    prepTime: '12 Mins',
    prepTimeMinutes: 12,
    requiredKeywordGroups: [
      { label: 'Thick Poha', patterns: [/poha|chivda/i] },
      { label: 'Cooking Oil', patterns: [/oil|tel/i] },
      { label: 'Crispy Sev / Boondi', patterns: [/boondi|sev/i] },
      { label: 'Tata Salt', patterns: [/salt|namak/i] },
    ],
  },
];

/**
 * Evaluates live shopkeeper inventory (`shelf` with `stock > 0`) and recommends dishes/recipes
 * whose ingredients are actually available in the shopkeeper's stock right now.
 */
export function recommendRecipesFromShelf(
  shelf: ShelfItem[],
  rawQuery = ''
): RecipeRecommendation[] {
  const effectiveShelf = shelf.filter((s) => s.stock > 0);
  if (effectiveShelf.length === 0) return [];

  const queryLower = String(rawQuery || '').toLowerCase();
  const recommendations: RecipeRecommendation[] = [];

  for (const bp of KIRANA_RECIPE_BLUEPRINTS) {
    const matchedSkus: ShelfItem[] = [];
    const matchedSkuIds = new Set<string>();
    const missingHints: string[] = [];

    for (const group of bp.requiredKeywordGroups) {
      const found = effectiveShelf.find((sku) =>
        group.patterns.some((pat) => pat.test(sku.name) || pat.test(sku.category))
      );
      if (found) {
        if (!matchedSkuIds.has(found.id)) {
          matchedSkuIds.add(found.id);
          matchedSkus.push(found);
        }
      } else {
        missingHints.push(group.label);
      }
    }

    // Check if the primary signature ingredient (first group) or at least 2 ingredients are available
    const primaryGroup = bp.requiredKeywordGroups[0];
    const hasPrimaryIngredient =
      primaryGroup &&
      effectiveShelf.some((sku) =>
        primaryGroup.patterns.some((pat) => pat.test(sku.name) || pat.test(sku.category))
      );

    if (hasPrimaryIngredient || matchedSkus.length >= 2) {
      const explicitDishMention = bp.keywords.some((kw) => queryLower.includes(kw));
      const matchScore =
        (explicitDishMention ? 100 : 0) +
        (hasPrimaryIngredient ? 30 : 0) +
        matchedSkus.length * 15 -
        missingHints.length * 3;
      const bundleCost = matchedSkus.reduce((s, item) => s + item.price, 0);

      recommendations.push({
        id: bp.id,
        dishName: bp.dishName,
        title: bp.dishName,
        emoji: bp.emoji,
        hinglishTagline: bp.hinglishTagline,
        hinglishPitch: bp.hinglishTagline,
        prepTime: bp.prepTime,
        prepTimeMinutes: bp.prepTimeMinutes,
        availableIngredients: matchedSkus,
        missingIngredientHints: missingHints,
        missingIngredientNames: missingHints,
        bundlePrice: bundleCost,
        estimatedBundleCost: bundleCost,
        matchScore,
      });
    }
  }

  // If shopkeeper stocked custom items that didn't match standard blueprints, create a custom Chef's Basket recommendation
  if (recommendations.length === 0 && effectiveShelf.length > 0) {
    const topCustom = effectiveShelf.slice(0, 4);
    const customTitle = `Shopkeeper Special Kitchen Combo (${topCustom
      .map((i) => i.name.split(' ')[0])
      .join(' + ')})`;
    const customCost = topCustom.reduce((s, item) => s + item.price, 0);
    recommendations.push({
      id: 'rec_custom_shelf',
      dishName: customTitle,
      title: customTitle,
      emoji: '🍲',
      hinglishTagline: 'Dukaan ke fresh available stock se aaj ka special combo!',
      hinglishPitch: 'Dukaan ke fresh available stock se aaj ka special combo!',
      prepTime: '15 Mins',
      prepTimeMinutes: 15,
      availableIngredients: topCustom,
      missingIngredientHints: [],
      missingIngredientNames: [],
      bundlePrice: customCost,
      estimatedBundleCost: customCost,
      matchScore: 25,
    });
  }

  return recommendations.sort((a, b) => b.matchScore - a.matchScore);
}

export interface VoiceCartMutation {
  sku: ShelfItem;
  qty: number;
  mode: 'add' | 'remove' | 'set';
}

export interface VoiceProfileInput {
  role?: UserRole;
  name?: string;
  phone?: string;
  address?: string;
  storeName?: string;
  addressTag?: 'Home' | 'Work' | 'Other';
  landmark?: string;
}

export interface VoiceErpMutation {
  kind: 'add_sku' | 'add_cashbook' | 'add_khata';
  sku?: ShelfItem;
  cashbook?: Omit<CashbookEntry, 'id' | 'createdAt'>;
  khata?: Omit<KhataEntry, 'id' | 'createdAt'>;
}

export interface VoiceBrainStep {
  id: string;
  clause: string;
  intent: VoiceBrainIntentType;
  entityLabel: string;
  resolution: string;
  confidence: number;
}

export interface VoiceConversationMemory {
  lastReferencedSkuIds: string[];
  lastRecommendedRecipe?: string | null;
  pastTurnsSummary?: string[];
  pastTurns?: PersistentVoiceTurn[];
  customerName?: string;
  favoriteItemNames?: string[];
  favoriteItems?: string[];
  recommendedRecipesHistory?: string[];
  pendingQuestionTopic?:
    | 'confirm_add'
    | 'confirm_checkout'
    | 'ask_quantity'
    | 'ask_address'
    | null;
  turnCount: number;
}

export interface VoiceBrainContext {
  shelf: ShelfItem[];
  cart: CartItem[];
  orders?: OrderRecord[];
  auth: AuthSession | null;
  cashbook?: CashbookEntry[];
  khata?: KhataEntry[];
  registeredStores?: RegisteredStore[];
  memory?: VoiceConversationMemory;
  autoHydrateCatalog?: boolean;
  savedAddresses?: CustomerDeliveryAddress[];
  selectedPaymentMode?: PaymentModeId;
  orderSchedule?: OrderScheduleConfig;
}

export interface VoiceBrainResult {
  primaryAction: VoiceIntentOutcome['action'];
  intents: VoiceBrainIntentType[];
  reply: string;
  spokenReply: string;
  followUpPrompt: string | null;
  brainSteps: VoiceBrainStep[];
  cartMutations: VoiceCartMutation[];
  autoHydratedSkus: ShelfItem[];
  unavailableItemNames: string[];
  profileInput: VoiceProfileInput | null;
  erpMutations: VoiceErpMutation[];
  shouldClearCart: boolean;
  shouldPlaceOrder: boolean;
  navigateToRoute: RouteKey | null;
  switchCustomerTab: CustomerStorefrontTab | null;
  selectedPaymentMode?: PaymentModeId | null;
  scheduleUpdate?: Partial<OrderScheduleConfig> | null;
  selectedAddressTag?: 'Home' | 'Work' | 'Other' | null;
  recommendedRecipes?: RecipeRecommendation[];
  updatedMemory: VoiceConversationMemory;
  matchedSku?: ShelfItem;
  qty: number;
}

/**
 * Converts visual UI reply text (which may contain ₹, ×, /pack, parentheticals, and abbreviations)
 * into a warm, natural, human-spoken Hinglish script with realistic prosody and zero robotic symbols.
 */
export function humanizeTextForSpeech(rawText: string): string {
  let s = String(rawText || '').trim();
  if (!s) return '';

  // Convert parenthetical MRP/savings notes into natural spoken clauses
  s = s.replace(
    /\(\s*MRP\s*₹?\s*(\d+)\s*,\s*₹?\s*(\d+)\s*bachat\s*\)/gi,
    ', jis par aapko $2 rupaye ki bachat milti hai'
  );
  s = s.replace(
    /\(\s*MRP\s*par\s*₹?\s*(\d+)\s*bachat\s*\)/gi,
    ', aur is par aapki kul $1 rupaye ki bachat ho rahi hai'
  );
  s = s.replace(/\(\s*₹\s*(\d+)\s*\)/g, ', $1 rupaye,');

  // Remove remaining parentheses but keep inner words naturally separated by commas
  s = s.replace(/\(([^)]+)\)/g, ', $1,');

  // Replace multiplication symbol "2×" with natural spoken count
  s = s.replace(/(\d+)\s*[×x]\s*/g, '$1 packet ');

  // Replace rupee symbol "₹245" with "245 rupaye"
  s = s.replace(/₹\s*(\d+(?:\.\d+)?)/g, '$1 rupaye');

  // Replace "/pack", "/kg", "/L" with natural spoken Hindi/Hinglish units
  s = s.replace(/\/pack\b/gi, ' ka ek pack');
  s = s.replace(/\/kg\b/gi, ' prati kilo');
  s = s.replace(/\/l\b/gi, ' prati litre');
  s = s.replace(/\/item\b/gi, ' prati piece');

  // Expand unit abbreviations in product names for natural pronunciation
  s = s.replace(/\b(\d+)\s*kg\b/gi, '$1 kilo');
  s = s.replace(/\b(\d+)\s*g\b/gi, '$1 gram');
  s = s.replace(/\b(\d+)\s*l\b/gi, '$1 litre');
  s = s.replace(/\b(\d+)-pack\b/gi, '$1 pack');

  // Clean up symbols that sound robotic in TTS
  s = s.replace(/[@#•|]/g, ' ');
  s = s.replace(/\s*;\s*/g, ', aur ');
  s = s.replace(/\s*—\s*/g, ', ');
  s = s.replace(/["“”]/g, '');
  s = s.replace(/\s+,/g, ',');
  s = s.replace(/,+/g, ',');
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}

type ClauseClassification =
  | 'price_query'
  | 'stock_query'
  | 'cart_remove'
  | 'cart_clear'
  | 'cart_query'
  | 'checkout_confirm'
  | 'order_status_query'
  | 'delivery_query'
  | 'payment_query'
  | 'payment_select'
  | 'schedule_order'
  | 'address_select'
  | 'store_info_query'
  | 'gps_trigger'
  | 'navigate_route'
  | 'greeting_help'
  | 'recipe_recommendation'
  | 'recipe_bundle_add'
  | 'memory_recall'
  | 'cart_add'
  | 'bare_item';

/**
 * Extracts custom grocery item names when a user asks about or orders a product
 * that is not in the active shelf or reference catalog (e.g., "Paneer", "Bread", "Kurkure").
 */
function extractRequestedCustomItemLabel(clauseText: string): string | null {
  const cleaned = clauseText
    .replace(
      /\b(mujhe|mera|meri|humko|hume|please|kripya|zara|bhai|bhaiya|ji|dukaan|mein|par|se|ka|ki|ke|ko|hai|hain|kya|kitne|kitna|price|rate|mrp|daam|dam|bhav|cost|stock|available|uplabdh|milega|milta|add|karo|kar|de|do|la|bhej|chahiye|order|le|lo|rakh|pack|packet|kilo|kg|gram|gm|litre|ltr|ml|ek|one|do|two|teen|three|char|chaar|four|paanch|five|\d+)\b/gi,
      ' '
    )
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 3) return null;
  // Format Title Case
  return cleaned
    .split(' ')
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function classifyClauseIntent(
  clauseLower: string,
  hasMatchedSkus: boolean,
  hasAnyItemMention: boolean
): ClauseClassification {
  // 1. Conversational Memory Recall ("mera pichla conversation yaad hai?", "pichli baar maine kya poocha tha?")
  if (
    /\b(yaad\s+hai|pichli\s+baar|pichla\s+conversation|last\s+conversation|past\s+chat|humne\s+kya\s+baat|remember\s+me|do\s+you\s+remember|maine\s+pehle\s+kya)\b/i.test(
      clauseLower
    )
  ) {
    return 'memory_recall';
  }

  // 2. Recipe Bundle Add ("pani puri ka saara saman add kar do", "dal chawal ka saman de do")
  if (
    /\b(pani\s*puri|golgappa|dal\s*chawal|daal\s*chawal|paratha|roti|paneer\s*butter|shahi\s*paneer|chai\s*biscuit|poha|recipe|dish)\b/i.test(
      clauseLower
    ) &&
    /\b(saman|saaman|ingredients|bundle|kit|sab)\b/i.test(clauseLower) &&
    /\b(add|daal|dal|de\s+do|bhej|pack|la\s+do|chahiye)\b/i.test(clauseLower)
  ) {
    return 'recipe_bundle_add';
  }

  // 3. Culinary / Meal / Recipe Recommendation ("Aaj main khane mein kya banao?", "what should I cook today?", "pani puri bana sakte hain kya?")
  if (
    /\b(khane\s+mein\s+kya|khaane\s+mein\s+kya|khan\s+mein\s+kya|khane\s+me\s+kya|khan\s+me\s+kya|kya\s+banao|kya\s+banau|kya\s+banaye|kya\s+pakau|kya\s+khaye|kya\s+khau|khana\s+kya\s+bana|what\s+to\s+cook|what\s+should\s+i\s+cook|what\s+can\s+i\s+make|recipe|dish\s+suggest|nashte\s+mein\s+kya|dinner\s+mein\s+kya|lunch\s+mein\s+kya|dinner\s+me\s+kya|lunch\s+me\s+kya|kuch\s+chatpata|pani\s*puri\s*(?:bana|kaise|saman|banaye|banao)|golgapp[ae]\s*(?:bana|kaise|saman|banaye|banao)|dal\s*chawal\s+bana|kya\s+ban\s+sakta\s+hai|kya\s+bana\s+sakte\s+hain|kuch\s+banane\s+ka\s+batao|recommend\s+food|recommend\s+dish|meal\s+idea)\b/i.test(
      clauseLower
    )
  ) {
    return 'recipe_recommendation';
  }

  if (
    /\b(cart\s+clear|bag\s+khali|clear\s+cart|clear\s+bag|empty\s+cart|sab\s+hata\s+do|pura\s+cart\s+hata)\b/i.test(
      clauseLower
    )
  ) {
    return 'cart_clear';
  }

  if (
    /\b(hata\s+do|hatao|kam\s+kar|kam\s+karo|remove|delete|minus|nikal\s+do|cancel\s+item)\b/i.test(
      clauseLower
    )
  ) {
    return 'cart_remove';
  }

  // Schedule order intent (e.g., "shaam 6 baje deliver karo", "subah 8 baje bhejna", "schedule order")
  if (
    /\b(schedule|slot|subah\s+\d+|shaam\s+\d+|dopahar\s+\d+|raat\s+\d+|\d+\s*baje\s*(?:bhej|deliver|la|chahiye)|morning\s+slot|evening\s+slot|night\s+slot|kal\s+subah|time\s+par\s+bhej)\b/i.test(
      clauseLower
    )
  ) {
    return 'schedule_order';
  }

  // Select address intent (e.g., "home address par bhej do", "work address select karo", "office par deliver karo")
  if (
    /\b(home\s+address|work\s+address|office\s+address|other\s+address|ghar\s+wale\s+address|office\s+par\s+bhej|select\s+address|deliver\s+to\s+home|deliver\s+to\s+work)\b/i.test(
      clauseLower
    )
  ) {
    return 'address_select';
  }

  // Payment mode selection intent (e.g., "payment upi se karunga", "cash on delivery kar do", "udhaar khate mein likh do")
  if (
    /\b(upi\s+se|gpay\s+se|phonepe\s+se|paytm\s+se|cash\s+on\s+delivery\s+kar|cod\s+kar|cod\s+rakh|udhaar\s+khata\s+mein|udhaar\s+mein\s+likh|card\s+se\s+pay|payment\s+mode\s+(?:upi|cod|cash|udhaar|card)|pay\s+via\s+(?:upi|cod|cash|card|udhaar))\b/i.test(
      clauseLower
    )
  ) {
    return 'payment_select';
  }

  if (
    /\b(kitne\s+ka|kitna\s+price|kya\s+price|kya\s+rate|rate\s+kya|price\s+of|cost\s+of|mrp\s+kya|bhav\s+kya|daam\s+kya|dam\s+kya|kitne\s+rupaye|sabse\s+sasta|sabse\s+mehenga|discount\s+kitna|price|rate|mrp)\b/i.test(
      clauseLower
    ) &&
    !/\b(total\s+bill|cart\s+total|bag\s+total|kul\s+bill|mera\s+bill)\b/i.test(clauseLower)
  ) {
    return 'price_query';
  }

  if (
    /\b(total\s+bill|bill\s+kitna|kitna\s+bill|total\s+kitna|mere\s+bag\s+mein|mere\s+cart\s+mein|what\s+is\s+in\s+my\s+cart|what\s+is\s+in\s+my\s+bag|cart\s+summary|bag\s+total|kitne\s+paise\s+dene|kul\s+kitna|payable\s+kitna)\b/i.test(
      clauseLower
    )
  ) {
    return 'cart_query';
  }

  if (
    /\b(confirm|order\s+confirm|confirm\s+order|confirm\s+checkout|place\s+order|checkout\s+karo|order\s+bhej\s+do|order\s+place\s+karo|saman\s+bhej\s+do|proceed\s+to\s+checkout|final\s+order|haan?\s+confirm|pakka\s+confirm|yes\s+confirm|confirm\s+karo|ha\s+bhej\s+do)\b/i.test(
      clauseLower
    )
  ) {
    return 'checkout_confirm';
  }

  if (
    /\b(order\s+status|mera\s+order\s+kahan|order\s+kahan\s+pahuncha|pichle\s+order|pichle\s+orders|order\s+history|past\s+orders|my\s+orders|track\s+order|delivered\s+hua|summary|pichle\s+orders\s+ki\s+summary|orders\s+summary|total\s+spending|orders\s+count|kharcha\s+kitna)\b/i.test(
      clauseLower
    )
  ) {
    return 'order_status_query';
  }

  if (
    /\b(delivery\s+kitni\s+der|kitni\s+der\s+mein|kab\s+tak\s+aayega|delivery\s+time|delivery\s+eta|delivery\s+charge|free\s+delivery|minimum\s+order|home\s+delivery|kitna\s+time\s+lagega)\b/i.test(
      clauseLower
    )
  ) {
    return 'delivery_query';
  }

  if (
    /\b(upi|gpay|phonepe|paytm|cash\s+on\s+delivery|cod\s+available|payment\s+kaise|payment\s+mode|payment\s+option|udhaar\s+milta|card\s+chalta|online\s+payment)\b/i.test(
      clauseLower
    )
  ) {
    return 'payment_query';
  }

  if (
    /\b(dukaan\s+kab\s+khulti|store\s+timing|shop\s+hours|opening\s+time|kab\s+band\s+hoti|return\s+policy|exchange\s+ho\s+jayega|konse\s+store|registered\s+store|owner\s+kaun)\b/i.test(
      clauseLower
    )
  ) {
    return 'store_info_query';
  }

  if (
    /\b(live\s+gps|gps\s+location|meri\s+location|detect\s+location|map\s+dikhao|locate\s+me|near\s+me|aas\s+paas\s+dukaan)\b/i.test(
      clauseLower
    )
  ) {
    return 'gps_trigger';
  }

  if (
    /\b(kya\s+mil\s+sakta|kya\s+stock|stock\s+mein\s+kya|available\s+hai|stock\s+hai\s+kya|milega\s+kya|kya\s+kya\s+hai|catalog\s+dikhao|items\s+list|all\s+products|dukaan\s+mein\s+kya|stock\s+check)\b/i.test(
      clauseLower
    )
  ) {
    return 'stock_query';
  }

  if (
    /\b(open\s+shopkeeper|shopkeeper\s+console|open\s+customer|customer\s+portal|open\s+profile|my\s+profile|mera\s+profile|account\s+profile|creator\s+vault|backend\s+vault|admin\s+vault|login\s+page|contact\s+page|how\s+it\s+works\s+page|home\s+page\s+kholo)\b/i.test(
      clauseLower
    )
  ) {
    return 'navigate_route';
  }

  if (hasMatchedSkus || hasAnyItemMention) {
    if (
      /\b(add|daal|dal|de\s+do|bhej|la\s+do|chahiye|order|le\s+lo|rakh\s+do|pack\s+kar|buy|want|need)\b/i.test(
        clauseLower
      )
    ) {
      return 'cart_add';
    }
    if (/\b(kya|hai\s*\?|available|milega|uplabdh)\b/i.test(clauseLower)) {
      return 'stock_query';
    }
    return 'bare_item';
  }

  if (
    /\b(add\s+karo|add\s+kar\s+do|de\s+do|la\s+do|pack\s+kar\s+do|chahiye)\b/i.test(clauseLower)
  ) {
    return 'cart_add';
  }

  if (
    /\b(namaste|hello|hi\b|hey\b|tum\s+kaun|kya\s+kar\s+sakte|help|madad|kaise\s+kaam\s+karta|who\s+are\s+you)\b/i.test(
      clauseLower
    )
  ) {
    return 'greeting_help';
  }

  return 'bare_item';
}

/**
 * Evaluates complex multi-question & multi-input utterances through the Gnani Semantic Mapping Brain.
 * STRICT RULE: Never automatically adds items to the shop's inventory (shelf).
 * Only checks what is actually available on ctx.shelf and answers accordingly.
 */
export function evaluateVoiceBrain(
  rawPhrase: string,
  ctx: VoiceBrainContext
): VoiceBrainResult {
  const phrase = String(rawPhrase || '').trim();
  const lower = phrase.toLowerCase();
  const prevMemory: VoiceConversationMemory = ctx.memory || {
    lastReferencedSkuIds: [],
    lastRecommendedRecipe: null,
    pastTurnsSummary: [],
    favoriteItemNames: [],
    pendingQuestionTopic: null,
    turnCount: 0,
  };

  const intents: VoiceBrainIntentType[] = [];
  const brainSteps: VoiceBrainStep[] = [];
  const cartMutations: VoiceCartMutation[] = [];
  const autoHydratedSkus: ShelfItem[] = []; // Strictly empty: AI voice NEVER adds to shop inventory
  const unavailableItemNames: string[] = [];
  const erpMutations: VoiceErpMutation[] = [];
  const replyParts: string[] = [];
  const referencedSkuIds: string[] = [];
  let recommendedRecipes: RecipeRecommendation[] = [];
  let lastRecommendedRecipe: string | null = prevMemory.lastRecommendedRecipe || null;

  let profileInput: VoiceProfileInput | null = null;
  let shouldClearCart = false;
  let shouldPlaceOrder = false;
  let navigateToRoute: RouteKey | null = null;
  let switchCustomerTab: CustomerStorefrontTab | null = null;
  let followUpPrompt: string | null = null;
  let selectedPaymentMode: PaymentModeId | null = null;
  let scheduleUpdate: Partial<OrderScheduleConfig> | null = null;
  let selectedAddressTag: 'Home' | 'Work' | 'Other' | null = null;

  // Strictly use ONLY what is currently stocked on the shopkeeper's shelf (stock > 0)
  const effectiveShelf: ShelfItem[] = ctx.shelf.filter((s) => s.stock > 0);

  // Reference dictionary used ONLY to recognize item names the customer asks for that are NOT on effectiveShelf
  const referenceDictionary: ShelfItem[] = [
    ...effectiveShelf,
    ...DEFAULT_KIRANA_CATALOG.filter(
      (d) =>
        !effectiveShelf.some(
          (s) => s.id === d.id || s.name.toLowerCase() === d.name.toLowerCase()
        )
    ),
  ];

  // -------------------------------------------------------------------------
  // 1. EXTRACT MULTI-FIELD PROFILE INPUTS (Name, Phone, Address, Store Name)
  // -------------------------------------------------------------------------
  const nameMatch = phrase.match(
    /(?:mera\s+naam|my\s+name\s+is|customer\s+name|naam)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)(?=\s+(?:hai|aur|and|phone|mobile|address|pata|order|add|$)|[,.;?]|$)/i
  );
  const phoneMatch = phrase.match(/\b([6-9]\d{9})\b/);
  const addressMatch = phrase.match(
    /(?:mera\s+address|delivery\s+address|address\s+is|address|pata)\s+([^,.;?]+?)(?=\s+(?:hai|aur|and|phone|mobile|order|add|de\s+do|$)|[,.;?]|$)/i
  );
  const storeNameMatch = phrase.match(
    /(?:meri\s+dukaan|store\s+name|shop\s+name|dukaan\s+ka\s+naam)\s+([^,.;?]+?)(?=\s+(?:hai|aur|and|owner|address|phone|$)|[,.;?]|$)/i
  );

  if (nameMatch || phoneMatch || addressMatch || storeNameMatch) {
    profileInput = {};
    const fieldsCaptured: string[] = [];
    if (nameMatch?.[1]) {
      const cleanedName = nameMatch[1]
        .replace(/\s+\b(hai|hain|ho|ji|aur|and|phone|mobile|address|pata)\b$/i, '')
        .trim();
      profileInput.name = cleanedName;
      fieldsCaptured.push(`Name: ${profileInput.name}`);
    }
    if (phoneMatch?.[1]) {
      profileInput.phone = phoneMatch[1].trim();
      fieldsCaptured.push(`Mobile: ${profileInput.phone}`);
    }
    if (addressMatch?.[1]) {
      profileInput.address = addressMatch[1]
        .replace(/\s+\b(hai|hain|aur|and)\b$/i, '')
        .trim();
      if (/\bwork|office\b/i.test(phrase)) profileInput.addressTag = 'Work';
      else if (/\bother\b/i.test(phrase)) profileInput.addressTag = 'Other';
      else profileInput.addressTag = 'Home';
      fieldsCaptured.push(`Address (${profileInput.addressTag}): ${profileInput.address}`);
    }
    if (storeNameMatch?.[1]) {
      profileInput.storeName = storeNameMatch[1]
        .replace(/\s+\b(hai|hain|aur|and)\b$/i, '')
        .trim();
      profileInput.role = 'shopkeeper';
      fieldsCaptured.push(`Store: ${profileInput.storeName}`);
    } else if (profileInput.name || profileInput.address) {
      profileInput.role = ctx.auth?.role || 'customer';
    }

    if (fieldsCaptured.length > 0) {
      intents.push('profile_input');
      const summary = fieldsCaptured.join(', ');
      brainSteps.push({
        id: `step_profile_${brainSteps.length}`,
        clause: summary,
        intent: 'profile_input',
        entityLabel: 'Customer Profile / Address Saved',
        resolution: `Saved ${summary}`,
        confidence: 0.99,
      });
      replyParts.push(`Ji bilkul, aapki details (${summary}) save kar li gayi hain.`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. EXTRACT SHOPKEEPER ERP MUTATIONS (Kharcha/Income, Udhaar/Jama)
  // -------------------------------------------------------------------------
  const kharchaMatch = phrase.match(
    /\b(?:kharcha|expense)\s+(?:₹|rs\.?\s*)?(\d+)\s*(?:for|on|ka|ki|ke\s+liye)?\s*([a-zA-Z0-9\s]+?)(?=\s+(?:likho|add|aur|and|$)|[,.;?]|$)/i
  );
  if (kharchaMatch) {
    const amount = parseInt(kharchaMatch[1], 10);
    const note = (kharchaMatch[2] || 'Store Expense').trim();
    if (amount > 0) {
      erpMutations.push({
        kind: 'add_cashbook',
        cashbook: { note, type: 'expense', amount },
      });
      intents.push('erp_mutation');
      brainSteps.push({
        id: `step_erp_cb_${brainSteps.length}`,
        clause: kharchaMatch[0],
        intent: 'erp_mutation',
        entityLabel: `Cashbook Kharcha ₹${amount}`,
        resolution: `Recorded expense ₹${amount} (${note})`,
        confidence: 0.98,
      });
      replyParts.push(`Ji, Hisab-Kitab mein ₹${amount} (${note}) kharcha darj kar diya gaya hai.`);
    }
  }

  const udhaarMatch = phrase.match(
    /\b([A-Za-z]+)\s+(?:ke\s+naam|ko)\s+(?:₹|rs\.?\s*)?(\d+)\s+(udhaar|jama)(?:\s+likho|\s+add|\s+karo)?/i
  );
  if (udhaarMatch) {
    const customerName = udhaarMatch[1].trim();
    const amount = parseInt(udhaarMatch[2], 10);
    const kType = udhaarMatch[3].toLowerCase() === 'jama' ? 'jama' : 'udhaar';
    if (amount > 0) {
      erpMutations.push({
        kind: 'add_khata',
        khata: {
          customerName,
          phone: phoneMatch?.[1] || 'Voice Entry',
          type: kType,
          amount,
          note: `Voice ${kType === 'udhaar' ? 'Credit' : 'Payment'} Entry`,
        },
      });
      intents.push('erp_mutation');
      brainSteps.push({
        id: `step_erp_khata_${brainSteps.length}`,
        clause: udhaarMatch[0],
        intent: 'erp_mutation',
        entityLabel: `Khata ${customerName}: ₹${amount}`,
        resolution: `Recorded ${kType} ₹${amount} for ${customerName}`,
        confidence: 0.98,
      });
      replyParts.push(
        `Khata Book mein ${customerName} ke naam ₹${amount} ${
          kType === 'udhaar' ? 'Udhaar' : 'Jama'
        } note kar liya gaya hai.`
      );
    }
  }

  // -------------------------------------------------------------------------
  // 3. FOLLOW-UP CONVERSATION MEMORY RESOLUTION (Pronouns & "Haan / Dono / 2-2")
  // -------------------------------------------------------------------------
  const overallDictMatches = matchSkusInText(phrase, referenceDictionary);
  const isAffirmativeFollowUp =
    overallDictMatches.length === 0 &&
    prevMemory.lastReferencedSkuIds.length > 0 &&
    /\b(haan|yes|ok|okay|sure|zaroor|bilkul|dono|both|all\s+of\s+them|add\s+kar|de\s+do|daal\s+do|pack\s+kar|iska|isko|woh|aur\s+add)\b/i.test(
      lower
    );

  if (isAffirmativeFollowUp) {
    const followUpQty = extractHinglishQuantity(phrase);
    const isPriceFollowUp = /\b(price|rate|kitne\s+ka|mrp|daam|dam|cost)\b/i.test(lower);
    const isRemoveFollowUp = /\b(hata|remove|kam\s+kar|nikal)\b/i.test(lower);

    // Only resolve against items actually present on effectiveShelf!
    const refSkus = prevMemory.lastReferencedSkuIds
      .map((id) => effectiveShelf.find((s) => s.id === id))
      .filter((s): s is ShelfItem => Boolean(s));

    if (refSkus.length > 0) {
      intents.push('followup_answer');
      if (isPriceFollowUp) {
        intents.push('price_query');
        const priceTexts = refSkus.map(
          (s) => `${s.name}: ₹${s.price} (MRP ₹${s.mrp}, bachat ₹${Math.max(0, s.mrp - s.price)})`
        );
        brainSteps.push({
          id: `step_followup_price_${brainSteps.length}`,
          clause: phrase,
          intent: 'price_query',
          entityLabel: refSkus.map((s) => s.name).join(', '),
          resolution: priceTexts.join(' | '),
          confidence: 0.97,
        });
        replyParts.push(`Ji bilkul, price details: ${priceTexts.join('; ')}.`);
        referencedSkuIds.push(...refSkus.map((s) => s.id));
      } else if (isRemoveFollowUp) {
        intents.push('cart_remove');
        for (const sku of refSkus) {
          cartMutations.push({ sku, qty: followUpQty, mode: 'remove' });
          referencedSkuIds.push(sku.id);
        }
        brainSteps.push({
          id: `step_followup_rem_${brainSteps.length}`,
          clause: phrase,
          intent: 'cart_remove',
          entityLabel: refSkus.map((s) => s.name).join(', '),
          resolution: `Removed ${followUpQty}× from cart`,
          confidence: 0.97,
        });
        replyParts.push(
          `Ji theek hai, ${refSkus.map((s) => `${followUpQty}× ${s.name}`).join(' aur ')} aapke bag se kam kar diya gaya hai.`
        );
      } else {
        intents.push('cart_add');
        const addedLabels: string[] = [];
        for (const sku of refSkus) {
          const clamped = Math.min(followUpQty, Math.max(1, sku.stock));
          cartMutations.push({ sku, qty: clamped, mode: 'add' });
          addedLabels.push(`${clamped}× ${sku.name}`);
          referencedSkuIds.push(sku.id);
        }
        brainSteps.push({
          id: `step_followup_add_${brainSteps.length}`,
          clause: phrase,
          intent: 'cart_add',
          entityLabel: addedLabels.join(', '),
          resolution: `Follow-up context: Added ${addedLabels.join(', ')} to bag`,
          confidence: 0.98,
        });
        replyParts.push(
          `Ji zaroor! Maine ${addedLabels.join(' aur ')} aapke cart mein add kar diya hai!`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. CLAUSE SEGMENTATION & RIGHT-TO-LEFT SHARED INTENT PROPAGATION
  // -------------------------------------------------------------------------
  const rawClauses = phrase
    .split(
      /(?:[?;.!]+|\s*,\s*|\s+\baur\b\s+|\s+\band\b\s+|\s+\bphir\b\s+|\s+\bthen\b\s+|\s+\bplus\b\s+|\s+\balso\b\s+|\s+\bsath\s+mein\b\s+)/i
    )
    .map((c) => c.trim())
    .filter(Boolean);

  interface ParsedClause {
    text: string;
    lower: string;
    availableMatches: Array<{ sku: ShelfItem; qty: number; matchIndex: number }>;
    unavailableMatches: Array<{ sku: ShelfItem; qty: number; matchIndex: number }>;
    classification: ClauseClassification;
  }

  const parsedClauses: ParsedClause[] = rawClauses.map((clauseText) => {
    const clauseLower = clauseText.toLowerCase();
    const avail = matchSkusInText(clauseText, effectiveShelf);
    const allDict = matchSkusInText(clauseText, referenceDictionary);
    const unavail = allDict.filter(
      (m) =>
        !effectiveShelf.some(
          (s) => s.id === m.sku.id || s.name.toLowerCase() === m.sku.name.toLowerCase()
        )
    );
    const classification = classifyClauseIntent(
      clauseLower,
      avail.length > 0,
      allDict.length > 0
    );
    return {
      text: clauseText,
      lower: clauseLower,
      availableMatches: avail,
      unavailableMatches: unavail,
      classification,
    };
  });

  // Right-to-left propagation: e.g. "Atta aur Milk kitne ka hai?"
  for (let i = parsedClauses.length - 2; i >= 0; i--) {
    const hasItems =
      parsedClauses[i].availableMatches.length > 0 ||
      parsedClauses[i].unavailableMatches.length > 0;
    if (parsedClauses[i].classification === 'bare_item' && hasItems) {
      const nextIntent = parsedClauses[i + 1].classification;
      if (
        nextIntent === 'price_query' ||
        nextIntent === 'stock_query' ||
        nextIntent === 'cart_remove' ||
        nextIntent === 'cart_add'
      ) {
        parsedClauses[i].classification = nextIntent;
      }
    }
  }

  // Any remaining 'bare_item' with matched items defaults to 'cart_add'
  for (const pc of parsedClauses) {
    const hasItems = pc.availableMatches.length > 0 || pc.unavailableMatches.length > 0;
    if (pc.classification === 'bare_item' && hasItems) {
      pc.classification = 'cart_add';
    }
  }

  const priceQueriedSkuIds = new Set<string>();
  const stockQueriedSkuIds = new Set<string>();
  const reportedUnavailableNames = new Set<string>();
  let generalStockAnswered = false;
  let deliveryAnswered = false;
  let paymentAnswered = false;
  let storeInfoAnswered = false;
  let orderStatusAnswered = false;
  let gpsTriggered = false;
  let cartQueryRequested = false;

  const reportUnavailableItems = (
    itemsToReport: string[],
    clauseText: string,
    intentContext: 'price' | 'stock' | 'order'
  ) => {
    const freshNames = itemsToReport.filter((n) => {
      const key = n.toLowerCase();
      if (reportedUnavailableNames.has(key)) return false;
      reportedUnavailableNames.add(key);
      unavailableItemNames.push(n);
      return true;
    });
    if (freshNames.length === 0) return;

    if (!intents.includes('item_unavailable')) intents.push('item_unavailable');
    if (intentContext === 'price' && !intents.includes('price_query')) intents.push('price_query');
    if (intentContext === 'stock' && !intents.includes('stock_query')) intents.push('stock_query');

    const namesJoined = freshNames.join(' aur ');
    const availableHint =
      effectiveShelf.length > 0
        ? ` Abhi hamare paas ${effectiveShelf
            .slice(0, 4)
            .map((s) => `${s.name} (₹${s.price})`)
            .join(', ')} stock mein uplabdh hai.`
        : ' Abhi dukaan ke shelf par koi bhi item stock mein publish nahi kiya gaya hai.';

    const unavailMsg = `Maaf kijiyega ji, abhi dukaan mein ${namesJoined} stock mein uplabdh nahi hai.${availableHint}`;
    brainSteps.push({
      id: `step_unavail_${brainSteps.length}`,
      clause: clauseText,
      intent: 'item_unavailable',
      entityLabel: `${namesJoined} (Not Available in Stock)`,
      resolution: unavailMsg,
      confidence: 0.99,
    });
    replyParts.push(unavailMsg);
  };

  for (const pc of parsedClauses) {
    const {
      text: clauseText,
      lower: clauseLower,
      availableMatches,
      unavailableMatches,
      classification,
    } = pc;

    switch (classification) {
      case 'cart_add': {
        if (availableMatches.length > 0) {
          if (!intents.includes('cart_add')) intents.push('cart_add');
          const addedInClause: string[] = [];
          for (const m of availableMatches) {
            const sku = m.sku;
            const clampedQty = Math.min(m.qty, Math.max(1, sku.stock));
            cartMutations.push({ sku, qty: clampedQty, mode: 'add' });
            addedInClause.push(`${clampedQty}× ${sku.name} (₹${sku.price * clampedQty})`);
            referencedSkuIds.push(sku.id);
          }
          brainSteps.push({
            id: `step_add_${brainSteps.length}`,
            clause: clauseText,
            intent: 'cart_add',
            entityLabel: addedInClause.join(', '),
            resolution: `Verified in stock & added to bag: ${addedInClause.join(', ')}`,
            confidence: 0.99,
          });
          replyParts.push(
            `Ji bilkul! ${availableMatches
              .map((m) => `${Math.min(m.qty, Math.max(1, m.sku.stock))}× ${m.sku.name}`)
              .join(' aur ')} aapke cart mein add kar diya gaya hai!`
          );
        }

        if (unavailableMatches.length > 0) {
          reportUnavailableItems(
            unavailableMatches.map((u) => u.sku.name),
            clauseText,
            'order'
          );
        } else if (availableMatches.length === 0) {
          const customLabel = extractRequestedCustomItemLabel(clauseText);
          if (customLabel) {
            reportUnavailableItems([customLabel], clauseText, 'order');
          }
        }
        break;
      }

      case 'cart_remove': {
        const allForRemove = [...availableMatches, ...unavailableMatches];
        if (allForRemove.length > 0) {
          if (!intents.includes('cart_remove')) intents.push('cart_remove');
          const removedLabels: string[] = [];
          for (const m of allForRemove) {
            cartMutations.push({ sku: m.sku, qty: m.qty, mode: 'remove' });
            removedLabels.push(`${m.qty}× ${m.sku.name}`);
            referencedSkuIds.push(m.sku.id);
          }
          brainSteps.push({
            id: `step_rem_${brainSteps.length}`,
            clause: clauseText,
            intent: 'cart_remove',
            entityLabel: removedLabels.join(', '),
            resolution: `Removed from bag: ${removedLabels.join(', ')}`,
            confidence: 0.98,
          });
          replyParts.push(
            `Ji theek hai, ${removedLabels.join(' aur ')} aapke cart se hata diya gaya hai.`
          );
        }
        break;
      }

      case 'cart_clear': {
        shouldClearCart = true;
        if (!intents.includes('cart_clear')) intents.push('cart_clear');
        brainSteps.push({
          id: `step_clear_${brainSteps.length}`,
          clause: clauseText,
          intent: 'cart_clear',
          entityLabel: 'Customer Bag',
          resolution: 'Cleared all items from cart',
          confidence: 0.99,
        });
        replyParts.push('Ji, aapka kirana bag poori tarah khali kar diya gaya hai.');
        break;
      }

      case 'price_query': {
        if (!intents.includes('price_query')) intents.push('price_query');
        if (availableMatches.length > 0) {
          const priceDetails: string[] = [];
          for (const m of availableMatches) {
            if (priceQueriedSkuIds.has(m.sku.id)) continue;
            priceQueriedSkuIds.add(m.sku.id);
            const sku = m.sku;
            referencedSkuIds.push(sku.id);
            const saving = Math.max(0, sku.mrp - sku.price);
            priceDetails.push(
              `${sku.name} abhi stock mein uplabdh hai aur ₹${sku.price}/${sku.unit} hai (MRP ₹${sku.mrp}, ₹${saving} bachat)`
            );
          }
          if (priceDetails.length > 0) {
            brainSteps.push({
              id: `step_price_${brainSteps.length}`,
              clause: clauseText,
              intent: 'price_query',
              entityLabel: availableMatches.map((m) => m.sku.name).join(', '),
              resolution: priceDetails.join(' | '),
              confidence: 0.99,
            });
            replyParts.push(`Ji haan! ${priceDetails.join('; ')}.`);
            followUpPrompt =
              'Aap chahein toh bol sakte hain: "Haan 2 packet add kar do".';
          }
        }

        if (unavailableMatches.length > 0) {
          reportUnavailableItems(
            unavailableMatches.map((u) => u.sku.name),
            clauseText,
            'price'
          );
        } else if (availableMatches.length === 0) {
          if (/\bsasta\b|\bcheapest\b|\blowest\b/i.test(clauseLower)) {
            if (effectiveShelf.length === 0) {
              reportUnavailableItems(['Koi bhi product'], clauseText, 'price');
            } else {
              const cheapest = [...effectiveShelf].sort((a, b) => a.price - b.price)[0];
              if (cheapest) {
                referencedSkuIds.push(cheapest.id);
                const ans = `Hamari dukaan mein sabse sasta item ${cheapest.name} hai — sirf ₹${cheapest.price} (MRP ₹${cheapest.mrp}).`;
                brainSteps.push({
                  id: `step_price_cheap_${brainSteps.length}`,
                  clause: clauseText,
                  intent: 'price_query',
                  entityLabel: cheapest.name,
                  resolution: ans,
                  confidence: 0.97,
                });
                replyParts.push(ans);
              }
            }
          } else if (/\bdiscount\b|\boffer\b|\bbachat\b|\bsaving/i.test(clauseLower)) {
            if (effectiveShelf.length === 0) {
              reportUnavailableItems(['Koi bhi discount item'], clauseText, 'price');
            } else {
              const bestDeal = [...effectiveShelf].sort(
                (a, b) => b.mrp - b.price - (a.mrp - a.price)
              )[0];
              if (bestDeal) {
                referencedSkuIds.push(bestDeal.id);
                const ans = `Abhi sabse bada discount ${bestDeal.name} par hai — MRP ₹${
                  bestDeal.mrp
                } par ₹${bestDeal.mrp - bestDeal.price} ki bachat (Rate: ₹${bestDeal.price}).`;
                brainSteps.push({
                  id: `step_price_deal_${brainSteps.length}`,
                  clause: clauseText,
                  intent: 'price_query',
                  entityLabel: bestDeal.name,
                  resolution: ans,
                  confidence: 0.97,
                });
                replyParts.push(ans);
              }
            }
          } else {
            const customLabel = extractRequestedCustomItemLabel(clauseText);
            if (customLabel) {
              reportUnavailableItems([customLabel], clauseText, 'price');
            }
          }
        }
        break;
      }

      case 'stock_query': {
        if (!intents.includes('stock_query')) intents.push('stock_query');
        if (availableMatches.length > 0) {
          const stockDetails: string[] = [];
          for (const m of availableMatches) {
            if (stockQueriedSkuIds.has(m.sku.id)) continue;
            stockQueriedSkuIds.add(m.sku.id);
            const sku = m.sku;
            referencedSkuIds.push(sku.id);
            stockDetails.push(
              `Ji haan, ${sku.name} abhi dukaan ke stock mein uplabdh hai (${sku.stock} ${sku.unit} @ ₹${sku.price})`
            );
          }
          if (stockDetails.length > 0) {
            brainSteps.push({
              id: `step_stock_sku_${brainSteps.length}`,
              clause: clauseText,
              intent: 'stock_query',
              entityLabel: availableMatches.map((m) => m.sku.name).join(', '),
              resolution: stockDetails.join(' | '),
              confidence: 0.99,
            });
            replyParts.push(stockDetails.join('; ') + '.');
            followUpPrompt = 'Boliye kitne packet aapke bag mein rakh doon?';
          }
        }

        if (unavailableMatches.length > 0) {
          reportUnavailableItems(
            unavailableMatches.map((u) => u.sku.name),
            clauseText,
            'stock'
          );
        } else if (availableMatches.length === 0 && !generalStockAnswered) {
          // Check if the user asked about a specific custom item ("Paneer milega kya?") vs general stock ("Dukaan mein kya mil sakta hai?")
          const isGeneralStockQuestion =
            /\b(kya\s+mil\s+sakta|kya\s+kya|kya\s+stock|stock\s+mein\s+kya|all\s+products|items\s+list|catalog\s+dikhao|dukaan\s+mein\s+kya)\b/i.test(
              clauseLower
            );
          const customLabel = !isGeneralStockQuestion
            ? extractRequestedCustomItemLabel(clauseText)
            : null;

          if (customLabel) {
            reportUnavailableItems([customLabel], clauseText, 'stock');
          } else {
            generalStockAnswered = true;
            if (effectiveShelf.length === 0) {
              const emptyMsg =
                'Maaf kijiyega ji, dukaan ke shelf par abhi koi product publish nahi kiya gaya hai. Shopkeeper Console mein jaakar pehle stock add karein.';
              brainSteps.push({
                id: `step_stock_empty_${brainSteps.length}`,
                clause: clauseText,
                intent: 'stock_query',
                entityLabel: 'Store Shelf (0 SKUs Available)',
                resolution: emptyMsg,
                confidence: 0.99,
              });
              replyParts.push(emptyMsg);
            } else {
              const previewList = effectiveShelf
                .slice(0, 6)
                .map((s) => `${s.name} (₹${s.price}, ${s.stock} ${s.unit})`)
                .join(', ');
              const msg = `Ji namaste! Abhi hamari dukaan par yeh items stock mein uplabdh hain: ${previewList}${
                effectiveShelf.length > 6 ? ` aur +${effectiveShelf.length - 6} items` : ''
              }.`;
              brainSteps.push({
                id: `step_stock_all_${brainSteps.length}`,
                clause: clauseText,
                intent: 'stock_query',
                entityLabel: `Available Store Inventory (${effectiveShelf.length} SKUs)`,
                resolution: msg,
                confidence: 0.99,
              });
              replyParts.push(msg);
            }
          }
        }
        break;
      }

      case 'payment_select': {
        if (!intents.includes('payment_select')) intents.push('payment_select');
        switchCustomerTab = 'payment';
        if (/\budhaar|khata\b/i.test(clauseLower)) {
          selectedPaymentMode = 'udhaar_khata';
        } else if (/\bcod|cash\b/i.test(clauseLower)) {
          selectedPaymentMode = 'cod';
        } else if (/\bcard|pos\b/i.test(clauseLower)) {
          selectedPaymentMode = 'card_pos';
        } else {
          selectedPaymentMode = 'upi';
        }
        const modeObj =
          PAYMENT_MODES.find((m) => m.id === selectedPaymentMode) || PAYMENT_MODES[0];
        const msg = `Ji bilkul, aapke order ke liye payment mode "${modeObj.label}" select kar liya gaya hai.`;
        brainSteps.push({
          id: `step_pay_sel_${brainSteps.length}`,
          clause: clauseText,
          intent: 'payment_select',
          entityLabel: `Payment Mode: ${modeObj.shortLabel}`,
          resolution: msg,
          confidence: 0.99,
        });
        replyParts.push(msg);
        break;
      }

      case 'schedule_order': {
        if (!intents.includes('schedule_order')) intents.push('schedule_order');
        switchCustomerTab = 'schedule';
        let slotId = 'evening-5-7';
        let slotLabel = 'Evening Chai & Snacks Slot (5:00 PM – 7:00 PM)';
        let mode: 'instant' | 'scheduled' = 'scheduled';

        if (/\b(turant|instant|abhi|express)\b/i.test(clauseLower)) {
          slotId = 'instant-15m';
          slotLabel = 'Instant Express Delivery (10–15 Mins)';
          mode = 'instant';
        } else if (/\b(subah|morning|7|8|9)\b/i.test(clauseLower)) {
          slotId = 'morning-7-9';
          slotLabel = 'Morning Milk & Breakfast Slot (7:00 AM – 9:00 AM)';
        } else if (/\b(dopahar|afternoon|midday|12|1|2)\b/i.test(clauseLower)) {
          slotId = 'midday-12-2';
          slotLabel = 'Mid-Day Kitchen Slot (12:00 PM – 2:00 PM)';
        } else if (/\b(raat|night|8|9|10)\b/i.test(clauseLower)) {
          slotId = 'night-8-10';
          slotLabel = 'Night Dinner & Ration Slot (8:00 PM – 10:00 PM)';
        }

        scheduleUpdate = {
          mode,
          slotId,
          slotLabel,
        };
        const msg = `Ji zaroor, aapka order "${slotLabel}" ke liye schedule kar diya gaya hai.`;
        brainSteps.push({
          id: `step_sched_${brainSteps.length}`,
          clause: clauseText,
          intent: 'schedule_order',
          entityLabel: slotLabel,
          resolution: msg,
          confidence: 0.98,
        });
        replyParts.push(msg);
        break;
      }

      case 'address_select': {
        if (!intents.includes('address_select')) intents.push('address_select');
        switchCustomerTab = 'addresses';
        if (/\b(work|office|dukaan)\b/i.test(clauseLower)) {
          selectedAddressTag = 'Work';
        } else if (/\b(other|doosre)\b/i.test(clauseLower)) {
          selectedAddressTag = 'Other';
        } else {
          selectedAddressTag = 'Home';
        }
        const msg = `Ji theek hai, delivery ke liye aapka "${selectedAddressTag}" address select kar liya gaya hai.`;
        brainSteps.push({
          id: `step_addr_${brainSteps.length}`,
          clause: clauseText,
          intent: 'address_select',
          entityLabel: `Delivery Address: ${selectedAddressTag}`,
          resolution: msg,
          confidence: 0.98,
        });
        replyParts.push(msg);
        break;
      }

      case 'cart_query': {
        cartQueryRequested = true;
        if (!intents.includes('cart_query')) intents.push('cart_query');
        break;
      }

      case 'checkout_confirm': {
        shouldPlaceOrder = true;
        if (!intents.includes('checkout_confirm')) intents.push('checkout_confirm');
        break;
      }

      case 'order_status_query': {
        if (!orderStatusAnswered) {
          orderStatusAnswered = true;
          if (!intents.includes('order_status_query')) intents.push('order_status_query');
          switchCustomerTab = 'history';
          const orders = ctx.orders || [];
          if (orders.length === 0) {
            const msg =
              'Abhi tak aapka koi active ya pichla order nahi hai. Aap jo items dukaan mein uplabdh hain unhe bag mein daal kar order place kar sakte hain.';
            brainSteps.push({
              id: `step_orders_empty_${brainSteps.length}`,
              clause: clauseText,
              intent: 'order_status_query',
              entityLabel: 'Order History (0 Orders)',
              resolution: msg,
              confidence: 0.97,
            });
            replyParts.push(msg);
          } else {
            const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;
            const latest = orders[0];
            const msg = `Aapne abhi tak kul ${orders.length} order(s) place kiye hain jinka total spending ₹${totalSpent} hai (${deliveredCount} deliver ho chuke hain). Latest order ${latest.id} (${latest.items}) abhi "${latest.status}" status mein hai.`;
            brainSteps.push({
              id: `step_orders_${brainSteps.length}`,
              clause: clauseText,
              intent: 'order_status_query',
              entityLabel: `Order History Summary (${orders.length} Orders, ₹${totalSpent} Total Spent)`,
              resolution: msg,
              confidence: 0.99,
            });
            replyParts.push(msg);
          }
        }
        break;
      }

      case 'delivery_query': {
        if (!deliveryAnswered) {
          deliveryAnswered = true;
          if (!intents.includes('delivery_query')) intents.push('delivery_query');
          const msg =
            'Hamari dukaan se express delivery 10 se 15 minute mein hoti hai, ya phir aap Order Scheduling tab mein apni pasand ka time slot bhi choose kar sakte hain!';
          brainSteps.push({
            id: `step_deliv_${brainSteps.length}`,
            clause: clauseText,
            intent: 'delivery_query',
            entityLabel: 'Instant & Scheduled Delivery',
            resolution: msg,
            confidence: 0.98,
          });
          replyParts.push(msg);
        }
        break;
      }

      case 'payment_query': {
        if (!paymentAnswered) {
          paymentAnswered = true;
          if (!intents.includes('payment_query')) intents.push('payment_query');
          const msg =
            'Payment ke liye UPI (GPay, PhonePe, Paytm), Cash on Delivery (COD), Card at Doorstep, aur Digital Udhaar Khata charon options uplabdh hain.';
          brainSteps.push({
            id: `step_pay_${brainSteps.length}`,
            clause: clauseText,
            intent: 'payment_query',
            entityLabel: 'UPI / COD / Udhaar Khata / Card',
            resolution: msg,
            confidence: 0.98,
          });
          replyParts.push(msg);
        }
        break;
      }

      case 'store_info_query': {
        if (!storeInfoAnswered) {
          storeInfoAnswered = true;
          if (!intents.includes('store_info_query')) intents.push('store_info_query');
          const stores = ctx.registeredStores || [];
          const storeDesc =
            stores.length > 0
              ? `Abhi network par ${stores.map((s) => `${s.storeName} (${s.address})`).join(', ')} active hain.`
              : 'Dukaan roz subah 7:00 AM se raat 10:30 PM tak khulti hai aur 100% doorstep replacement deti hai.';
          brainSteps.push({
            id: `step_store_${brainSteps.length}`,
            clause: clauseText,
            intent: 'store_info_query',
            entityLabel: 'Kirana Store Timings & Info',
            resolution: storeDesc,
            confidence: 0.96,
          });
          replyParts.push(storeDesc);
        }
        break;
      }

      case 'gps_trigger': {
        if (!gpsTriggered) {
          gpsTriggered = true;
          if (!intents.includes('gps_trigger')) intents.push('gps_trigger');
          const msg = 'Ji, aapki live GPS location detect ki ja rahi hai!';
          brainSteps.push({
            id: `step_gps_${brainSteps.length}`,
            clause: clauseText,
            intent: 'gps_trigger',
            entityLabel: 'Browser Geolocation Radar',
            resolution: msg,
            confidence: 0.99,
          });
          replyParts.push(msg);
        }
        break;
      }

      case 'navigate_route': {
        if (!intents.includes('navigate_route')) intents.push('navigate_route');
        if (
          clauseLower.includes('creator') ||
          clauseLower.includes('backend') ||
          clauseLower.includes('vault') ||
          clauseLower.includes('admin')
        ) {
          navigateToRoute = 'creator-vault';
        } else if (clauseLower.includes('profile') || clauseLower.includes('account')) {
          navigateToRoute = 'profile';
        } else if (clauseLower.includes('shopkeeper')) {
          navigateToRoute = 'shopkeeper';
        } else if (clauseLower.includes('customer')) {
          navigateToRoute = 'customer';
        } else if (clauseLower.includes('login')) {
          navigateToRoute = 'login';
        } else if (clauseLower.includes('contact')) {
          navigateToRoute = 'contact';
        } else if (clauseLower.includes('how')) {
          navigateToRoute = 'how-it-works';
        } else {
          navigateToRoute = 'home';
        }

        const msg = `Ji, aapko ${navigateToRoute} page par le jaya ja raha hai.`;
        brainSteps.push({
          id: `step_nav_${brainSteps.length}`,
          clause: clauseText,
          intent: 'navigate_route',
          entityLabel: `Route -> #/${navigateToRoute}`,
          resolution: msg,
          confidence: 0.98,
        });
        replyParts.push(msg);
        break;
      }

      case 'memory_recall': {
        if (!intents.includes('memory_recall')) intents.push('memory_recall');
        const custName = ctx.auth?.name || prevMemory.customerName || 'Dost';
        const pastSummaries = prevMemory.pastTurnsSummary || [];
        const favItems = prevMemory.favoriteItemNames || [];
        const lastRec = prevMemory.lastRecommendedRecipe;

        if (pastSummaries.length === 0 && favItems.length === 0 && !lastRec) {
          const msg = `Namaste ${custName} ji! Yeh hamari is session ki pehli baat-cheet hai, aur ab se main aapki har pasand, recipe aur order ko hamesha yaad rakhungi!`;
          brainSteps.push({
            id: `step_mem_empty_${brainSteps.length}`,
            clause: clauseText,
            intent: 'memory_recall',
            entityLabel: `Customer Memory (${custName})`,
            resolution: msg,
            confidence: 0.99,
          });
          replyParts.push(msg);
        } else {
          const recentNote =
            pastSummaries.length > 0
              ? `Pichli baar aapne kaha tha: "${pastSummaries[0]}".`
              : '';
          const favNote =
            favItems.length > 0
              ? ` Aapke pasandida items mein ${favItems.slice(0, 3).join(', ')} shamil hain.`
              : '';
          const recNote = lastRec
            ? ` Aur humne "${lastRec}" recipe ke baare mein bhi baat ki thi.`
            : '';
          const msg = `Ji haan ${custName} ji, mujhe hamari pichli baat-cheet achhi tarah yaad hai! ${recentNote}${favNote}${recNote} Boliye, kya main wahi saman aapke bag mein add kar doon?`;
          brainSteps.push({
            id: `step_mem_ok_${brainSteps.length}`,
            clause: clauseText,
            intent: 'memory_recall',
            entityLabel: `Recalled ${pastSummaries.length} Past Turn(s) for ${custName}`,
            resolution: msg,
            confidence: 0.99,
          });
          replyParts.push(msg);
          followUpPrompt = 'Aap bol sakte hain: "Haan wahi add kar do" ya "Aaj khane mein kya banao?"';
        }
        break;
      }

      case 'recipe_recommendation': {
        if (!intents.includes('recipe_recommendation')) intents.push('recipe_recommendation');
        const recs = recommendRecipesFromShelf(effectiveShelf, clauseText);
        recommendedRecipes = recs;

        if (effectiveShelf.length === 0 || recs.length === 0) {
          const emptyRecipeMsg =
            'Arre dost, abhi dukaan ke shelf par 0 items stock mein hain, isliye main abhi recipe suggest nahi kar pa rahi hoon. Jaise hi shopkeeper Pani Puri packet, Atta, Dal ya Masala add karenge, main turant aapko best dish aur uska saara saman suggest karungi!';
          brainSteps.push({
            id: `step_recipe_empty_${brainSteps.length}`,
            clause: clauseText,
            intent: 'recipe_recommendation',
            entityLabel: 'Culinary Brain Scan (0 Shelf Items Stocked)',
            resolution: emptyRecipeMsg,
            confidence: 0.99,
          });
          replyParts.push(emptyRecipeMsg);
        } else {
          const topRec = recs[0];
          const secondRec = recs[1];
          lastRecommendedRecipe = topRec.dishName;
          for (const ing of topRec.availableIngredients) {
            referencedSkuIds.push(ing.id);
          }

          const ingListText = topRec.availableIngredients
            .map((i) => `${i.name} (₹${i.price})`)
            .join(', ');

          const secondSuggestionText = secondRec
            ? ` Iske alawa aap "${secondRec.dishName}" (${secondRec.availableIngredients
                .map((i) => i.name)
                .join(', ')}) bhi bana sakte hain.`
            : '';

          const msg = `Arre wah! Aaj dukaan ke fresh stock ke hisaab se aap "${topRec.dishName}" bana sakte hain! Iske liye hamare paas ${ingListText} stock mein bilkul tayyar hai (Combo कुल ₹${topRec.bundlePrice}).${secondSuggestionText} Boliye, kya main "${topRec.dishName}" ka saara saman aapke bag mein add kar doon?`;

          brainSteps.push({
            id: `step_recipe_rec_${brainSteps.length}`,
            clause: clauseText,
            intent: 'recipe_recommendation',
            entityLabel: `Chef Recommendation: ${topRec.dishName} (${topRec.availableIngredients.length} items in stock)`,
            resolution: msg,
            confidence: 0.99,
          });
          replyParts.push(msg);
          followUpPrompt = `Boliye: "Haan add kar do" — aur main ${topRec.dishName} ke saare available items bag mein daal dungi!`;
        }
        break;
      }

      case 'recipe_bundle_add': {
        const recs = recommendRecipesFromShelf(effectiveShelf, clauseText);
        recommendedRecipes = recs;
        if (recs.length === 0 || effectiveShelf.length === 0) {
          reportUnavailableItems(['Recipe Ingredients'], clauseText, 'order');
        } else {
          const chosenRec = recs[0];
          lastRecommendedRecipe = chosenRec.dishName;
          if (!intents.includes('recipe_bundle_add')) intents.push('recipe_bundle_add');
          if (!intents.includes('cart_add')) intents.push('cart_add');

          const addedBundleLabels: string[] = [];
          for (const sku of chosenRec.availableIngredients) {
            cartMutations.push({ sku, qty: 1, mode: 'add' });
            addedBundleLabels.push(`1× ${sku.name} (₹${sku.price})`);
            referencedSkuIds.push(sku.id);
          }

          const msg = `Bahut badhiya! "${chosenRec.dishName}" banane ke liye maine ${chosenRec.availableIngredients
            .map((s) => `1× ${s.name}`)
            .join(', ')} (कुल ₹${chosenRec.bundlePrice}) aapke kirana bag mein add kar diya hai!`;

          brainSteps.push({
            id: `step_recipe_bundle_${brainSteps.length}`,
            clause: clauseText,
            intent: 'recipe_bundle_add',
            entityLabel: `Added Recipe Kit: ${chosenRec.dishName}`,
            resolution: `Added ${addedBundleLabels.join(', ')}`,
            confidence: 0.99,
          });
          replyParts.push(msg);
        }
        break;
      }

      case 'greeting_help': {
        if (!intents.includes('greeting_help')) intents.push('greeting_help');
        const custGreetingName = ctx.auth?.name || prevMemory.customerName;
        const pastSummaries = prevMemory.pastTurnsSummary || [];
        const memoryGreeting =
          pastSummaries.length > 0
            ? ` Mujhe yaad hai pichli baar humne "${pastSummaries[0]}" par baat ki thi.`
            : '';
        const stockNote =
          effectiveShelf.length > 0
            ? `Abhi dukaan mein ${effectiveShelf.length} items stock mein uplabdh hain — aap mujhse "Aaj khane mein kya banao?" bhi pooch sakte hain!`
            : 'Abhi dukaan ke shelf par koi item stock mein nahi hai.';
        const msg = `Namaste${custGreetingName ? ` ${custGreetingName}` : ''} ji! Main aapki SuchiQO human kirana assistant bol rahi hoon.${memoryGreeting} ${stockNote} Boliye, aaj main aapki kya sewa karoon?`;
        brainSteps.push({
          id: `step_help_${brainSteps.length}`,
          clause: clauseText,
          intent: 'greeting_help',
          entityLabel: 'Human Conversational Greeting + Memory Recall',
          resolution: msg,
          confidence: 0.99,
        });
        replyParts.push(msg);
        break;
      }

      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  // 5. COMPUTE UPDATED CART STATE FOR BILL QUERIES & CHECKOUT CONFIRMATION
  // -------------------------------------------------------------------------
  let simulatedCart: CartItem[] = shouldClearCart ? [] : [...ctx.cart];
  for (const mut of cartMutations) {
    const delta = mut.mode === 'remove' ? -mut.qty : mut.qty;
    simulatedCart = mutateCartItems(simulatedCart, effectiveShelf, mut.sku.id, delta);
  }
  const simulatedSummary = computeCartSummary(simulatedCart);

  if (cartQueryRequested) {
    if (simulatedCart.length === 0) {
      const msg = 'Abhi aapka kirana bag khali hai (₹0).';
      brainSteps.push({
        id: `step_cart_q_${brainSteps.length}`,
        clause: 'Cart / Bill Summary',
        intent: 'cart_query',
        entityLabel: 'Bag Total: ₹0 (0 items)',
        resolution: msg,
        confidence: 0.99,
      });
      replyParts.push(msg);
    } else {
      const itemsText = simulatedCart.map((c) => `${c.qty}× ${c.name}`).join(', ');
      const msg = `Aapke bag mein ${simulatedSummary.itemCount} items (${itemsText}) hain. Kul payable bill ₹${simulatedSummary.totalPayable} hai (MRP par ₹${simulatedSummary.totalSavings} bachat).`;
      brainSteps.push({
        id: `step_cart_q_${brainSteps.length}`,
        clause: 'Cart / Bill Summary',
        intent: 'cart_query',
        entityLabel: `Bag Total: ₹${simulatedSummary.totalPayable} (${simulatedSummary.itemCount} items)`,
        resolution: msg,
        confidence: 0.99,
      });
      replyParts.push(msg);
    }
  }

  if (shouldPlaceOrder) {
    if (simulatedCart.length === 0) {
      shouldPlaceOrder = false;
      const msg =
        'Maaf kijiyega, abhi aapka bag khali hai. Order confirm karne se pehle dukaan ke uplabdh stock mein se items add karein.';
      brainSteps.push({
        id: `step_chk_empty_${brainSteps.length}`,
        clause: 'Order Confirmation',
        intent: 'checkout_confirm',
        entityLabel: 'Checkout Guard (Empty Bag)',
        resolution: msg,
        confidence: 0.95,
      });
      replyParts.push(msg);
    } else {
      const msg = `Bahut badhiya! Aapka order (${simulatedSummary.itemCount} items, कुल ₹${simulatedSummary.totalPayable}) confirm karke dukaan ko bhej diya gaya hai!`;
      brainSteps.push({
        id: `step_chk_ok_${brainSteps.length}`,
        clause: 'Order Confirmation',
        intent: 'checkout_confirm',
        entityLabel: `Order Dispatched: ₹${simulatedSummary.totalPayable}`,
        resolution: msg,
        confidence: 0.99,
      });
      replyParts.push(msg);
    }
  }

  // -------------------------------------------------------------------------
  // 6. FALLBACK IF NO INTENT MATCHED YET
  // -------------------------------------------------------------------------
  if (intents.length === 0) {
    const customLabel = extractRequestedCustomItemLabel(phrase);
    if (customLabel) {
      reportUnavailableItems([customLabel], phrase, 'stock');
    } else {
      intents.push('unmatched');
      const availNote =
        effectiveShelf.length > 0
          ? `Abhi dukaan mein ${effectiveShelf
              .slice(0, 4)
              .map((s) => `${s.name} (₹${s.price})`)
              .join(', ')} uplabdh hai.`
          : 'Abhi dukaan ke shelf par koi saman stock mein nahi hai.';
      const fallbackMsg = `Ji, maine suna: "${phrase}". ${availNote} Aap mujhse "Aaj khane mein kya banao?", uplabdh items ka rate, order schedule, ya payment mode pooch sakte hain.`;
      brainSteps.push({
        id: 'step_unmatched_0',
        clause: phrase,
        intent: 'unmatched',
        entityLabel: 'Conversational Query',
        resolution: fallbackMsg,
        confidence: 0.9,
      });
      replyParts.push(fallbackMsg);
    }
  }

  // Determine primaryAction for compatibility with VoiceIntentOutcome
  let primaryAction: VoiceIntentOutcome['action'] = 'unmatched';
  if (intents.includes('cart_add') || intents.includes('recipe_bundle_add')) {
    primaryAction = 'cart_add';
  } else if (intents.includes('gps_trigger')) {
    primaryAction = 'gps_trigger';
  } else if (
    intents.includes('stock_query') ||
    intents.includes('price_query') ||
    intents.includes('recipe_recommendation') ||
    intents.includes('memory_recall') ||
    intents.includes('item_unavailable') ||
    intents.includes('cart_query') ||
    intents.includes('delivery_query') ||
    intents.includes('payment_query') ||
    intents.includes('payment_select') ||
    intents.includes('schedule_order') ||
    intents.includes('address_select') ||
    intents.includes('order_status_query') ||
    intents.includes('store_info_query') ||
    intents.includes('greeting_help') ||
    intents.includes('profile_input') ||
    intents.includes('erp_mutation') ||
    intents.includes('checkout_confirm') ||
    intents.includes('cart_remove') ||
    intents.includes('cart_clear')
  ) {
    primaryAction = 'stock_query';
  }

  const firstAdded = cartMutations.find((m) => m.mode === 'add');
  const queriedOnlyIds = [
    ...Array.from(priceQueriedSkuIds),
    ...Array.from(stockQueriedSkuIds),
  ];

  const updatedTurnsSummary = [
    phrase,
    ...(prevMemory.pastTurnsSummary || []).filter((t) => t !== phrase),
  ].slice(0, 12);

  const addedItemNames = cartMutations
    .filter((m) => m.mode === 'add')
    .map((m) => m.sku.name);
  const updatedFavorites = Array.from(
    new Set([...addedItemNames, ...(prevMemory.favoriteItemNames || [])])
  ).slice(0, 10);

  const nextMemory: VoiceConversationMemory = {
    lastReferencedSkuIds:
      queriedOnlyIds.length > 0
        ? Array.from(new Set(queriedOnlyIds))
        : referencedSkuIds.length > 0
        ? Array.from(new Set(referencedSkuIds))
        : prevMemory.lastReferencedSkuIds,
    lastRecommendedRecipe,
    pastTurnsSummary: updatedTurnsSummary,
    customerName: ctx.auth?.name || prevMemory.customerName,
    favoriteItemNames: updatedFavorites,
    pendingQuestionTopic: followUpPrompt ? 'confirm_add' : null,
    turnCount: prevMemory.turnCount + 1,
  };

  const combinedReply = replyParts.join(' ');
  const spokenReply = humanizeTextForSpeech(combinedReply);

  return {
    primaryAction,
    intents,
    reply: combinedReply,
    spokenReply,
    followUpPrompt,
    brainSteps,
    cartMutations,
    autoHydratedSkus,
    unavailableItemNames,
    profileInput,
    erpMutations,
    shouldClearCart,
    shouldPlaceOrder,
    navigateToRoute,
    switchCustomerTab,
    selectedPaymentMode,
    scheduleUpdate,
    selectedAddressTag,
    recommendedRecipes,
    updatedMemory: nextMemory,
    matchedSku: firstAdded?.sku,
    qty: firstAdded?.qty || 0,
  };
}

/**
 * Pure cart mutation function
 */
export function mutateCartItems(
  cart: CartItem[],
  shelf: ShelfItem[],
  skuId: string,
  delta: number
): CartItem[] {
  const sku = shelf.find((s) => s.id === skuId);
  if (!sku) return cart;

  const existingIndex = cart.findIndex((c) => c.id === skuId);
  if (existingIndex === -1) {
    if (delta > 0 && sku.stock >= delta) {
      return [...cart, { ...sku, qty: delta }];
    }
    return cart;
  }

  const nextQty = cart[existingIndex].qty + delta;
  if (nextQty <= 0) {
    return cart.filter((c) => c.id !== skuId);
  }
  if (nextQty <= sku.stock) {
    return cart.map((item, idx) =>
      idx === existingIndex ? { ...item, qty: nextQty } : item
    );
  }
  return cart;
}

/**
 * Computes cart totals and MRP savings
 */
export function computeCartSummary(cart: CartItem[]) {
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPayable = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalMrp = cart.reduce((sum, item) => sum + item.mrp * item.qty, 0);
  const totalSavings = Math.max(0, totalMrp - totalPayable);
  return {
    lineCount: cart.length,
    itemCount,
    totalPayable,
    totalMrp,
    totalSavings,
  };
}

/**
 * Computes ERP Console KPIs
 */
export function computeErpKpis(
  orders: OrderRecord[],
  shelf: ShelfItem[],
  cashbook: CashbookEntry[],
  khata: KhataEntry[]
) {
  const orderCount = orders.length;
  const salesRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const publishedSkus = shelf.length;
  const netCashbook = cashbook.reduce(
    (sum, c) => sum + (c.type === 'income' ? c.amount : -c.amount),
    0
  );
  const netKhataReceivable = khata.reduce(
    (sum, k) => sum + (k.type === 'udhaar' ? k.amount : -k.amount),
    0
  );
  return {
    orderCount,
    salesRevenue,
    publishedSkus,
    netCashbook,
    netKhataReceivable,
  };
}

/**
 * Updates the status of a specific OrderRecord by ID
 */
export function updateOrderRecordStatus(
  orders: OrderRecord[],
  orderId: string,
  nextStatus: OrderRecord['status']
): OrderRecord[] {
  return orders.map((order) =>
    order.id === orderId ? { ...order, status: nextStatus } : order
  );
}

/**
 * Filters OrderRecord items for the Customer Storefront Order History tab
 */
export function filterCustomerOrders(
  orders: OrderRecord[],
  statusFilter: 'all' | 'completed' | OrderRecord['status'] = 'all',
  customerName?: string
): OrderRecord[] {
  return orders.filter((order) => {
    if (
      customerName &&
      customerName.trim() !== '' &&
      order.customerName.toLowerCase() !== customerName.trim().toLowerCase()
    ) {
      return false;
    }
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return order.status === 'Delivered';
    return order.status === statusFilter;
  });
}

/**
 * Gnani AI (Vachana Prisma v3.0 STT & Timbre v3.0 TTS) Voice Model Integration
 */
export type GnaniLanguageCode =
  | 'hi-IN'
  | 'en-IN'
  | 'mr-IN'
  | 'ta-IN'
  | 'te-IN'
  | 'gu-IN'
  | 'kn-IN'
  | 'bn-IN'
  | 'pa-IN';

export type GnaniVoicePersonaId =
  | 'ananya-hinglish'
  | 'aarav-kirana'
  | 'rohan-en-in'
  | 'meera-indic';

export type GnaniAcousticMode =
  | 'prisma-v3-hinglish'
  | 'prisma-v3-telephony-8khz';

export interface GnaniLanguageOption {
  code: GnaniLanguageCode;
  label: string;
  dialectNote: string;
  samplePrompt: string;
}

export interface GnaniVoicePersona {
  id: GnaniVoicePersonaId;
  name: string;
  timbreModel: string;
  style: string;
  pitch: number;
  rate: number;
}

export interface GnaniAcousticModeOption {
  id: GnaniAcousticMode;
  name: string;
  sttModel: string;
  samplingRate: string;
  description: string;
}

export interface GnaniVoiceTelemetry {
  engineName: string;
  sttModel: string;
  ttsModel: string;
  languageCode: GnaniLanguageCode;
  languageLabel: string;
  personaId: GnaniVoicePersonaId;
  personaName: string;
  acousticMode: GnaniAcousticMode;
  acousticModeLabel: string;
  confidence: number;
  codeMixRatio: string;
  ttsPitch: number;
  ttsRate: number;
  apiEndpoint: string;
}

export const GNANI_LANGUAGES: GnaniLanguageOption[] = [
  {
    code: 'hi-IN',
    label: 'Hinglish / Hindi (hi-IN)',
    dialectNote: 'Code-Mixed Hindi + English Kirana NLU',
    samplePrompt: 'Atta kitne ka hai, 2 Tata Salt aur 1 Amul Milk add karo, aur total bill batao',
  },
  {
    code: 'en-IN',
    label: 'Indian English (en-IN)',
    dialectNote: 'Indian Accent Retail & Grocery NLU',
    samplePrompt: 'What is the price of Basmati Rice, add 2 Aashirvaad Atta and 1 Butter, and tell my total bill',
  },
  {
    code: 'mr-IN',
    label: 'Marathi + Hinglish (mr-IN)',
    dialectNote: 'Maharashtra Kirana Dialect',
    samplePrompt: 'Atta kitne ka hai aur 2 Tata Salt cart mein add karo',
  },
  {
    code: 'gu-IN',
    label: 'Gujarati + Hinglish (gu-IN)',
    dialectNote: 'Gujarat Retail Dialect',
    samplePrompt: '2 Aashirvaad Atta aur 1 Amul Milk add karo aur total bill batao',
  },
  {
    code: 'ta-IN',
    label: 'Tamil + English (ta-IN)',
    dialectNote: 'Tamil Nadu Maligai Store Dialect',
    samplePrompt: 'Add 2 Tata Salt and 1 Amul Milk and check delivery time',
  },
  {
    code: 'te-IN',
    label: 'Telugu + English (te-IN)',
    dialectNote: 'Telugu Kirana Store Dialect',
    samplePrompt: 'Price of Basmati Rice and add 2 Aashirvaad Atta to cart',
  },
  {
    code: 'kn-IN',
    label: 'Kannada + English (kn-IN)',
    dialectNote: 'Karnataka Provision Store Dialect',
    samplePrompt: 'Add 1 Fortune Oil and 2 Maggi and tell total bill',
  },
  {
    code: 'bn-IN',
    label: 'Bengali + English (bn-IN)',
    dialectNote: 'Mudi Dokan Dialect',
    samplePrompt: '2 packet Aashirvaad Atta aur 1 Tata Tea add karo',
  },
  {
    code: 'pa-IN',
    label: 'Punjabi + Hinglish (pa-IN)',
    dialectNote: 'Punjab Kirana Dialect',
    samplePrompt: '2 Aashirvaad Atta te 2 Amul Butter add karo aur bill batao',
  },
];

export const GNANI_VOICE_PERSONAS: GnaniVoicePersona[] = [
  {
    id: 'ananya-hinglish',
    name: 'Ananya (Natural Hinglish Concierge)',
    timbreModel: 'Gnani Timbre v3.0 Expressive',
    style: 'Warm, Friendly Human Kirana Assistant',
    pitch: 1.0,
    rate: 0.98,
  },
  {
    id: 'aarav-kirana',
    name: 'Aarav (Warm Store Owner Voice)',
    timbreModel: 'Gnani Timbre v3.0 Retail',
    style: 'Polite Neighborhood Shopkeeper',
    pitch: 0.96,
    rate: 0.98,
  },
  {
    id: 'rohan-en-in',
    name: 'Rohan (Natural Indian English)',
    timbreModel: 'Gnani Timbre v3.0 Bilingual',
    style: 'Natural Conversational English + Hindi',
    pitch: 0.98,
    rate: 0.97,
  },
  {
    id: 'meera-indic',
    name: 'Meera (Expressive Multi-Indic)',
    timbreModel: 'Gnani Timbre v3.0 Zero-Shot',
    style: 'Natural Regional Dialect Prosody',
    pitch: 1.01,
    rate: 0.97,
  },
];

export const GNANI_ACOUSTIC_MODES: GnaniAcousticModeOption[] = [
  {
    id: 'prisma-v3-hinglish',
    name: 'Gnani Prisma v3.0 (Code-Mixed Hinglish 16kHz)',
    sttModel: 'Gnani Prisma v3.0 Wideband',
    samplingRate: '16kHz Code-Switch NLU',
    description: 'Optimized for rapid Hindi-English mid-sentence switching and kirana brand names.',
  },
  {
    id: 'prisma-v3-telephony-8khz',
    name: 'Gnani Prisma v3.0 (Noisy Market / 8kHz PSTN)',
    sttModel: 'Gnani Prisma v3.0 Far-Field',
    samplingRate: '8kHz Noise-Suppressed',
    description: 'High noise suppression for busy street markets and kirana counter microphones.',
  },
];

export function buildGnaniVoiceTelemetry(
  phrase: string,
  languageCode: GnaniLanguageCode,
  personaId: GnaniVoicePersonaId,
  acousticMode: GnaniAcousticMode,
  outcome: VoiceIntentOutcome
): GnaniVoiceTelemetry {
  const langObj =
    GNANI_LANGUAGES.find((l) => l.code === languageCode) || GNANI_LANGUAGES[0];
  const personaObj =
    GNANI_VOICE_PERSONAS.find((p) => p.id === personaId) ||
    GNANI_VOICE_PERSONAS[0];
  const modeObj =
    GNANI_ACOUSTIC_MODES.find((m) => m.id === acousticMode) ||
    GNANI_ACOUSTIC_MODES[0];

  const words = String(phrase || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const hindiTokens = words.filter((w) =>
    /^(kya|mil|sakta|hai|mujhe|aaj|do|ek|teen|char|paanch|aadha|pao|dukaan|kahan|mera|meri|bhej|la|de|karo|aahe|chhe|undi|irukku|kitne|ka|aur|bill|batao|naam|udhaar|kharcha)$/i.test(
      w.replace(/[^a-zA-Z]/g, '')
    )
  ).length;
  const hiPct =
    words.length > 0
      ? Math.min(90, Math.max(25, Math.round((hindiTokens / words.length) * 100)))
      : 50;
  const enPct = 100 - hiPct;

  const confidence =
    outcome.action === 'cart_add'
      ? 0.98
      : outcome.action === 'stock_query' || outcome.action === 'gps_trigger'
      ? 0.96
      : 0.92;

  return {
    engineName: 'Gnani.ai Vachana Voice Stack',
    sttModel: modeObj.sttModel,
    ttsModel: personaObj.timbreModel,
    languageCode: langObj.code,
    languageLabel: langObj.label,
    personaId: personaObj.id,
    personaName: personaObj.name,
    acousticMode: modeObj.id,
    acousticModeLabel: modeObj.name,
    confidence,
    codeMixRatio: `${hiPct}% Indic / ${enPct}% EN`,
    ttsPitch: personaObj.pitch,
    ttsRate: personaObj.rate,
    apiEndpoint: 'https://api.vachana.ai/v1',
  };
}

/**
 * ============================================================================
 * PROFILE, ORDER HISTORY & VOICE LEDGER PURE LOGIC (#/profile)
 * ============================================================================
 */
export interface CustomerProfileKpis {
  totalOrdersPlaced: number;
  totalSpent: number;
  lifetimeMrpSavings: number;
  runningUdhaarDues: number;
}

export interface FrequentOrderItem {
  skuId: string;
  name: string;
  unit: string;
  mrp: number;
  price: number;
  emoji: string;
  timesOrdered: number;
  totalUnitsOrdered: number;
  inStock: boolean;
  availableStock: number;
}

export interface PakkaGstInvoiceLine {
  skuId: string;
  name: string;
  hsn: string;
  qty: number;
  unit: string;
  mrp: number;
  unitPrice: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  lineTotal: number;
  lineSavings: number;
}

export interface PakkaGstInvoice {
  invoiceNumber: string;
  orderId: string;
  createdAt: string;
  storeName: string;
  storeGstin: string;
  storeAddress: string;
  storePhone: string;
  customerName: string;
  deliveryAddress: string;
  paymentMode: string;
  handoverOtp: string;
  lines: PakkaGstInvoiceLine[];
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  grandTotal: number;
  totalMrpSavings: number;
}

export function computeCustomerProfileKpis(
  orders: OrderRecord[],
  khata: KhataEntry[],
  customerName?: string
): CustomerProfileKpis {
  const normName = customerName ? customerName.trim().toLowerCase() : '';
  const custOrders = normName
    ? orders.filter((o) => o.customerName.trim().toLowerCase() === normName)
    : orders;

  const totalOrdersPlaced = custOrders.length;
  const totalSpent = custOrders.reduce((sum, o) => sum + o.total, 0);
  const lifetimeMrpSavings = custOrders.reduce((sum, o) => {
    if (typeof o.mrpSavings === 'number') {
      return sum + o.mrpSavings;
    }
    if (o.lineItems && o.lineItems.length > 0) {
      return (
        sum +
        o.lineItems.reduce(
          (lineSum, li) => lineSum + Math.max(0, li.mrp - li.price) * li.qty,
          0
        )
      );
    }
    return sum;
  }, 0);

  const custKhata = normName
    ? khata.filter((k) => k.customerName.trim().toLowerCase() === normName)
    : khata;
  const rawUdhaar = custKhata.reduce(
    (sum, k) => (k.type === 'udhaar' ? sum + k.amount : sum - k.amount),
    0
  );

  return {
    totalOrdersPlaced,
    totalSpent,
    lifetimeMrpSavings,
    runningUdhaarDues: Math.max(0, rawUdhaar),
  };
}

export function aggregateFrequentOrderItems(
  orders: OrderRecord[],
  shelf: ShelfItem[],
  customerName?: string
): FrequentOrderItem[] {
  const normName = customerName ? customerName.trim().toLowerCase() : '';
  const custOrders = normName
    ? orders.filter((o) => o.customerName.trim().toLowerCase() === normName)
    : orders;

  const map = new Map<
    string,
    {
      skuId: string;
      name: string;
      unit: string;
      mrp: number;
      price: number;
      emoji: string;
      timesOrdered: number;
      totalUnitsOrdered: number;
    }
  >();

  for (const order of custOrders) {
    if (order.lineItems && order.lineItems.length > 0) {
      for (const li of order.lineItems) {
        const key = li.skuId || li.name.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.timesOrdered += 1;
          existing.totalUnitsOrdered += li.qty;
        } else {
          map.set(key, {
            skuId: li.skuId,
            name: li.name,
            unit: li.unit,
            mrp: li.mrp,
            price: li.price,
            emoji: li.emoji || '🛍️',
            timesOrdered: 1,
            totalUnitsOrdered: li.qty,
          });
        }
      }
    } else if (order.items) {
      // Parse text summary fallback e.g. "2 pack Tata Salt 1kg, 1 pack Amul Taaza Milk"
      const parts = order.items.split(',').map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        const m = part.match(/^(\d+)\s+(\S+)\s+(.+)$/);
        const qty = m ? parseInt(m[1], 10) : 1;
        const unit = m ? m[2] : 'pack';
        const rawName = m ? m[3].trim() : part;
        const matchedShelf = shelf.find(
          (s) => s.name.toLowerCase() === rawName.toLowerCase()
        );
        const key = matchedShelf ? matchedShelf.id : rawName.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.timesOrdered += 1;
          existing.totalUnitsOrdered += qty;
        } else {
          map.set(key, {
            skuId: matchedShelf ? matchedShelf.id : `hist_${key}`,
            name: matchedShelf ? matchedShelf.name : rawName,
            unit: matchedShelf ? matchedShelf.unit : unit,
            mrp: matchedShelf ? matchedShelf.mrp : 0,
            price: matchedShelf ? matchedShelf.price : 0,
            emoji: matchedShelf ? matchedShelf.emoji : '🛍️',
            timesOrdered: 1,
            totalUnitsOrdered: qty,
          });
        }
      }
    }
  }

  return Array.from(map.values())
    .map((item) => {
      const liveSku =
        shelf.find((s) => s.id === item.skuId) ||
        shelf.find((s) => s.name.toLowerCase() === item.name.toLowerCase());
      return {
        ...item,
        skuId: liveSku ? liveSku.id : item.skuId,
        mrp: liveSku ? liveSku.mrp : item.mrp,
        price: liveSku ? liveSku.price : item.price,
        emoji: liveSku ? liveSku.emoji : item.emoji,
        inStock: Boolean(liveSku && liveSku.stock > 0),
        availableStock: liveSku ? liveSku.stock : 0,
      };
    })
    .sort((a, b) => {
      if (b.timesOrdered !== a.timesOrdered) return b.timesOrdered - a.timesOrdered;
      return b.totalUnitsOrdered - a.totalUnitsOrdered;
    });
}

export function reorderItemsIntoCart(
  currentCart: CartItem[],
  order: OrderRecord,
  shelf: ShelfItem[]
): {
  nextCart: CartItem[];
  addedCount: number;
  unavailableNames: string[];
} {
  let nextCart = [...currentCart];
  let addedCount = 0;
  const unavailableNames: string[] = [];

  if (order.lineItems && order.lineItems.length > 0) {
    for (const li of order.lineItems) {
      const liveSku =
        shelf.find((s) => s.id === li.skuId) ||
        shelf.find((s) => s.name.toLowerCase() === li.name.toLowerCase());
      if (!liveSku || liveSku.stock <= 0) {
        unavailableNames.push(li.name);
        continue;
      }
      const existingInCart = nextCart.find((c) => c.id === liveSku.id)?.qty || 0;
      const maxAddable = Math.max(0, liveSku.stock - existingInCart);
      const qtyToAdd = Math.min(li.qty, maxAddable);
      if (qtyToAdd > 0) {
        nextCart = mutateCartItems(nextCart, shelf, liveSku.id, qtyToAdd);
        addedCount += qtyToAdd;
      } else {
        unavailableNames.push(li.name);
      }
    }
    return { nextCart, addedCount, unavailableNames };
  }

  // Fallback parser when lineItems array is not present on legacy OrderRecord
  const parts = (order.items || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)\s+(\S+)\s+(.+)$/);
    const qty = m ? parseInt(m[1], 10) : 1;
    const rawName = m ? m[3].trim() : part;
    const liveSku = shelf.find(
      (s) =>
        s.name.toLowerCase() === rawName.toLowerCase() ||
        rawName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (!liveSku || liveSku.stock <= 0) {
      unavailableNames.push(rawName);
      continue;
    }
    const existingInCart = nextCart.find((c) => c.id === liveSku.id)?.qty || 0;
    const maxAddable = Math.max(0, liveSku.stock - existingInCart);
    const qtyToAdd = Math.min(qty, maxAddable);
    if (qtyToAdd > 0) {
      nextCart = mutateCartItems(nextCart, shelf, liveSku.id, qtyToAdd);
      addedCount += qtyToAdd;
    } else {
      unavailableNames.push(rawName);
    }
  }

  return { nextCart, addedCount, unavailableNames };
}

export function advanceOrderFulfillmentStage(
  current: OrderFulfillmentStage
): OrderFulfillmentStage {
  if (current === 'Pending') return 'Packing';
  if (current === 'Packing' || current === 'Packed') return 'Out for Delivery';
  if (current === 'Out for Delivery') return 'Delivered';
  return 'Delivered';
}

export function buildPakkaGstInvoice(
  order: OrderRecord,
  store?: RegisteredStore | null
): PakkaGstInvoice {
  const rawLines: OrderLineItem[] =
    order.lineItems && order.lineItems.length > 0
      ? order.lineItems
      : [
          {
            skuId: 'sku_summary',
            name: order.items || 'Kirana Basket Items',
            qty: 1,
            unit: 'lot',
            mrp: order.total + (order.mrpSavings || 0),
            price: order.total,
            hsn: '210690',
          },
        ];

  const lines: PakkaGstInvoiceLine[] = rawLines.map((li, idx) => {
    const lineTotal = li.price * li.qty;
    const taxableValue = Math.round((lineTotal / 1.05) * 100) / 100;
    const totalGst = Math.max(0, Math.round((lineTotal - taxableValue) * 100) / 100);
    const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
    const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;
    const lineSavings = Math.max(0, (li.mrp - li.price) * li.qty);

    return {
      skuId: li.skuId || `line_${idx + 1}`,
      name: li.name,
      hsn: li.hsn || (idx % 2 === 0 ? '110100' : '040120'),
      qty: li.qty,
      unit: li.unit,
      mrp: li.mrp,
      unitPrice: li.price,
      taxableValue,
      cgstAmount,
      sgstAmount,
      lineTotal,
      lineSavings,
    };
  });

  const totalTaxable =
    Math.round(lines.reduce((s, l) => s + l.taxableValue, 0) * 100) / 100;
  const totalCgst =
    Math.round(lines.reduce((s, l) => s + l.cgstAmount, 0) * 100) / 100;
  const totalSgst =
    Math.round(lines.reduce((s, l) => s + l.sgstAmount, 0) * 100) / 100;
  const totalMrpSavings = lines.reduce((s, l) => s + l.lineSavings, 0);

  return {
    invoiceNumber: `SQ-INV-${order.id.replace(/[^0-9A-Za-z]/g, '')}`,
    orderId: order.id,
    createdAt: order.createdAt,
    storeName: order.storeName || store?.storeName || 'SuchiQO Verified Kirana Partner',
    storeGstin: store?.gstin || '27AABCS1429B1Z5',
    storeAddress: store?.address || 'Verified Neighborhood Kirana Sector',
    storePhone: store?.phone || '9876543210',
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress || 'Verified Customer Address',
    paymentMode: order.paymentMode || 'UPI QR',
    handoverOtp: order.handoverOtp || '4829',
    lines,
    totalTaxable,
    totalCgst,
    totalSgst,
    grandTotal: order.total,
    totalMrpSavings,
  };
}

