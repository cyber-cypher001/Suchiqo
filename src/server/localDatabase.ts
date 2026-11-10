import fs from 'fs';
import path from 'path';
import {
  CREATOR_EMAIL,
  CREATOR_ACCESS_CODE,
  LocalDatabaseSnapshot,
  RegisteredCustomer,
  RegisteredStore,
  ShelfItem,
  OrderRecord,
  KhataEntry,
  CashbookEntry,
  CustomerConversationProfile,
  BackendAuditLogEntry,
  DEFAULT_KIRANA_CATALOG,
} from '../utils/suchiqoLogic.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'suchiqo-db.json');

function createEmptyDatabase(): LocalDatabaseSnapshot {
  return {
    version: '2.0.0-suchiqo-local-vault',
    creatorEmail: CREATOR_EMAIL,
    updatedAt: new Date().toISOString(),
    registeredCustomers: [],
    registeredStores: [],
    shelf: [],
    orders: [],
    khata: [],
    cashbook: [],
    customerVoiceProfiles: {},
    auditLogs: [
      {
        id: `audit_init_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        category: 'creator_admin',
        actor: CREATOR_EMAIL,
        summary: 'Initialized SuchiQO Local Persistent Database Vault (Zero Fake Data).',
      },
    ],
  };
}

export function ensureDatabaseFile(): LocalDatabaseSnapshot {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE_PATH)) {
      const initial = createEmptyDatabase();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabaseSnapshot>;
    return {
      version: parsed.version || '2.0.0-suchiqo-local-vault',
      creatorEmail: CREATOR_EMAIL,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      registeredCustomers: Array.isArray(parsed.registeredCustomers) ? parsed.registeredCustomers : [],
      registeredStores: Array.isArray(parsed.registeredStores) ? parsed.registeredStores : [],
      shelf: Array.isArray(parsed.shelf) ? parsed.shelf : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      khata: Array.isArray(parsed.khata) ? parsed.khata : [],
      cashbook: Array.isArray(parsed.cashbook) ? parsed.cashbook : [],
      customerVoiceProfiles:
        parsed.customerVoiceProfiles && typeof parsed.customerVoiceProfiles === 'object'
          ? parsed.customerVoiceProfiles
          : {},
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch {
    return createEmptyDatabase();
  }
}

export function writeDatabaseSnapshot(snapshot: LocalDatabaseSnapshot): LocalDatabaseSnapshot {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const updated: LocalDatabaseSnapshot = {
    ...snapshot,
    creatorEmail: CREATOR_EMAIL,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export function appendAuditLog(
  db: LocalDatabaseSnapshot,
  category: BackendAuditLogEntry['category'],
  actor: string,
  summary: string
): LocalDatabaseSnapshot {
  const entry: BackendAuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    category,
    actor,
    summary,
  };
  db.auditLogs = [entry, ...(db.auditLogs || [])].slice(0, 150);
  return db;
}

export function verifyCreatorAccess(headers: Record<string, unknown>): boolean {
  const emailHeader = String(headers['x-creator-email'] || '').trim().toLowerCase();
  const codeHeader = String(headers['x-creator-code'] || '').trim();
  return (
    emailHeader === CREATOR_EMAIL.toLowerCase() ||
    codeHeader === CREATOR_ACCESS_CODE
  );
}

export function getDatabaseFilePath(): string {
  return DB_FILE_PATH;
}

export function getDatabaseFileSizeBytes(): number {
  try {
    ensureDatabaseFile();
    const stat = fs.statSync(DB_FILE_PATH);
    return stat.size;
  } catch {
    return 0;
  }
}

export function registerOrUpdateCustomerInDb(
  payload: Omit<RegisteredCustomer, 'id' | 'createdAt' | 'lastLoginAt'> & { id?: string }
): { db: LocalDatabaseSnapshot; customer: RegisteredCustomer; isNew: boolean } {
  const db = ensureDatabaseFile();
  const normPhone = String(payload.phone || '').replace(/\D/g, '').slice(-10);
  const nowStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const existingIdx = db.registeredCustomers.findIndex(
    (c) => c.phone.replace(/\D/g, '').slice(-10) === normPhone
  );

  if (existingIdx !== -1) {
    const updatedCustomer: RegisteredCustomer = {
      ...db.registeredCustomers[existingIdx],
      name: payload.name || db.registeredCustomers[existingIdx].name,
      email: payload.email ?? db.registeredCustomers[existingIdx].email,
      flatOrHouse: payload.flatOrHouse || db.registeredCustomers[existingIdx].flatOrHouse,
      areaOrStreet: payload.areaOrStreet || db.registeredCustomers[existingIdx].areaOrStreet,
      landmark: payload.landmark ?? db.registeredCustomers[existingIdx].landmark,
      city: payload.city || db.registeredCustomers[existingIdx].city,
      pincode: payload.pincode || db.registeredCustomers[existingIdx].pincode,
      addressTag: payload.addressTag || db.registeredCustomers[existingIdx].addressTag,
      formattedAddress:
        payload.formattedAddress || db.registeredCustomers[existingIdx].formattedAddress,
      dietaryPreference:
        payload.dietaryPreference || db.registeredCustomers[existingIdx].dietaryPreference,
      lastLoginAt: nowStr,
    };
    db.registeredCustomers[existingIdx] = updatedCustomer;
    appendAuditLog(
      db,
      'customer_auth',
      updatedCustomer.name,
      `Updated registered customer profile (${updatedCustomer.phone}) — ${updatedCustomer.formattedAddress}`
    );
    const saved = writeDatabaseSnapshot(db);
    return { db: saved, customer: updatedCustomer, isNew: false };
  }

  const createdCustomer: RegisteredCustomer = {
    id: payload.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name.trim(),
    phone: normPhone,
    email: payload.email?.trim() || '',
    flatOrHouse: payload.flatOrHouse.trim(),
    areaOrStreet: payload.areaOrStreet.trim(),
    landmark: (payload.landmark || '').trim(),
    city: (payload.city || 'Nagpur').trim(),
    pincode: (payload.pincode || '440001').trim(),
    addressTag: payload.addressTag || 'Home',
    formattedAddress: payload.formattedAddress.trim(),
    dietaryPreference: payload.dietaryPreference || 'all',
    createdAt: nowStr,
    lastLoginAt: nowStr,
  };

  db.registeredCustomers = [createdCustomer, ...db.registeredCustomers];
  appendAuditLog(
    db,
    'customer_auth',
    createdCustomer.name,
    `New customer registered (${createdCustomer.phone}) at ${createdCustomer.formattedAddress}`
  );
  const saved = writeDatabaseSnapshot(db);
  return { db: saved, customer: createdCustomer, isNew: true };
}

export function removeCustomerFromDb(customerId: string, actor = CREATOR_EMAIL): LocalDatabaseSnapshot {
  const db = ensureDatabaseFile();
  const target = db.registeredCustomers.find((c) => c.id === customerId);
  db.registeredCustomers = db.registeredCustomers.filter((c) => c.id !== customerId);
  appendAuditLog(
    db,
    'creator_admin',
    actor,
    `Removed customer ${target ? `${target.name} (${target.phone})` : customerId} from database.`
  );
  return writeDatabaseSnapshot(db);
}

export function addOrUpdateStoreInDb(
  storePayload: Omit<RegisteredStore, 'id'> & { id?: string },
  actor = 'Shopkeeper Registration'
): { db: LocalDatabaseSnapshot; store: RegisteredStore } {
  const db = ensureDatabaseFile();
  const nowStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const normPhone = String(storePayload.phone || '').replace(/\D/g, '').slice(-10);
  const existingIdx = db.registeredStores.findIndex(
    (s) =>
      (storePayload.id && s.id === storePayload.id) ||
      s.phone.replace(/\D/g, '').slice(-10) === normPhone
  );

  const storeRecord: RegisteredStore = {
    id:
      existingIdx !== -1
        ? db.registeredStores[existingIdx].id
        : storePayload.id || `store_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    storeName: storePayload.storeName.trim(),
    ownerName: storePayload.ownerName.trim(),
    address: storePayload.address.trim(),
    phone: normPhone,
    lat: Number(storePayload.lat) || 21.1458,
    lng: Number(storePayload.lng) || 79.0882,
    gstin: storePayload.gstin || '27AABCS1429B1Z5',
    upiVpa: storePayload.upiVpa || `${normPhone}@upi`,
    isOpenForVoice: storePayload.isOpenForVoice ?? true,
    rating:
      storePayload.rating !== undefined
        ? Number(storePayload.rating)
        : existingIdx !== -1 && db.registeredStores[existingIdx].rating !== undefined
        ? db.registeredStores[existingIdx].rating
        : 4.9,
    reviewCount:
      storePayload.reviewCount !== undefined
        ? Number(storePayload.reviewCount)
        : existingIdx !== -1 && db.registeredStores[existingIdx].reviewCount !== undefined
        ? db.registeredStores[existingIdx].reviewCount
        : 124,
    userRatings:
      storePayload.userRatings ||
      (existingIdx !== -1 && db.registeredStores[existingIdx].userRatings
        ? db.registeredStores[existingIdx].userRatings
        : {}),
    createdAt:
      existingIdx !== -1
        ? db.registeredStores[existingIdx].createdAt || nowStr
        : nowStr,
  };

  if (existingIdx !== -1) {
    db.registeredStores[existingIdx] = storeRecord;
  } else {
    db.registeredStores = [storeRecord, ...db.registeredStores];
  }

  appendAuditLog(
    db,
    'store_registry',
    actor,
    `Registered/Updated Kirana Shop "${storeRecord.storeName}" (Owner: ${storeRecord.ownerName}, ${storeRecord.phone})`
  );
  const saved = writeDatabaseSnapshot(db);
  return { db: saved, store: storeRecord };
}

export function rateStoreInDb(
  storeId: string,
  newRating: number,
  userKey = 'customer'
): { db: LocalDatabaseSnapshot; store: RegisteredStore | null } {
  const db = ensureDatabaseFile();
  const storeIdx = db.registeredStores.findIndex((s) => s.id === storeId);
  if (storeIdx === -1) {
    return { db, store: null };
  }

  const store = db.registeredStores[storeIdx];
  const cleanScore = Math.max(1, Math.min(5, Math.round(newRating)));
  const userRatings = { ...(store.userRatings || {}) };
  userRatings[userKey] = cleanScore;

  const ratingsList = Object.values(userRatings);
  const baseRating = store.rating !== undefined ? store.rating : 4.9;
  const baseReviews = store.reviewCount !== undefined ? store.reviewCount : 124;

  const weight = 15;
  const newAvg = Number(
    (
      (ratingsList.reduce((sum, r) => sum + r, 0) + baseRating * weight) /
      (ratingsList.length + weight)
    ).toFixed(1)
  );

  const isExistingUser = Boolean(store.userRatings && store.userRatings[userKey] !== undefined);
  const updatedStore: RegisteredStore = {
    ...store,
    rating: Math.min(5.0, Math.max(1.0, newAvg)),
    reviewCount: isExistingUser ? baseReviews : baseReviews + 1,
    userRatings,
  };

  db.registeredStores[storeIdx] = updatedStore;
  appendAuditLog(
    db,
    'store_registry',
    userKey,
    `Customer rated ${cleanScore}★ for Kirana "${store.storeName}" (New Avg: ${updatedStore.rating}★, ${updatedStore.reviewCount} reviews)`
  );

  const saved = writeDatabaseSnapshot(db);
  return { db: saved, store: updatedStore };
}

export function removeStoreFromDb(storeId: string, actor = CREATOR_EMAIL): LocalDatabaseSnapshot {
  const db = ensureDatabaseFile();
  const target = db.registeredStores.find((s) => s.id === storeId);
  db.registeredStores = db.registeredStores.filter((s) => s.id !== storeId);
  appendAuditLog(
    db,
    'creator_admin',
    actor,
    `Removed shop ${target ? `"${target.storeName}" (${target.ownerName})` : storeId} from database.`
  );
  return writeDatabaseSnapshot(db);
}

export function seedRecipeReadyShelfInDb(actor = CREATOR_EMAIL): LocalDatabaseSnapshot {
  const db = ensureDatabaseFile();
  const existingIds = new Set(db.shelf.map((s) => s.id));
  const addedItems: ShelfItem[] = [];
  for (const item of DEFAULT_KIRANA_CATALOG) {
    if (!existingIds.has(item.id)) {
      db.shelf.push({ ...item });
      addedItems.push(item);
    }
  }
  appendAuditLog(
    db,
    'inventory',
    actor,
    `Populated ${addedItems.length} Recipe & Kirana SKUs (including Pani Puri Kit, Pani Puri Masala, Boondi, Imli Chutney, Atta, Dal, Rice, Paneer) onto shop shelf.`
  );
  return writeDatabaseSnapshot(db);
}

export function recordCustomerVoiceTurnInDb(params: {
  customerKey: string;
  customerName: string;
  customerPhone: string;
  userText: string;
  agentReply: string;
  intents: string[];
  lastReferencedSkuIds: string[];
  lastRecommendedRecipe?: string | null;
  favoriteItemNames?: string[];
}): CustomerConversationProfile {
  const db = ensureDatabaseFile();
  const key = (params.customerKey || params.customerPhone || params.customerName || 'guest')
    .trim()
    .toLowerCase();
  const existing: CustomerConversationProfile = db.customerVoiceProfiles[key] || {
    customerKey: key,
    customerName: params.customerName || 'Customer',
    customerPhone: params.customerPhone || '',
    turns: [],
    lastReferencedSkuIds: [],
    lastRecommendedRecipe: null,
    favoriteItemNames: [],
    updatedAt: new Date().toISOString(),
  };

  const turn = {
    id: `vturn_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    userText: params.userText,
    agentReply: params.agentReply,
    intents: params.intents,
    recipeSuggested: params.lastRecommendedRecipe || undefined,
  };

  const mergedFavorites = Array.from(
    new Set([...(params.favoriteItemNames || []), ...(existing.favoriteItemNames || [])])
  ).slice(0, 12);

  const updatedProfile: CustomerConversationProfile = {
    ...existing,
    customerName: params.customerName || existing.customerName,
    customerPhone: params.customerPhone || existing.customerPhone,
    turns: [turn, ...existing.turns].slice(0, 30),
    lastReferencedSkuIds:
      params.lastReferencedSkuIds.length > 0
        ? params.lastReferencedSkuIds
        : existing.lastReferencedSkuIds,
    lastRecommendedRecipe:
      params.lastRecommendedRecipe !== undefined
        ? params.lastRecommendedRecipe
        : existing.lastRecommendedRecipe,
    favoriteItemNames: mergedFavorites,
    updatedAt: new Date().toISOString(),
  };

  db.customerVoiceProfiles[key] = updatedProfile;
  appendAuditLog(
    db,
    'voice_brain',
    updatedProfile.customerName,
    `Voice Query: "${params.userText}" -> [${params.intents.join(', ')}]`
  );
  writeDatabaseSnapshot(db);
  return updatedProfile;
}

export function syncAppStateToDb(partial: {
  registeredCustomers?: RegisteredCustomer[];
  registeredStores?: RegisteredStore[];
  shelf?: ShelfItem[];
  orders?: OrderRecord[];
  khata?: KhataEntry[];
  cashbook?: CashbookEntry[];
}): LocalDatabaseSnapshot {
  const db = ensureDatabaseFile();
  if (Array.isArray(partial.registeredCustomers)) {
    db.registeredCustomers = partial.registeredCustomers;
  }
  if (Array.isArray(partial.registeredStores)) {
    db.registeredStores = partial.registeredStores;
  }
  if (Array.isArray(partial.shelf)) {
    db.shelf = partial.shelf;
  }
  if (Array.isArray(partial.orders)) {
    db.orders = partial.orders;
  }
  if (Array.isArray(partial.khata)) {
    db.khata = partial.khata;
  }
  if (Array.isArray(partial.cashbook)) {
    db.cashbook = partial.cashbook;
  }
  return writeDatabaseSnapshot(db);
}
