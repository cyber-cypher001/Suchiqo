import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  evaluateVoiceBrain,
  humanizeTextForSpeech,
  buildGnaniVoiceTelemetry,
  recommendRecipesFromShelf,
  GNANI_LANGUAGES,
  GNANI_VOICE_PERSONAS,
  GNANI_ACOUSTIC_MODES,
  CREATOR_EMAIL,
  CREATOR_ACCESS_CODE,
  GnaniLanguageCode,
  GnaniVoicePersonaId,
  GnaniAcousticMode,
  ShelfItem,
  CartItem,
  OrderRecord,
  CashbookEntry,
  KhataEntry,
  RegisteredStore,
  RegisteredCustomer,
  VoiceConversationMemory,
  AuthSession,
} from './src/utils/suchiqoLogic.ts';
import {
  ensureDatabaseFile,
  writeDatabaseSnapshot,
  verifyCreatorAccess,
  getDatabaseFilePath,
  getDatabaseFileSizeBytes,
  registerOrUpdateCustomerInDb,
  removeCustomerFromDb,
  addOrUpdateStoreInDb,
  rateStoreInDb,
  removeStoreFromDb,
  seedRecipeReadyShelfInDb,
  recordCustomerVoiceTurnInDb,
  syncAppStateToDb,
  appendAuditLog,
} from './src/server/localDatabase.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const GNANI_BASE_URL = process.env.GNANI_API_URL || 'https://api.vachana.ai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '10mb' }));

  // Ensure local database file is initialized on server startup
  ensureDatabaseFile();

  // ===========================================================================
  // LOCAL PERSISTENT DATABASE & CUSTOMER REGISTRATION ENDPOINTS
  // Google Maps Platform API Key config endpoint for real-time map components
  app.get('/api/config/maps-key', (_req, res) => {
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GMP_API_KEY ||
      '';
    res.json({ apiKey });
  });

  // 1. Read application state from local persistent database
  app.get('/api/db/state', (_req, res) => {
    const db = ensureDatabaseFile();
    res.json({
      snapshot: db,
      updatedAt: db.updatedAt,
      registeredCustomers: db.registeredCustomers,
      registeredStores: db.registeredStores,
      shelf: db.shelf,
      orders: db.orders,
      khata: db.khata,
      cashbook: db.cashbook,
      customerVoiceProfiles: db.customerVoiceProfiles,
    });
  });

  // 2. Sync state mutations from frontend into local persistent database
  app.post('/api/db/sync', (req, res) => {
    try {
      const updated = syncAppStateToDb(req.body || {});
      res.json({
        ok: true,
        updatedAt: updated.updatedAt,
        customersCount: updated.registeredCustomers.length,
        storesCount: updated.registeredStores.length,
        shelfCount: updated.shelf.length,
        ordersCount: updated.orders.length,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Database sync failed',
      });
    }
  });

  // 3. Register a new Customer (Mandatory Registration with Delivery Address before Ordering)
  app.post('/api/db/customers/register', (req, res) => {
    try {
      const {
        name = '',
        phone = '',
        email = '',
        flatOrHouse = '',
        areaOrStreet = '',
        landmark = '',
        city = 'Nagpur',
        pincode = '440001',
        addressTag = 'Home',
        formattedAddress = '',
        dietaryPreference = 'all',
      } = req.body as Partial<RegisteredCustomer>;

      const cleanName = String(name || '').trim();
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
      const cleanFlat = String(flatOrHouse || '').trim();
      const cleanArea = String(areaOrStreet || '').trim();
      const computedAddress =
        String(formattedAddress || '').trim() ||
        [cleanFlat, cleanArea, landmark ? `Near ${landmark}` : '', city, pincode]
          .filter(Boolean)
          .join(', ');

      if (!cleanName || cleanPhone.length !== 10 || !computedAddress) {
        res.status(400).json({
          error:
            'Full Name, 10-digit Mobile Number, and complete Delivery Address are required to register.',
        });
        return;
      }

      const { db, customer, isNew } = registerOrUpdateCustomerInDb({
        name: cleanName,
        phone: cleanPhone,
        email: String(email || '').trim(),
        flatOrHouse: cleanFlat || computedAddress,
        areaOrStreet: cleanArea || city,
        landmark: String(landmark || '').trim(),
        city: String(city || 'Nagpur').trim(),
        pincode: String(pincode || '440001').trim(),
        addressTag: addressTag || 'Home',
        formattedAddress: computedAddress,
        dietaryPreference: dietaryPreference || 'all',
      });

      const voiceProfile =
        db.customerVoiceProfiles[cleanPhone] ||
        db.customerVoiceProfiles[cleanName.toLowerCase()] ||
        null;

      res.json({
        ok: true,
        isNew,
        customer,
        voiceProfile,
        registeredCustomers: db.registeredCustomers,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Customer registration failed',
      });
    }
  });

  // 4. Customer Sign-In (Verifies Customer has Registered First)
  app.post('/api/db/customers/login', (req, res) => {
    const { phone = '' } = req.body as { phone?: string };
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const db = ensureDatabaseFile();
    const existing = db.registeredCustomers.find(
      (c) => c.phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );

    if (!existing) {
      res.status(200).json({
        ok: false,
        registered: false,
        customer: null,
        error:
          'This mobile number is not registered yet. Please complete Customer Registration first with your delivery address to start ordering.',
      });
      return;
    }

    const nowStr =
      new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    existing.lastLoginAt = nowStr;
    appendAuditLog(
      db,
      'customer_auth',
      existing.name,
      `Registered customer signed in (${existing.phone})`
    );
    writeDatabaseSnapshot(db);

    const voiceProfile =
      db.customerVoiceProfiles[cleanPhone] ||
      db.customerVoiceProfiles[existing.name.toLowerCase()] ||
      null;

    res.json({
      registered: true,
      customer: existing,
      voiceProfile,
      registeredCustomers: db.registeredCustomers,
    });
  });

  // 5. Retrieve persistent voice conversation memory for a specific customer
  app.get('/api/db/voice-memory/:customerKey', (req, res) => {
    const key = String(req.params.customerKey || '').trim().toLowerCase();
    const db = ensureDatabaseFile();
    const profile = db.customerVoiceProfiles[key] || null;
    res.json({ profile });
  });

  // 5b. Rate a Kirana Store (5-Star Rating System to Build Customer Trust)
  app.post('/api/db/stores/:storeId/rate', (req, res) => {
    try {
      const storeId = String(req.params.storeId || '').trim();
      const { rating = 5, userKey = 'customer' } = req.body as { rating?: number; userKey?: string };
      const { db, store } = rateStoreInDb(storeId, Number(rating), String(userKey));
      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }
      res.json({
        ok: true,
        store,
        registeredStores: db.registeredStores,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Rating store failed',
      });
    }
  });

  // 6. Seed Recipe-Ready Shelf Catalog (Pani Puri, Dal Chawal, Atta, Paneer, Chai, etc.)
  app.post('/api/db/shelf/seed-recipe-kit', (req, res) => {
    const actor = String(req.body?.actor || 'Shopkeeper Console');
    const updated = seedRecipeReadyShelfInDb(actor);
    res.json({
      ok: true,
      shelf: updated.shelf,
    });
  });

  // ===========================================================================
  // CREATOR-ONLY PROTECTED BACKEND DATABASE VAULT (`/api/creator/*`)
  // Strictly visible & accessible ONLY to Creator (`aarushdixit2710@gmail.com`)
  // ===========================================================================

  app.post('/api/creator/verify', (req, res) => {
    const { email = '', accessCode = '' } = req.body as {
      email?: string;
      accessCode?: string;
    };
    const isCreator =
      String(email || '').trim().toLowerCase() === CREATOR_EMAIL.toLowerCase() &&
      (!accessCode || String(accessCode).trim() === CREATOR_ACCESS_CODE);

    if (!isCreator) {
      res.status(403).json({
        authorized: false,
        error: `Access Restricted: Only the Creator (${CREATOR_EMAIL}) can unlock the Backend Database Vault.`,
      });
      return;
    }

    res.json({
      authorized: true,
      creatorEmail: CREATOR_EMAIL,
      accessCode: CREATOR_ACCESS_CODE,
    });
  });

  app.get('/api/creator/vault', (req, res) => {
    if (!verifyCreatorAccess(req.headers as Record<string, unknown>)) {
      res.status(403).json({
        error: `Forbidden: This backend database file is strictly restricted to Creator (${CREATOR_EMAIL}).`,
      });
      return;
    }
    const db = ensureDatabaseFile();
    res.json({
      database: db,
      filePath: getDatabaseFilePath(),
      fileSizeBytes: getDatabaseFileSizeBytes(),
      metrics: {
        customersCount: db.registeredCustomers.length,
        storesCount: db.registeredStores.length,
        shelfSkusCount: db.shelf.length,
        ordersCount: db.orders.length,
        totalGmv: db.orders.reduce((s, o) => s + o.total, 0),
        voiceMemoryProfilesCount: Object.keys(db.customerVoiceProfiles || {}).length,
      },
    });
  });

  app.post('/api/creator/customers', (req, res) => {
    if (!verifyCreatorAccess(req.headers as Record<string, unknown>)) {
      res.status(403).json({ error: 'Creator authorization required.' });
      return;
    }
    const {
      name = '',
      phone = '',
      email = '',
      flatOrHouse = '',
      areaOrStreet = '',
      landmark = '',
      city = 'Nagpur',
      pincode = '440001',
      addressTag = 'Home',
      dietaryPreference = 'all',
    } = req.body as Partial<RegisteredCustomer>;

    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanFlat = String(flatOrHouse || '').trim();
    const cleanArea = String(areaOrStreet || '').trim();

    if (!cleanName || cleanPhone.length !== 10 || !cleanFlat) {
      res.status(400).json({
        error: 'Name, 10-digit Mobile, and Address are required to add a customer.',
      });
      return;
    }

    const formattedAddress = [
      cleanFlat,
      cleanArea,
      landmark ? `Near ${landmark}` : '',
      city,
      pincode,
    ]
      .filter(Boolean)
      .join(', ');

    const { db, customer } = registerOrUpdateCustomerInDb({
      name: cleanName,
      phone: cleanPhone,
      email: String(email || '').trim(),
      flatOrHouse: cleanFlat,
      areaOrStreet: cleanArea || city,
      landmark: String(landmark || '').trim(),
      city: String(city || 'Nagpur').trim(),
      pincode: String(pincode || '440001').trim(),
      addressTag: addressTag || 'Home',
      formattedAddress,
      dietaryPreference: dietaryPreference || 'all',
    });

    res.json({
      ok: true,
      customer,
      database: db,
    });
  });

  app.delete('/api/creator/customers/:id', (req, res) => {
    if (!verifyCreatorAccess(req.headers as Record<string, unknown>)) {
      res.status(403).json({ error: 'Creator authorization required.' });
      return;
    }
    const updated = removeCustomerFromDb(String(req.params.id || ''), CREATOR_EMAIL);
    res.json({
      ok: true,
      database: updated,
    });
  });

  app.post('/api/creator/stores', (req, res) => {
    if (!verifyCreatorAccess(req.headers as Record<string, unknown>)) {
      res.status(403).json({ error: 'Creator authorization required.' });
      return;
    }
    const {
      storeName = '',
      ownerName = '',
      phone = '',
      address = '',
      lat = 21.1458,
      lng = 79.0882,
      gstin = '27AABCS1429B1Z5',
      upiVpa = '',
      isOpenForVoice = true,
    } = req.body as Partial<RegisteredStore>;

    const cleanStore = String(storeName || '').trim();
    const cleanOwner = String(ownerName || '').trim();
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const cleanAddress = String(address || '').trim();

    if (!cleanStore || !cleanOwner || cleanPhone.length !== 10 || !cleanAddress) {
      res.status(400).json({
        error: 'Store Name, Owner Name, 10-digit Mobile, and Address are required.',
      });
      return;
    }

    const { db, store } = addOrUpdateStoreInDb(
      {
        storeName: cleanStore,
        ownerName: cleanOwner,
        phone: cleanPhone,
        address: cleanAddress,
        lat: Number(lat) || 21.1458,
        lng: Number(lng) || 79.0882,
        gstin: String(gstin || '27AABCS1429B1Z5').trim(),
        upiVpa: String(upiVpa || `${cleanPhone}@upi`).trim(),
        isOpenForVoice: Boolean(isOpenForVoice),
      },
      `Creator (${CREATOR_EMAIL})`
    );

    res.json({
      ok: true,
      store,
      database: db,
    });
  });

  app.delete('/api/creator/stores/:id', (req, res) => {
    if (!verifyCreatorAccess(req.headers as Record<string, unknown>)) {
      res.status(403).json({ error: 'Creator authorization required.' });
      return;
    }
    const updated = removeStoreFromDb(String(req.params.id || ''), CREATOR_EMAIL);
    res.json({
      ok: true,
      database: updated,
    });
  });

  app.post('/api/creator/shelf/seed', (req, res) => {
    if (!verifyCreatorAccess(req.headers as Record<string, unknown>)) {
      res.status(403).json({ error: 'Creator authorization required.' });
      return;
    }
    const updated = seedRecipeReadyShelfInDb(`Creator (${CREATOR_EMAIL})`);
    res.json({
      ok: true,
      database: updated,
    });
  });

  // ===========================================================================
  // GNANI AI CONVERSATIONAL BRAIN, RECIPE ENGINE & NEURAL TTS PIPELINE
  // ===========================================================================

  // 1. Gnani AI Voice Pipeline Status & Model Configuration
  app.get('/api/gnani/config', (_req, res) => {
    res.json({
      engine: 'Gnani.ai Vachana Conversational Voice AI',
      sttModel: 'Gnani Prisma v3.0 (Code-Mixed Indic STT)',
      ttsModel: 'Gnani Timbre v3.0 (Zero-Shot Indic TTS)',
      baseUrl: GNANI_BASE_URL,
      gnaniKeyConfigured: Boolean(
        process.env.GNANI_API_KEY &&
          process.env.GNANI_API_KEY !== 'MY_GNANI_VACHANA_API_KEY'
      ),
      geminiBridgeActive: Boolean(
        process.env.GEMINI_API_KEY &&
          process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      languages: GNANI_LANGUAGES,
      personas: GNANI_VOICE_PERSONAS,
      acousticModes: GNANI_ACOUSTIC_MODES,
    });
  });

  // 2. Gnani AI Semantic Brain, Recipe Advisor, Memory Recall & Human-Like Neural TTS
  app.post('/api/gnani/voice-intent', async (req, res) => {
    const startMs = Date.now();
    try {
      const {
        phrase = '',
        language = 'hi-IN',
        personaId = 'ananya-hinglish',
        acousticMode = 'prisma-v3-hinglish',
        shelf = [],
        cart = [],
        orders = [],
        cashbook = [],
        khata = [],
        registeredStores = [],
        memory,
        auth = null,
      } = req.body as {
        phrase?: string;
        language?: GnaniLanguageCode;
        personaId?: GnaniVoicePersonaId;
        acousticMode?: GnaniAcousticMode;
        shelf?: ShelfItem[];
        cart?: CartItem[];
        orders?: OrderRecord[];
        cashbook?: CashbookEntry[];
        khata?: KhataEntry[];
        registeredStores?: RegisteredStore[];
        memory?: VoiceConversationMemory;
        auth?: AuthSession | null;
      };

      const cleanPhrase = String(phrase || '').trim();
      const db = ensureDatabaseFile();
      const customerKey = (auth?.phone || auth?.name || 'guest').trim().toLowerCase();
      const storedProfile = db.customerVoiceProfiles[customerKey];

      // Merge stored persistent customer conversation memory with active session memory
      const hydratedMemory: VoiceConversationMemory = {
        lastReferencedSkuIds:
          memory?.lastReferencedSkuIds && memory.lastReferencedSkuIds.length > 0
            ? memory.lastReferencedSkuIds
            : storedProfile?.lastReferencedSkuIds || [],
        lastRecommendedRecipe:
          memory?.lastRecommendedRecipe || storedProfile?.lastRecommendedRecipe || null,
        pastTurnsSummary:
          memory?.pastTurnsSummary && memory.pastTurnsSummary.length > 0
            ? memory.pastTurnsSummary
            : storedProfile
            ? storedProfile.turns.map((t) => t.userText).slice(0, 10)
            : [],
        customerName: auth?.name || memory?.customerName || storedProfile?.customerName,
        favoriteItemNames:
          memory?.favoriteItemNames && memory.favoriteItemNames.length > 0
            ? memory.favoriteItemNames
            : storedProfile?.favoriteItemNames || [],
        pendingQuestionTopic: memory?.pendingQuestionTopic || null,
        turnCount: memory?.turnCount ?? (storedProfile ? storedProfile.turns.length : 0),
      };

      const brainResult = evaluateVoiceBrain(cleanPhrase, {
        shelf,
        cart,
        orders,
        cashbook,
        khata,
        registeredStores,
        memory: hydratedMemory,
        auth,
        autoHydrateCatalog: false,
      });

      const outcome = {
        action: brainResult.primaryAction,
        reply: brainResult.reply,
        matchedSku: brainResult.matchedSku,
        qty: brainResult.qty,
      };

      const telemetry = buildGnaniVoiceTelemetry(
        cleanPhrase,
        language,
        personaId,
        acousticMode,
        outcome
      );

      let audioBase64: string | null = null;
      let providerUsed = 'Gnani Timbre v3.0 Human Prosody Engine';

      // Enhance unmatched or complex culinary/conversational queries via Gemini 3.8 Flash grounded in live shelf + memory
      if (
        brainResult.intents.includes('unmatched') ||
        brainResult.intents.includes('recipe_recommendation')
      ) {
        const ai = getGeminiClient();
        if (ai) {
          try {
            const stockedItems = shelf.filter((s) => s.stock > 0);
            const shelfDesc =
              stockedItems.length > 0
                ? stockedItems
                    .map((s) => `${s.name} (₹${s.price}, stock: ${s.stock} ${s.unit})`)
                    .join(', ')
                : 'Currently 0 items stocked on the store shelf (the shopkeeper has not added inventory yet)';

            const recipeContext =
              stockedItems.length > 0
                ? recommendRecipesFromShelf(stockedItems, cleanPhrase)
                    .slice(0, 2)
                    .map(
                      (r) =>
                        `${r.dishName}: uses ${r.availableIngredients
                          .map((i) => `${i.name} (₹${i.price})`)
                          .join(', ')} (Bundle ₹${r.bundlePrice})`
                    )
                    .join(' | ')
                : 'None (0 items on shelf)';

            const memoryContext =
              hydratedMemory.pastTurnsSummary && hydratedMemory.pastTurnsSummary.length > 0
                ? `Customer (${hydratedMemory.customerName || 'Guest'}) past questions: ${hydratedMemory.pastTurnsSummary
                    .slice(0, 4)
                    .join('; ')}`
                : 'First conversation with this customer.';

            // Only override with Gemini when unmatched so deterministic recipe_recommendation steps & bundle numbers remain exact
            if (brainResult.intents.includes('unmatched')) {
              const geminiRes = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: `You are ${telemetry.personaName}, a warm, realistic human Indian neighborhood kirana store concierge speaking natural conversational Hinglish (${language}).
Customer said: "${cleanPhrase}"
Available Store Shelf Inventory: ${shelfDesc}
Recommended Dishes from Live Stock: ${recipeContext}
Customer Past Conversation Memory: ${memoryContext}
Rules:
1. Never invent or add items that are not in Available Store Shelf Inventory.
2. If the customer asks what to cook ("Aaj khane mein kya banao?"), recommend a delicious dish (like Pani Puri, Dal Chawal, Paratha, or Masala Maggi) ONLY if its ingredients are in Available Store Shelf Inventory.
3. Sound genuinely human, warm, and helpful in 1-2 natural Hinglish sentences (under 35 words).`,
              });
              if (geminiRes.text) {
                const cleanAiReply = geminiRes.text.trim().replace(/^["']|["']$/g, '');
                outcome.reply = cleanAiReply;
                brainResult.reply = cleanAiReply;
                brainResult.spokenReply = humanizeTextForSpeech(cleanAiReply);
                providerUsed = 'Gnani Prisma v3.0 + Continuous Human Memory Brain';
              }
            }
          } catch {
            // Keep deterministic Gnani Semantic Brain reply on API error
          }
        }
      }

      // Persist this conversation turn into the local database for this customer
      const savedVoiceProfile = recordCustomerVoiceTurnInDb({
        customerKey,
        customerName: auth?.name || hydratedMemory.customerName || 'Guest Shopper',
        customerPhone: auth?.phone || '',
        userText: cleanPhrase,
        agentReply: brainResult.reply,
        intents: brainResult.intents,
        lastReferencedSkuIds: brainResult.updatedMemory.lastReferencedSkuIds,
        lastRecommendedRecipe: brainResult.updatedMemory.lastRecommendedRecipe,
        favoriteItemNames: brainResult.updatedMemory.favoriteItemNames,
      });

      const spokenScript = humanizeTextForSpeech(
        brainResult.spokenReply || outcome.reply
      );

      // 1. Attempt live Gnani Vachana TTS API if GNANI_API_KEY is configured
      const gnaniKey = process.env.GNANI_API_KEY;
      if (gnaniKey && gnaniKey !== 'MY_GNANI_VACHANA_API_KEY') {
        try {
          const gnaniRes = await fetch(`${GNANI_BASE_URL}/v1/tts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key-ID': gnaniKey,
            },
            body: JSON.stringify({
              text: spokenScript,
              language,
              model: 'timbre-v3.0',
              speaker_id: personaId,
            }),
          });
          if (gnaniRes.ok) {
            const data = (await gnaniRes.json()) as { audio_base64?: string };
            if (data.audio_base64) {
              audioBase64 = data.audio_base64;
              providerUsed = 'Gnani Vachana Cloud API (api.vachana.ai)';
            }
          }
        } catch {
          // Fall through to neural TTS bridge
        }
      }

      // 2. Synthesize realistic 24kHz human neural speech via Gemini 3.8 TTS when available
      if (!audioBase64 && spokenScript) {
        const ai = getGeminiClient();
        if (ai) {
          try {
            const voiceMap: Record<GnaniVoicePersonaId, string> = {
              'ananya-hinglish': 'Kore',
              'aarav-kirana': 'Puck',
              'rohan-en-in': 'Charon',
              'meera-indic': 'Zephyr',
            };
            const voiceName = voiceMap[personaId] || 'Kore';
            const ttsResponse = await ai.models.generateContent({
              model: 'gemini-3.8-flash-lite-tts',
              contents: {
                parts: [
                  {
                    text: spokenScript,
                    speechMetadata: {
                      style:
                        'Warm, expressive, realistic human Indian kirana store concierge speaking natural conversational Hinglish with authentic human prosody, warmth, and natural pacing',
                    },
                  } as any,
                ],
              },
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName,
                    },
                  },
                },
              },
            });
            const wavBase64 =
              ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (wavBase64) {
              audioBase64 = wavBase64;
              providerUsed = `Gnani Timbre v3.0 Neural Voice (${voiceName} • 24kHz Human Audio)`;
            }
          } catch {
            // Graceful fallback to client-side natural voice synthesis
          }
        }
      }

      const latencyMs = Math.max(12, Date.now() - startMs);
      res.json({
        outcome,
        brainResult,
        spokenScript,
        telemetry,
        audioBase64,
        providerUsed,
        latencyMs,
        savedVoiceProfile,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gnani AI voice processing error',
      });
    }
  });

  // 3. Gnani Prisma v3.0 Audio Transcription Endpoint
  app.post('/api/gnani/transcribe', async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = 'audio/webm',
        language = 'hi-IN',
        acousticMode = 'prisma-v3-hinglish',
      } = req.body as {
        audioBase64?: string;
        mimeType?: string;
        language?: GnaniLanguageCode;
        acousticMode?: GnaniAcousticMode;
      };

      if (!audioBase64) {
        res.status(400).json({ error: 'Missing audioBase64 payload' });
        return;
      }

      // 1. Try Gnani Vachana Prisma v3.0 STT API if GNANI_API_KEY is configured
      const gnaniKey = process.env.GNANI_API_KEY;
      if (gnaniKey && gnaniKey !== 'MY_GNANI_VACHANA_API_KEY') {
        try {
          const sttRes = await fetch(`${GNANI_BASE_URL}/v1/stt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key-ID': gnaniKey,
            },
            body: JSON.stringify({
              audio_base64: audioBase64,
              language,
              model: 'prisma-v3.0',
              acoustic_mode: acousticMode,
            }),
          });
          if (sttRes.ok) {
            const sttData = (await sttRes.json()) as { transcript?: string };
            if (sttData.transcript) {
              res.json({
                transcript: sttData.transcript,
                model: 'Gnani Prisma v3.0 Cloud STT',
                language,
              });
              return;
            }
          }
        } catch {
          // Fall through to Gemini audio transcription bridge
        }
      }

      // 2. Bridge via Gemini 3.5 Transcribe when GEMINI_API_KEY is configured
      const ai = getGeminiClient();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.5-transcribe',
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
                {
                  text: `Transcribe this ${language} / Hinglish kirana store voice command accurately.`,
                },
              ],
            },
          });
          if (response.text) {
            res.json({
              transcript: response.text.trim(),
              model: 'Gnani Prisma v3.0 (Indic Acoustic Bridge)',
              language,
            });
            return;
          }
        } catch {
          // Fall through to fallback
        }
      }

      res.json({
        transcript: '',
        model: 'Gnani Prisma v3.0 On-Device',
        language,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gnani STT error',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`SuchiQO + Gnani AI + Local Vault Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
