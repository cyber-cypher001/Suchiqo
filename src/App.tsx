import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sun,
  Moon,
  Lock,
  Mic,
  LogIn,
  LocateFixed,
  MapPin,
  Map,
  Crosshair,
  Navigation,
  ArrowRight,
  Download,
  Mail,
  Trash2,
  History,
  ShoppingBag,
  CheckCircle2,
  Clock,
  PackageCheck,
  CreditCard,
  CalendarClock,
  Home,
  Briefcase,
  Plus,
  Shield,
  Sparkles,
  Utensils,
  UserPlus,
  UserCheck,
  Star,
  Bike,
} from 'lucide-react';
import { BrandSvgDefs, Kirana404Illustration } from './components/BrandSvgDefs';
import { WaveformCanvas } from './components/WaveformCanvas';
import {
  ThemeMode,
  RouteKey,
  UserRole,
  AuthSession,
  RegisteredStore,
  RegisteredCustomer,
  CustomerConversationProfile,
  RecipeRecommendation,
  ShelfItem,
  CartItem,
  OrderRecord,
  CashbookEntry,
  KhataEntry,
  PaymentModeId,
  PAYMENT_MODES,
  DELIVERY_TIME_SLOTS,
  OrderScheduleConfig,
  CustomerDeliveryAddress,
  CustomerStorefrontTab,
  DEFAULT_KIRANA_CATALOG,
  formatDeliveryAddressSummary,
  calculateHaversineDistance,
  calculateDeliveryEtaMinutes,
  normalizeRoute,
  canAccessRoute,
  evaluateVoiceBrain,
  recommendRecipesFromShelf,
  humanizeTextForSpeech,
  VoiceBrainStep,
  VoiceConversationMemory,
  VoiceBrainResult,
  mutateCartItems,
  computeCartSummary,
  computeErpKpis,
  updateOrderRecordStatus,
  filterCustomerOrders,
  GnaniLanguageCode,
  GnaniVoicePersonaId,
  GnaniAcousticMode,
  GnaniVoiceTelemetry,
  GNANI_LANGUAGES,
  GNANI_VOICE_PERSONAS,
  GNANI_ACOUSTIC_MODES,
  buildGnaniVoiceTelemetry,
  reorderItemsIntoCart,
  calculateUpdatedStoreRating,
} from './utils/suchiqoLogic';
import {
  ProfileCommandCenter,
  UserPreferencesState,
} from './components/ProfileCommandCenter';
import { CreatorBackendVault } from './components/CreatorBackendVault';
import { StoreFiveStarRating } from './components/StoreFiveStarRating';
import { LiveOrderTrackingMap } from './components/LiveOrderTrackingMap';

const THEME_STORAGE_KEY = 'suchiqo_theme_mode';
const SESSION_STORAGE_KEY = 'suchiqo_live_session_v1';

function readPersistedSession<T>(field: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && parsed[field] !== undefined ? (parsed[field] as T) : fallback;
  } catch {
    return fallback;
  }
}

interface ToastMessage {
  id: number;
  message: string;
  variant: 'info' | 'success' | 'error';
}

interface UserLivePosition {
  lat: number;
  lng: number;
  accuracy: number;
}

const ROUTE_TITLES: Record<RouteKey, { title: string; breadcrumb: string; desc: string }> = {
  home: {
    title: 'SuchiQO — Your Shop. Your Voice. | Live GPS Map & Hinglish Voice Commerce',
    breadcrumb: 'Home',
    desc: 'Speak naturally in Hinglish, grant GPS location access to discover registered local kirana stores, and manage live inventory and billing.',
  },
  'how-it-works': {
    title: 'How It Works — Tri-Layer Voice Architecture | SuchiQO',
    breadcrumb: 'How It Works',
    desc: 'Discover how SuchiQO combines Web Audio acoustic streams, silent speech failover, and on-device Hinglish NLP & TTS.',
  },
  'for-shopkeepers': {
    title: 'For Shopkeepers — Neighborhood Kirana ERP & Udhaar Khata | SuchiQO',
    breadcrumb: 'For Shopkeepers',
    desc: 'Register your kirana store on the neighborhood GPS map, publish products to your shelf, and manage Hisab-Kitab & Udhaar Khata.',
  },
  contact: {
    title: 'Contact & Support — Automated HTML Email Dispatcher | SuchiQO',
    breadcrumb: 'Contact & Support',
    desc: 'Submit your inquiry to generate a branded HTML email notification with a Ticket ID and downloadable .eml file.',
  },
  login: {
    title: 'Customer Registration & Store Onboarding — Protected Route Gate | SuchiQO',
    breadcrumb: 'Register / Sign In',
    desc: 'Register as a Customer with your delivery address first or sign in to your verified account, or onboard your Kirana Store on the Live GPS Map.',
  },
  customer: {
    title: 'Customer Storefront — Hinglish Voice Ordering & Recipe Chef | SuchiQO',
    breadcrumb: 'Customer Storefront',
    desc: 'Speak or type in Hinglish to check live kirana shelf stock, ask what to cook today, and order directly from your neighborhood store.',
  },
  shopkeeper: {
    title: 'Shopkeeper ERP Console — Inventory, Cashbook & Khata | SuchiQO',
    breadcrumb: 'Shopkeeper Console',
    desc: 'Manage store shelf inventory, incoming customer orders, Hisab-Kitab cashbook, and Udhaar Khata ledgers.',
  },
  profile: {
    title: 'Profile, Order History & Voice Ledger — Account Command Center | SuchiQO',
    breadcrumb: 'Profile & Order Ledger',
    desc: 'View lifetime kirana telemetry, 1-tap reorder past bags, print Pakka GST invoices, manage GPS delivery pins, and configure Gnani Voice preferences.',
  },
  'creator-vault': {
    title: 'Creator Backend Database Vault — Local Persistent Storage | SuchiQO',
    breadcrumb: 'Creator Database Vault',
    desc: 'Creator-only local persistent backend database console for managing registered customers, kirana stores, shelf inventory, and voice memory.',
  },
  '404': {
    title: 'Aisle 404 Empty — Page Not Found | SuchiQO',
    breadcrumb: '404 Aisle',
    desc: 'Arre! Yeh Rack Khali Hai. Return to the SuchiQO Live GPS Map or ask the Voice Assistant.',
  },
};

export function App() {
  // 1. Theme State (Strictly Saffron Light vs OLED Dark)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'oled' ? 'oled' : 'saffron';
  });

  // 2. Clean Production State (0 Fake/Demo Stores, Orders, Cart, or Shelf Items; hydrated from real session localStorage & local DB)
  const [auth, setAuth] = useState<AuthSession | null>(() =>
    readPersistedSession<AuthSession | null>('auth', null)
  );
  const [registeredCustomers, setRegisteredCustomers] = useState<RegisteredCustomer[]>(() =>
    readPersistedSession<RegisteredCustomer[]>('registeredCustomers', [])
  );
  const [customerVoiceProfiles, setCustomerVoiceProfiles] = useState<
    Record<string, CustomerConversationProfile>
  >(() =>
    readPersistedSession<Record<string, CustomerConversationProfile>>('customerVoiceProfiles', {})
  );
  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>(() =>
    readPersistedSession<RegisteredStore[]>('registeredStores', [])
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    readPersistedSession<string | null>('selectedStoreId', null)
  );
  const [shelf, setShelf] = useState<ShelfItem[]>(() =>
    readPersistedSession<ShelfItem[]>('shelf', [])
  );
  const [cart, setCart] = useState<CartItem[]>(() =>
    readPersistedSession<CartItem[]>('cart', [])
  );
  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    readPersistedSession<OrderRecord[]>('orders', [])
  );
  const [cashbook, setCashbook] = useState<CashbookEntry[]>(() =>
    readPersistedSession<CashbookEntry[]>('cashbook', [])
  );
  const [khata, setKhata] = useState<KhataEntry[]>(() =>
    readPersistedSession<KhataEntry[]>('khata', [])
  );
  const [nextOrderSeq, setNextOrderSeq] = useState<number>(() =>
    readPersistedSession<number>('nextOrderSeq', 1001)
  );
  const [userPreferences, setUserPreferences] = useState<UserPreferencesState>(() =>
    readPersistedSession<UserPreferencesState>('userPreferences', {
      ttsEnabled: true,
      ttsSpeed: 1.0,
      pureVegOnly: false,
      reducedMotion: false,
    })
  );
  const [lastSpokenVoicePhrase, setLastSpokenVoicePhrase] = useState<string>('');

  // 3. Navigation & UI State
  const [activeRoute, setActiveRoute] = useState<RouteKey>(() => {
    const initialRoute = normalizeRoute(window.location.hash);
    const initialAuth = readPersistedSession<AuthSession | null>('auth', null);
    return canAccessRoute(initialRoute, initialAuth) ? initialRoute : 'login';
  });
  const [loginRole, setLoginRole] = useState<UserRole>('customer');
  const [customerTab, setCustomerTab] = useState<CustomerStorefrontTab>('shelf');
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);
  const secretClickCountRef = useRef<number>(0);
  const secretClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [orderHistoryFilter, setOrderHistoryFilter] = useState<
    'all' | 'completed' | OrderRecord['status']
  >('all');
  const [erpTab, setErpTab] = useState<'overview' | 'inventory' | 'cashbook' | 'khata'>('overview');
  const [voiceModalOpen, setVoiceModalOpen] = useState<boolean>(false);
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 3b. Customer Payment Mode, Order Scheduling & Multi-Address State (Swiggy/Zomato Style)
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentModeId>('upi');
  const [upiIdInput, setUpiIdInput] = useState<string>('customer@okaxis');
  const [codChangeNote, setCodChangeNote] = useState<string>('Keep change for ₹500');

  const [orderSchedule, setOrderSchedule] = useState<OrderScheduleConfig>({
    mode: 'instant',
    slotId: 'instant-15m',
    slotLabel: 'Instant Express Delivery (Within 10–15 Mins)',
    customDate: '',
    customTime: '',
    recurring: 'none',
    instructions: '',
  });

  const [savedAddresses, setSavedAddresses] = useState<CustomerDeliveryAddress[]>(() =>
    readPersistedSession<CustomerDeliveryAddress[]>('savedAddresses', [])
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() =>
    readPersistedSession<string | null>('selectedAddressId', null)
  );
  const [addrTag, setAddrTag] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addrCustomTag, setAddrCustomTag] = useState<string>('');
  const [addrFlat, setAddrFlat] = useState<string>('');
  const [addrArea, setAddrArea] = useState<string>('');
  const [addrLandmark, setAddrLandmark] = useState<string>('');
  const [addrReceiverName, setAddrReceiverName] = useState<string>('');
  const [addrReceiverPhone, setAddrReceiverPhone] = useState<string>('');
  const [addrFormError, setAddrFormError] = useState<string>('');

  // 4. Live GPS & Map State
  const [userLivePosition, setUserLivePosition] = useState<UserLivePosition | null>(null);
  const [heroGpsBtnText, setHeroGpsBtnText] = useState<string>('Detect My Live Location');
  const [gpsActionBtnLabel, setGpsActionBtnLabel] = useState<string>('Use My Exact Location');
  const [gpsTelemetryText, setGpsTelemetryText] = useState<string>(
    'GPS Mode: Waiting for location permission. Click "Use My Exact Location" to sync.'
  );
  const [gpsAccuracyPill, setGpsAccuracyPill] = useState<string>('GPS Accuracy: Idle');
  const [mapActiveStoreLabel, setMapActiveStoreLabel] = useState<string>('GPS Location Status');
  const [mapActiveStoreDist, setMapActiveStoreDist] = useState<string>('Ready to detect location');
  const [mapOverlayStatus, setMapOverlayStatus] = useState<string>('Live Radar: Active Map View');
  const [mapIframeSrc, setMapIframeSrc] = useState<string>(
    'https://maps.google.com/maps?q=grocery+stores&t=&z=14&ie=UTF8&iwloc=&output=embed'
  );

  // 5. Gnani AI (Vachana Prisma v3.0 STT & Timbre v3.0 TTS) Voice Assistant State
  const [gnaniLanguage, setGnaniLanguage] = useState<GnaniLanguageCode>('hi-IN');
  const [gnaniPersonaId, setGnaniPersonaId] = useState<GnaniVoicePersonaId>('ananya-hinglish');
  const [gnaniAcousticMode, setGnaniAcousticMode] = useState<GnaniAcousticMode>(
    'prisma-v3-hinglish'
  );
  const [gnaniTelemetry, setGnaniTelemetry] = useState<GnaniVoiceTelemetry>(() =>
    buildGnaniVoiceTelemetry(
      'Aaj dukaan mein kya uplabdh hai?',
      'hi-IN',
      'ananya-hinglish',
      'prisma-v3-hinglish',
      { action: 'stock_query', reply: '', qty: 0 }
    )
  );
  const [gnaniProviderUsed, setGnaniProviderUsed] = useState<string>(
    'Gnani Prisma v3.0 + Human Voice Brain'
  );
  const [gnaniLatencyMs, setGnaniLatencyMs] = useState<number>(18);
  const [modalVoiceInput, setModalVoiceInput] = useState<string>('');
  const [modalVoiceStatus, setModalVoiceStatus] = useState<string>(
    'Gnani Human Voice Concierge Ready — Tap Mic or Press Alt+V'
  );
  const [modalAiResponseText, setModalAiResponseText] = useState<string>(
    '"Namaste ji! Main SuchiQO Gnani Human Voice Concierge hoon. Main dukaan ke live stock ko check karke bataungi ki kya uplabdh hai aur kya nahi, aapka order schedule kar sakti hoon, payment mode set kar sakti hoon, aur aapke ghar ya office address par delivery bhej sakti hoon."'
  );
  const [custHinglishInput, setCustHinglishInput] = useState<string>('');
  const [custVoiceFeedback, setCustVoiceFeedback] = useState<string>(
    '🎙️ Gnani Human Voice Brain Online: Checks live shop inventory strictly and answers naturally.'
  );
  const [custShelfSearch, setCustShelfSearch] = useState<string>('');

  // Semantic Mapping Brain & Multi-Turn Memory State
  const [voiceMemory, setVoiceMemory] = useState<VoiceConversationMemory>(() =>
    readPersistedSession<VoiceConversationMemory>('voiceMemory', {
      lastReferencedSkuIds: [],
      pendingQuestionTopic: null,
      turnCount: 0,
      pastTurns: [],
      favoriteItems: [],
      recommendedRecipesHistory: [],
    })
  );
  const [recommendedRecipes, setRecommendedRecipes] = useState<RecipeRecommendation[]>([]);
  const [voiceThinkingStage, setVoiceThinkingStage] = useState<
    'idle' | 'analyzing' | 'inventory_scan' | 'memory_lookup' | 'synthesizing'
  >('idle');
  const [voiceBrainSteps, setVoiceBrainSteps] = useState<VoiceBrainStep[]>([]);
  const [voiceFollowUpPrompt, setVoiceFollowUpPrompt] = useState<string | null>(null);
  const [voiceConversationLog, setVoiceConversationLog] = useState<
    Array<{
      id: string;
      userText: string;
      agentReply: string;
      steps: VoiceBrainStep[];
      timestamp: string;
    }>
  >(() =>
    readPersistedSession<
      Array<{
        id: string;
        userText: string;
        agentReply: string;
        steps: VoiceBrainStep[];
        timestamp: string;
      }>
    >('voiceConversationLog', [])
  );
  const [continuousVoiceMode, setContinuousVoiceMode] = useState<boolean>(false);
  const [liveInterimTranscript, setLiveInterimTranscript] = useState<string>('');
  const speechRecRef = useRef<any>(null);
  const modalInputRef = useRef<HTMLInputElement | null>(null);
  const custInputRef = useRef<HTMLInputElement | null>(null);

  // 6. Auth Forms State (Customer Registration First + Existing Sign-In)
  const [customerAuthMode, setCustomerAuthMode] = useState<'register' | 'signin'>('register');
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custOtp, setCustOtp] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');
  const [custLandmark, setCustLandmark] = useState<string>('');
  const [custCity, setCustCity] = useState<string>('Indore');
  const [custPincode, setCustPincode] = useState<string>('452001');
  const [custAddrTag, setCustAddrTag] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [custAuthError, setCustAuthError] = useState<string>('');

  const [shopName, setShopName] = useState<string>('');
  const [shopOwner, setShopOwner] = useState<string>('');
  const [shopAddress, setShopAddress] = useState<string>('');
  const [shopPhone, setShopPhone] = useState<string>('');
  const [shopPin, setShopPin] = useState<string>('');
  const [shopAuthError, setShopAuthError] = useState<string>('');

  // 7. Contact & Email Dispatcher State
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactTopic, setContactTopic] = useState<string>('Kirana Store Onboarding');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [contactFormError, setContactFormError] = useState<string>('');
  const [emailTemplateMode, setEmailTemplateMode] = useState<'customer' | 'admin'>('customer');
  const [emailTicketPill, setEmailTicketPill] = useState<string>('#SQ-TKT-PENDING');
  const [emailGreeting, setEmailGreeting] = useState<string>('Namaste from SuchiQO Support!');
  const [emailCardTopic, setEmailCardTopic] = useState<string>('Support Ticket');
  const [emailCardMessage, setEmailCardMessage] = useState<string>(
    '"Submit the Contact Form to populate this template."'
  );

  // 8. Shopkeeper Forms State
  const [newSkuName, setNewSkuName] = useState<string>('');
  const [newSkuCategory, setNewSkuCategory] = useState<string>('Grocery');
  const [newSkuMrp, setNewSkuMrp] = useState<string>('');
  const [newSkuPrice, setNewSkuPrice] = useState<string>('');
  const [newSkuStock, setNewSkuStock] = useState<string>('');
  const [newSkuUnit, setNewSkuUnit] = useState<string>('pack');

  const [cbNote, setCbNote] = useState<string>('');
  const [cbType, setCbType] = useState<'expense' | 'income'>('expense');
  const [cbAmount, setCbAmount] = useState<string>('');

  const [khataCustomer, setKhataCustomer] = useState<string>('');
  const [khataPhone, setKhataPhone] = useState<string>('');
  const [khataType, setKhataType] = useState<'udhaar' | 'jama'>('udhaar');
  const [khataAmount, setKhataAmount] = useState<string>('');
  const [khataNote, setKhataNote] = useState<string>('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const dbHydratedRef = useRef<boolean>(false);

  // Toast helper
  const notifyToast = useCallback(
    (message: string, variant: 'info' | 'success' | 'error' = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  // Sync theme to documentElement & localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  // Hydrate from server-side local persistent database (`data/suchiqo-db.json`)
  const refreshFromLocalDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/db/state');
      if (!res.ok) return;
      const data = await res.json();
      const snap = data.snapshot;
      if (!snap) return;
      if (Array.isArray(snap.registeredCustomers) && snap.registeredCustomers.length > 0) {
        setRegisteredCustomers(snap.registeredCustomers);
      }
      if (Array.isArray(snap.registeredStores) && snap.registeredStores.length > 0) {
        setRegisteredStores(snap.registeredStores);
        setSelectedStoreId((prev) => prev || snap.registeredStores[0].id);
      }
      if (Array.isArray(snap.shelf) && snap.shelf.length > 0) {
        setShelf(snap.shelf);
      }
      if (Array.isArray(snap.orders) && snap.orders.length > 0) {
        setOrders(snap.orders);
      }
      if (Array.isArray(snap.cashbook) && snap.cashbook.length > 0) {
        setCashbook(snap.cashbook);
      }
      if (Array.isArray(snap.khata) && snap.khata.length > 0) {
        setKhata(snap.khata);
      }
      if (snap.customerVoiceProfiles && typeof snap.customerVoiceProfiles === 'object') {
        setCustomerVoiceProfiles((prev) => ({
          ...prev,
          ...snap.customerVoiceProfiles,
        }));
      }
    } catch {
      // Offline fallback to localStorage
    } finally {
      dbHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    void refreshFromLocalDatabase();
  }, [refreshFromLocalDatabase]);

  // Persist real authenticated session state to localStorage & sync to local backend DB
  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          auth,
          registeredCustomers,
          customerVoiceProfiles,
          registeredStores,
          selectedStoreId,
          shelf,
          cart,
          orders,
          cashbook,
          khata,
          nextOrderSeq,
          savedAddresses,
          selectedAddressId,
          voiceMemory,
          voiceConversationLog,
          userPreferences,
        })
      );
    } catch {
      // Ignore storage quota errors
    }

    if (dbHydratedRef.current) {
      fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registeredCustomers,
          registeredStores,
          shelf,
          orders,
          cashbook,
          khata,
          nextOrderSeq,
          customerVoiceProfiles,
        }),
      }).catch(() => {
        // Ignore network errors in offline mode
      });
    }
  }, [
    auth,
    registeredCustomers,
    customerVoiceProfiles,
    registeredStores,
    selectedStoreId,
    shelf,
    cart,
    orders,
    cashbook,
    khata,
    nextOrderSeq,
    savedAddresses,
    selectedAddressId,
    voiceMemory,
    voiceConversationLog,
    userPreferences,
  ]);

  const toggleLightDarkMode = () => {
    const next: ThemeMode = themeMode === 'saffron' ? 'oled' : 'saffron';
    setThemeMode(next);
    notifyToast(
      next === 'oled' ? 'Switched to OLED Dark Mode' : 'Switched to Saffron Light Mode',
      'info'
    );
  };

  // Sync SEO meta tags and hash on route change
  useEffect(() => {
    const meta = ROUTE_TITLES[activeRoute] || ROUTE_TITLES['404'];
    document.title = meta.title;
    const descEl = document.getElementById('dynamic-description');
    if (descEl) descEl.setAttribute('content', meta.desc);
    const canonEl = document.getElementById('dynamic-canonical');
    if (canonEl) canonEl.setAttribute('href', `https://suchiqo.in/#/${activeRoute}`);
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    const ogDesc = document.getElementById('og-desc');
    if (ogDesc) ogDesc.setAttribute('content', meta.desc);
    const ogUrl = document.getElementById('og-url');
    if (ogUrl) ogUrl.setAttribute('href', `https://suchiqo.in/#/${activeRoute}`);

    if (window.location.hash !== `#/${activeRoute}`) {
      window.history.replaceState(null, '', `#/${activeRoute}`);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [activeRoute]);

  // Eye-tracking mascot pupil effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const xNorm = (e.clientX / window.innerWidth - 0.5) * 5;
      const yNorm = (e.clientY / window.innerHeight - 0.5) * 5;
      document.querySelectorAll<HTMLElement>('.sq-pupil').forEach((p) => {
        p.style.transform = `translate(${xNorm}px, ${yNorm}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Route navigation with Role-Isolated Route Guards
  const requestRoute = useCallback(
    (rawRoute: string) => {
      const norm = normalizeRoute(rawRoute);
      if (!canAccessRoute(norm, auth)) {
        if (norm === 'profile') {
          notifyToast(
            'Sign in to access your Profile, Order History & Voice Ledger.',
            'error'
          );
          setActiveRoute('login');
          return;
        }
        const reqRole: UserRole = norm === 'shopkeeper' ? 'shopkeeper' : 'customer';
        setLoginRole(reqRole);
        notifyToast(`Sign in as ${reqRole.toUpperCase()} to open that portal.`, 'error');
        setActiveRoute('login');
        return;
      }
      setActiveRoute(norm);
    },
    [auth, notifyToast]
  );

  // Listen to browser hashchange
  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace(/^#\/?/, '') || 'home';
      requestRoute(h);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [requestRoute]);

  const openLoginWithRole = (role: UserRole) => {
    setLoginRole(role);
    setActiveRoute('login');
  };

  // WebAudio Chime & Local TTS
  const playChime = () => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch {
      // Ignore audio errors on restricted autoplay
    }
  };

  const speakLocalTts = (
    text: string,
    langCode: GnaniLanguageCode = gnaniLanguage,
    pitch = gnaniTelemetry.ttsPitch,
    rate = gnaniTelemetry.ttsRate,
    audioBase64?: string | null
  ) => {
    if (!userPreferences.ttsEnabled) return;
    const effectiveRate = rate * (userPreferences.ttsSpeed || 1.0);
    // Stop any currently playing audio or speech utterance immediately
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {
        // Ignore audio pause errors
      }
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }

    // 1. Play 24kHz Human Neural Audio (Gnani Timbre v3.0 / Gemini 3.8 Neural TTS) when available
    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
        activeAudioRef.current = audio;
        audio.play().catch(() => {
          // If autoplay blocked or fails, fall back to humanized Web Speech synthesis
        });
        return;
      } catch {
        // Fall through to humanized Web Speech synthesis
      }
    }

    // 2. Humanized Web Speech fallback with natural Indic/English neural voice selection
    if (!('speechSynthesis' in window)) return;
    try {
      const spokenScript = humanizeTextForSpeech(text);
      if (!spokenScript) return;

      const u = new SpeechSynthesisUtterance(spokenScript);
      u.lang = langCode;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const targetLang = langCode.toLowerCase();
        const langPrefix = targetLang.split('-')[0];

        const scoreVoice = (v: SpeechSynthesisVoice): number => {
          const vLang = (v.lang || '').toLowerCase();
          const vName = (v.name || '').toLowerCase();
          let score = 0;

          if (vLang === targetLang) score += 50;
          else if (vLang.startsWith(langPrefix)) score += 35;
          else if (vLang === 'hi-in' || vLang === 'en-in') score += 25;
          else if (vLang.includes('in')) score += 15;

          if (vName.includes('natural') || vName.includes('neural') || vName.includes('online')) {
            score += 40;
          }
          if (
            vName.includes('swara') ||
            vName.includes('neerja') ||
            vName.includes('madhur') ||
            vName.includes('prabhat') ||
            vName.includes('heera') ||
            vName.includes('rishi') ||
            vName.includes('lekha') ||
            vName.includes('veena')
          ) {
            score += 30;
          }
          if (vName.includes('google')) score += 25;
          if (vName.includes('india') || vName.includes('हिन्दी') || vName.includes('hindi')) {
            score += 20;
          }
          return score;
        };

        const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
        if (ranked[0] && scoreVoice(ranked[0]) > 0) {
          u.voice = ranked[0];
          u.lang = ranked[0].lang || langCode;
        }
      }

      // Natural human conversational cadence (avoid robotic high pitch or rushed speed)
      u.pitch = Math.min(1.03, Math.max(0.95, pitch || 1.0));
      u.rate = Math.min(1.2, Math.max(0.85, effectiveRate || 0.98));
      window.speechSynthesis.speak(u);
    } catch {
      // Ignore speechSynthesis errors
    }
  };

  // Geolocation live detection
  const requestUserLiveLocation = () => {
    if (!('geolocation' in navigator)) {
      notifyToast('Geolocation is not supported by your current browser.', 'error');
      return;
    }

    setHeroGpsBtnText('Requesting GPS Access...');
    setGpsActionBtnLabel('Locating...');
    notifyToast('Requesting browser location permission...', 'info');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: UserLivePosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        };
        setUserLivePosition(coords);
        setHeroGpsBtnText('Live Location Synced ✓');
        setGpsActionBtnLabel('GPS Active ✓');
        setGpsTelemetryText(
          `📍 GPS Active: Latitude ${coords.lat.toFixed(4)}, Longitude ${coords.lng.toFixed(4)}`
        );
        setGpsAccuracyPill(`Accuracy: ±${coords.accuracy}m`);
        setMapIframeSrc(
          `https://maps.google.com/maps?q=${coords.lat},${coords.lng}+(Grocery+Stores)&t=&z=15&ie=UTF8&iwloc=&output=embed`
        );
        setMapActiveStoreLabel('Live User GPS Centered');
        setMapActiveStoreDist(`Coordinates: ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`);
        setMapOverlayStatus('Live GPS: Centered on your exact coordinates');
        notifyToast(
          `GPS Location Synced: Map centered on your coordinates (±${coords.accuracy}m)`,
          'success'
        );
      },
      (err) => {
        setHeroGpsBtnText('Detect My Live Location');
        setGpsActionBtnLabel('Use My Exact Location');
        let reason = 'Location permission was denied or unavailable.';
        if (err.code === 1) reason = 'Location permission denied by browser settings.';
        else if (err.code === 2) reason = 'GPS position unavailable. Check device network.';
        else if (err.code === 3) reason = 'Location request timed out.';

        setGpsTelemetryText(`⚠️ ${reason}`);
        notifyToast(reason, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  const selectRegisteredStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    const store = registeredStores.find((s) => s.id === storeId);
    if (!store) return;

    setMapIframeSrc(
      `https://maps.google.com/maps?q=${encodeURIComponent(store.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    );
    setMapActiveStoreLabel(store.storeName);
    setMapActiveStoreDist(store.address);
    setMapOverlayStatus(`Store Selected: ${store.storeName}`);
    notifyToast(`Selected: ${store.storeName}`, 'info');
  };

  // 5-Star Interactive Rating Handler: updates Bayesian rating and syncs to backend local database
  const handleRateKiranaStore = async (storeId: string, ratingScore: number) => {
    const userKey = auth?.phone || auth?.name || 'verified_shopper';
    setRegisteredStores((prev) =>
      prev.map((s) => (s.id === storeId ? calculateUpdatedStoreRating(s, ratingScore, userKey) : s))
    );
    const targetStore = registeredStores.find((s) => s.id === storeId);
    notifyToast(
      `★ Thank you! You rated ${ratingScore} stars for "${targetStore?.storeName || 'Kirana'}". Customer trust score updated!`,
      'success'
    );
    try {
      await fetch(`/api/db/stores/${encodeURIComponent(storeId)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingScore, userKey }),
      });
    } catch {
      // Local state already updated
    }
  };

  // Secret Touchpoint Trigger for Creator: 5 clicks on copyright/mascot in 2.5s opens vault
  const handleSecretCreatorTrigger = () => {
    secretClickCountRef.current += 1;
    if (secretClickTimerRef.current) clearTimeout(secretClickTimerRef.current);
    secretClickTimerRef.current = setTimeout(() => {
      secretClickCountRef.current = 0;
    }, 2500);

    if (secretClickCountRef.current >= 5) {
      secretClickCountRef.current = 0;
      requestRoute('creator-vault');
      notifyToast('🔒 Creator Database Access Gate Activated. Enter password.', 'info');
    }
  };

  // Global Keyboard Shortcuts: Alt+V for Voice, and Secret Combination for Creator Database Vault
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Alt+V: Activate Voice Assistant
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        setVoiceModalOpen(true);
        setTimeout(() => modalInputRef.current?.focus(), 80);
      }

      // 2. Secret Combination for Creator Database Vault: Ctrl+Shift+Alt+C or Ctrl+Shift+D
      if (
        (e.ctrlKey && e.shiftKey && (e.altKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D'))
      ) {
        e.preventDefault();
        requestRoute('creator-vault');
        notifyToast('🔒 Creator Database Access Gate Activated. Type password to unlock.', 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Gnani AI (Vachana Prisma v3.0 STT + Timbre v3.0 TTS + Human Conversational Brain) Execution
  const executeVoiceIntent = async (rawPhrase: string, source: 'modal' | 'customer') => {
    const phrase = String(rawPhrase || '').trim();
    if (!phrase) {
      notifyToast('Boliye ya apna sawaal/order type karein.', 'info');
      return;
    }

    setLastSpokenVoicePhrase(phrase);
    setLiveInterimTranscript('');
    setModalVoiceInput(phrase);
    if (source === 'customer') {
      setCustHinglishInput(phrase);
    }

    // Trigger continuous thinking stages visually
    setVoiceThinkingStage('analyzing');
    setTimeout(() => {
      setVoiceThinkingStage((curr) => (curr === 'analyzing' ? 'inventory_scan' : curr));
    }, 220);
    setTimeout(() => {
      setVoiceThinkingStage((curr) => (curr === 'inventory_scan' ? 'synthesizing' : curr));
    }, 550);
    setTimeout(() => {
      setVoiceThinkingStage('idle');
    }, 1800);

    // 1. Run the deterministic Multi-Question & Multi-Input Semantic Mapping Brain locally first
    // CRITICAL: autoHydrateCatalog is strictly false — AI voice NEVER adds anything to shop inventory (shelf)
    const localBrain = evaluateVoiceBrain(phrase, {
      shelf,
      cart,
      orders,
      cashbook,
      khata,
      registeredStores,
      memory: voiceMemory,
      auth,
      autoHydrateCatalog: false,
    });

    // Apply Multi-Field Profile Inputs (Name, Phone, Address, Store Name)
    let activeAuth = auth;
    let nextSavedAddresses = [...savedAddresses];
    let nextSelectedAddressId = selectedAddressId;

    if (localBrain.profileInput) {
      const pi = localBrain.profileInput;
      if (pi.name) setCustName(pi.name);
      if (pi.phone) setCustPhone(pi.phone);
      if (pi.address) setCustAddress(pi.address);
      if (pi.storeName) setShopName(pi.storeName);

      const updatedAuth: AuthSession = {
        role: pi.role || activeAuth?.role || 'customer',
        name: pi.name || activeAuth?.name || custName || 'Customer',
        phone: pi.phone || activeAuth?.phone || custPhone || '9876543210',
        address: pi.address || activeAuth?.address || custAddress || 'Verified Local Address',
        storeName: pi.storeName || activeAuth?.storeName,
      };
      activeAuth = updatedAuth;
      setAuth(updatedAuth);

      if (pi.address) {
        const newVoiceAddr: CustomerDeliveryAddress = {
          id: `addr_${Date.now()}`,
          tag: 'Home',
          flatOrHouse: pi.address,
          areaOrStreet: 'Voice Verified Locality',
          landmark: 'Near Main Road',
          receiverName: updatedAuth.name,
          receiverPhone: updatedAuth.phone || '9876543210',
          isDefault: nextSavedAddresses.length === 0,
        };
        nextSavedAddresses = [newVoiceAddr, ...nextSavedAddresses];
        nextSelectedAddressId = newVoiceAddr.id;
        setSavedAddresses(nextSavedAddresses);
        setSelectedAddressId(newVoiceAddr.id);
      }
    }

    // Apply Voice-Triggered Payment Mode Selection
    let nextPayMode = selectedPaymentMode;
    if (localBrain.selectedPaymentMode) {
      nextPayMode = localBrain.selectedPaymentMode;
      setSelectedPaymentMode(localBrain.selectedPaymentMode);
    }

    // Apply Voice-Triggered Order Schedule Selection
    let nextSchedule = orderSchedule;
    if (localBrain.scheduleUpdate) {
      nextSchedule = {
        ...orderSchedule,
        ...localBrain.scheduleUpdate,
      };
      setOrderSchedule(nextSchedule);
    }

    // Apply Voice-Triggered Delivery Address Selection (e.g. Home / Work / Other)
    if (localBrain.selectedAddressTag) {
      const matchedAddr = nextSavedAddresses.find(
        (a) => a.tag.toLowerCase() === localBrain.selectedAddressTag!.toLowerCase()
      );
      if (matchedAddr) {
        nextSelectedAddressId = matchedAddr.id;
        setSelectedAddressId(matchedAddr.id);
      }
    }

    // Apply Multi-Item Cart Mutations strictly against existing shelf inventory (add, remove, clear)
    let nextCart = localBrain.shouldClearCart ? [] : [...cart];
    if (localBrain.cartMutations.length > 0) {
      for (const mut of localBrain.cartMutations) {
        const delta = mut.mode === 'remove' ? -mut.qty : mut.qty;
        nextCart = mutateCartItems(nextCart, shelf, mut.sku.id, delta);
      }
      setCart(nextCart);
    } else if (localBrain.shouldClearCart) {
      setCart([]);
    }

    // Apply Shopkeeper ERP Mutations (Cashbook Kharcha/Income & Udhaar Khata)
    if (localBrain.erpMutations.length > 0) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newCbEntries: CashbookEntry[] = [];
      const newKhataEntries: KhataEntry[] = [];
      for (const erpMut of localBrain.erpMutations) {
        if (erpMut.kind === 'add_cashbook' && erpMut.cashbook) {
          newCbEntries.push({
            id: `cb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...erpMut.cashbook,
            createdAt: nowTime,
          });
        } else if (erpMut.kind === 'add_khata' && erpMut.khata) {
          newKhataEntries.push({
            id: `kh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...erpMut.khata,
            createdAt: nowTime,
          });
        }
      }
      if (newCbEntries.length > 0) {
        setCashbook((prev) => [...newCbEntries, ...prev]);
      }
      if (newKhataEntries.length > 0) {
        setKhata((prev) => [...newKhataEntries, ...prev]);
      }
    }

    // Apply Voice Order Confirmation if requested and cart has items
    if (localBrain.shouldPlaceOrder && nextCart.length > 0) {
      const summary = computeCartSummary(nextCart);
      const itemsDesc = nextCart.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ');
      const orderId = `#${nextOrderSeq}`;
      setNextOrderSeq((n) => n + 1);
      const customerLabel = activeAuth?.name || custName.trim() || 'Voice Customer';
      const chosenPayObj =
        PAYMENT_MODES.find((m) => m.id === nextPayMode) || PAYMENT_MODES[0];
      const chosenAddrObj =
        nextSavedAddresses.find((a) => a.id === nextSelectedAddressId) ||
        nextSavedAddresses[0] ||
        null;
      const resolvedAddrText = chosenAddrObj
        ? formatDeliveryAddressSummary(chosenAddrObj)
        : activeAuth?.address || custAddress.trim() || 'Verified Local Address';
      const resolvedScheduleText =
        nextSchedule.slotId === 'custom-slot' && (nextSchedule.customDate || nextSchedule.customTime)
          ? `Custom: ${nextSchedule.customDate || 'Today'} ${nextSchedule.customTime || ''}`.trim()
          : nextSchedule.slotLabel;

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentStoreObj =
        registeredStores.find((s) => s.id === selectedStoreId) ||
        registeredStores[0] ||
        null;
      setOrders((prev) => [
        {
          id: orderId,
          customerName: customerLabel,
          items: itemsDesc,
          total: summary.totalPayable,
          status: 'Pending',
          createdAt: nowStr,
          paymentMode: chosenPayObj.label,
          scheduledFor: resolvedScheduleText,
          deliveryAddress: resolvedAddrText,
          storeName: currentStoreObj?.storeName || 'Verified Local Kirana',
          handoverOtp: String(Math.floor(1000 + Math.random() * 9000)),
          voiceTranscript: phrase,
          mrpSavings: summary.totalSavings,
          lineItems: nextCart.map((c) => ({
            skuId: c.id,
            name: c.name,
            qty: c.qty,
            unit: c.unit,
            mrp: c.mrp,
            price: c.price,
            emoji: c.emoji,
            hsn: c.hsn,
          })),
        },
        ...prev,
      ]);

      if (nextPayMode === 'udhaar_khata') {
        setKhata((prev) => [
          {
            id: `kh_${Date.now()}`,
            customerName: customerLabel,
            phone: activeAuth?.phone || custPhone.trim() || '9876543210',
            type: 'udhaar',
            amount: summary.totalPayable,
            note: `Order ${orderId} (${itemsDesc})`,
            createdAt: nowStr,
          },
          ...prev,
        ]);
      }

      setShelf((prevShelf) =>
        prevShelf.map((sku) => {
          const inCart = nextCart.find((c) => c.id === sku.id);
          return inCart ? { ...sku, stock: Math.max(0, sku.stock - inCart.qty) } : sku;
        })
      );
      setCart([]);
      setCheckoutDrawerOpen(false);
      setSelectedTrackingOrderId(orderId);
      setCustomerTab('tracking');
    }

    // Apply GPS or Tab/Route navigation triggers
    if (localBrain.intents.includes('gps_trigger')) {
      requestUserLiveLocation();
    }
    if (localBrain.switchCustomerTab) {
      setCustomerTab(localBrain.switchCustomerTab);
    }
    if (localBrain.navigateToRoute) {
      setVoiceModalOpen(false);
      if (
        (localBrain.navigateToRoute === 'customer' ||
          localBrain.navigateToRoute === 'shopkeeper') &&
        !activeAuth
      ) {
        openLoginWithRole(localBrain.navigateToRoute);
      } else {
        setActiveRoute(localBrain.navigateToRoute);
      }
    }

    if (localBrain.recommendedRecipes && localBrain.recommendedRecipes.length > 0) {
      setRecommendedRecipes(localBrain.recommendedRecipes);
    }

    const localOutcome = {
      action: localBrain.primaryAction,
      reply: localBrain.reply,
      matchedSku: localBrain.matchedSku,
      qty: localBrain.qty,
    };

    const localTelemetry = buildGnaniVoiceTelemetry(
      phrase,
      gnaniLanguage,
      gnaniPersonaId,
      gnaniAcousticMode,
      localOutcome
    );

    const turnTimestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setVoiceMemory(localBrain.updatedMemory);
    setVoiceBrainSteps(localBrain.brainSteps);
    setVoiceFollowUpPrompt(localBrain.followUpPrompt);
    setGnaniTelemetry(localTelemetry);
    setModalAiResponseText(`"${localBrain.reply}"`);
    setModalVoiceStatus(
      `✓Processed ${localBrain.brainSteps.length} Intent(s) via ${localTelemetry.sttModel} (${localTelemetry.languageCode})`
    );
    setCustVoiceFeedback(
      `🎙️ [${localTelemetry.personaName} • ${localTelemetry.languageCode}] ${localBrain.reply}`
    );
    setVoiceConversationLog((prev) => [
      {
        id: `turn_${Date.now()}`,
        userText: phrase,
        agentReply: localBrain.reply,
        steps: localBrain.brainSteps,
        timestamp: turnTimestamp,
      },
      ...prev.slice(0, 14),
    ]);

    // Persist per-customer conversation profile so the voice brain remembers past conversations
    const customerKey = (
      activeAuth?.phone ||
      activeAuth?.name ||
      custPhone.trim() ||
      custName.trim() ||
      'guest_session'
    )
      .toLowerCase()
      .replace(/\s+/g, '_');

    setCustomerVoiceProfiles((prev) => {
      const existing = prev[customerKey] || {
        customerKey,
        customerName: activeAuth?.name || custName.trim() || 'Guest Customer',
        customerPhone: activeAuth?.phone || custPhone.trim() || '',
        phone: activeAuth?.phone || custPhone.trim() || '',
        turns: [],
        favoriteItemNames: [],
        favoriteItems: [],
        lastRecommendedRecipes: [],
        updatedAt: turnTimestamp,
      };
      const addedFavs = localBrain.cartMutations
        .filter((m) => m.mode === 'add')
        .map((m) => m.sku.name);
      const nextFavs = Array.from(
        new Set([
          ...addedFavs,
          ...(existing.favoriteItems || existing.favoriteItemNames || []),
        ])
      ).slice(0, 10);
      const addedRecipes = (localBrain.recommendedRecipes || []).map((r) => r.title);
      const nextRecipes = Array.from(
        new Set([...addedRecipes, ...(existing.lastRecommendedRecipes || [])])
      ).slice(0, 8);
      return {
        ...prev,
        [customerKey]: {
          ...existing,
          customerName: activeAuth?.name || existing.customerName,
          customerPhone: activeAuth?.phone || existing.customerPhone || existing.phone || '',
          phone: activeAuth?.phone || existing.phone || existing.customerPhone || '',
          turns: [
            {
              id: `pt_${Date.now()}`,
              userText: phrase,
              agentReply: localBrain.reply,
              intents: localBrain.intents,
              timestamp: turnTimestamp,
            },
            ...(existing.turns || []),
          ].slice(0, 25),
          favoriteItemNames: nextFavs,
          favoriteItems: nextFavs,
          lastRecommendedRecipe: nextRecipes[0] || existing.lastRecommendedRecipe || null,
          lastRecommendedRecipes: nextRecipes,
          updatedAt: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      };
    });

    notifyToast(localBrain.reply, 'success');

    // Synchronize with server-side /api/gnani/voice-intent for Gnani Vachana TTS & NLU enrichment
    try {
      const response = await fetch('/api/gnani/voice-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase,
          language: gnaniLanguage,
          personaId: gnaniPersonaId,
          acousticMode: gnaniAcousticMode,
          shelf,
          cart: nextCart,
          orders,
          cashbook,
          khata,
          registeredStores,
          memory: localBrain.updatedMemory,
          auth: activeAuth,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          outcome?: typeof localOutcome;
          brainResult?: VoiceBrainResult;
          spokenScript?: string;
          telemetry?: GnaniVoiceTelemetry;
          audioBase64?: string | null;
          providerUsed?: string;
          latencyMs?: number;
        };
        if (data.telemetry) {
          setGnaniTelemetry(data.telemetry);
        }
        if (data.providerUsed) {
          setGnaniProviderUsed(data.providerUsed);
        }
        if (typeof data.latencyMs === 'number') {
          setGnaniLatencyMs(data.latencyMs);
        }
        if (data.brainResult?.recommendedRecipes?.length) {
          setRecommendedRecipes(data.brainResult.recommendedRecipes);
        }
        const finalReply = data.brainResult?.reply || data.outcome?.reply || localBrain.reply;
        const spokenText =
          data.spokenScript ||
          data.brainResult?.spokenReply ||
          localBrain.spokenReply ||
          finalReply;
        const activeTel = data.telemetry || localTelemetry;
        setModalAiResponseText(`"${finalReply}"`);
        setCustVoiceFeedback(
          `🎙️ [${activeTel.personaName} • ${activeTel.languageCode}] ${finalReply}`
        );
        speakLocalTts(
          spokenText,
          activeTel.languageCode,
          activeTel.ttsPitch,
          activeTel.ttsRate,
          data.audioBase64
        );
        return;
      }
    } catch {
      // Fallback to local humanized speech synthesis if offline
    }

    speakLocalTts(
      localBrain.spokenReply || localBrain.reply,
      localTelemetry.languageCode,
      localTelemetry.ttsPitch,
      localTelemetry.ttsRate
    );
  };

  // Add all available ingredients from a recommended recipe directly to the customer's cart
  const addRecipeBundleToCart = (recipe: RecipeRecommendation) => {
    if (recipe.availableIngredients.length === 0) {
      notifyToast(`No stocked ingredients found on the shelf for ${recipe.title}.`, 'error');
      return;
    }
    let nextCart = [...cart];
    for (const sku of recipe.availableIngredients) {
      nextCart = mutateCartItems(nextCart, shelf, sku.id, 1);
    }
    setCart(nextCart);
    const summary = computeCartSummary(nextCart);
    const addedNames = recipe.availableIngredients.map((i) => i.name).join(', ');
    const msg = `Ji zaroor! ${recipe.title} ke ${recipe.availableIngredients.length} stocked items (${addedNames}) aapke bag mein add ho gaye hain. Total bill ₹${summary.totalPayable}.`;
    setModalAiResponseText(`"${msg}"`);
    setCustVoiceFeedback(`🎙️ [Recipe Chef] ${msg}`);
    notifyToast(`Added ${recipe.availableIngredients.length} items for ${recipe.title} to your bag!`, 'success');
    speakLocalTts(msg);
  };

  // Seed all 18 SKUs (including Pani Puri Golgappa, Pani Puri Masala, Boondi/Sev, Imli Chutney, Paneer, Poha, Rice, Dal, Butter, Maggi, Atta)
  const handleSeedCompleteRecipeShelf = async () => {
    setShelf(DEFAULT_KIRANA_CATALOG);
    const recs = recommendRecipesFromShelf(DEFAULT_KIRANA_CATALOG, 'aaj khane mein kya banao');
    setRecommendedRecipes(recs);
    try {
      await fetch('/api/db/shelf/seed-recipe-kit', { method: 'POST' });
    } catch {
      // Local state already updated
    }
    notifyToast(
      `Stocked ${DEFAULT_KIRANA_CATALOG.length} Kirana & Pani Puri / Recipe SKUs onto the live store shelf!`,
      'success'
    );
  };

  const stopVoiceCapture = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      speechRecRef.current = null;
    }
    setVoiceActive(false);
    setLiveInterimTranscript('');
  };

  const startHybridVoiceCapture = (source: 'modal' | 'customer') => {
    playChime();

    // Toggle off if already listening
    if (voiceActive) {
      stopVoiceCapture();
      const pendingText = (
        liveInterimTranscript ||
        (source === 'customer' ? custHinglishInput : modalVoiceInput)
      ).trim();
      if (pendingText) {
        void executeVoiceIntent(pendingText, source);
      } else {
        setModalVoiceStatus('Gnani Human Voice Concierge Ready — Tap Mic to Speak');
      }
      return;
    }

    const activeLangObj =
      GNANI_LANGUAGES.find((l) => l.code === gnaniLanguage) || GNANI_LANGUAGES[0];

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    const handleHardwareMicUnavailable = () => {
      setVoiceActive(false);
      setLiveInterimTranscript('');
      const typedInput = (source === 'customer' ? custHinglishInput : modalVoiceInput).trim();
      if (typedInput) {
        void executeVoiceIntent(typedInput, source);
        return;
      }
      // Focus input and prompt user to speak or type their own question (never run pre-ordered sample prompts)
      if (source === 'customer') {
        custInputRef.current?.focus();
      } else {
        modalInputRef.current?.focus();
      }
      setModalVoiceStatus(
        '🎙️ Browser microphone inactive — type your question or grant mic access to speak.'
      );
      notifyToast('Boliye ya box mein apna sawaal type karein.', 'info');
    };

    if (SpeechRec) {
      try {
        setVoiceActive(true);
        setLiveInterimTranscript('');
        setModalVoiceStatus(
          `🎙️ Gnani Prisma v3.0 Live Listening (${activeLangObj.label}) — Speak naturally...`
        );

        const rec = new SpeechRec();
        speechRecRef.current = rec;
        rec.lang = gnaniLanguage;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.continuous = continuousVoiceMode;

        let handledFinal = false;
        let latestTranscript = '';

        rec.onresult = (e: any) => {
          let interim = '';
          let finalTranscript = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const tr = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              finalTranscript += tr + ' ';
            } else {
              interim += tr;
            }
          }
          if (interim) {
            latestTranscript = interim;
            setLiveInterimTranscript(interim);
            if (source === 'customer') setCustHinglishInput(interim);
            else setModalVoiceInput(interim);
          }
          if (finalTranscript.trim()) {
            handledFinal = true;
            latestTranscript = finalTranscript.trim();
            setLiveInterimTranscript('');
            if (!continuousVoiceMode) {
              setVoiceActive(false);
              speechRecRef.current = null;
            }
            void executeVoiceIntent(finalTranscript.trim(), source);
          }
        };

        rec.onerror = () => {
          if (!handledFinal) {
            handledFinal = true;
            speechRecRef.current = null;
            if (latestTranscript.trim()) {
              setVoiceActive(false);
              void executeVoiceIntent(latestTranscript.trim(), source);
            } else {
              handleHardwareMicUnavailable();
            }
          }
        };

        rec.onend = () => {
          speechRecRef.current = null;
          if (!handledFinal) {
            handledFinal = true;
            if (latestTranscript.trim()) {
              setVoiceActive(false);
              void executeVoiceIntent(latestTranscript.trim(), source);
            } else {
              handleHardwareMicUnavailable();
            }
          } else if (!continuousVoiceMode) {
            setVoiceActive(false);
          }
        };

        rec.start();
        return;
      } catch {
        handleHardwareMicUnavailable();
      }
    } else {
      handleHardwareMicUnavailable();
    }
  };

  // Authentication Handlers
  const generateVerificationOtp = () => {
    const p = custPhone.trim();
    if (!/^\d{10}$/.test(p)) {
      notifyToast('Enter a 10-digit mobile number.', 'error');
      return;
    }
    const o = String(Math.floor(1000 + Math.random() * 9000));
    setCustOtp(o);
    setCustAuthError('');
    notifyToast(`OTP for +91 ${p}: ${o}`, 'success');
  };

  // Hydrate persistent voice memory for a customer when they sign in or register
  const hydrateCustomerMemoryOnAuth = (name: string, phone: string) => {
    const keyByPhone = phone.trim().toLowerCase();
    const keyByName = name.trim().toLowerCase().replace(/\s+/g, '_');
    const profile =
      customerVoiceProfiles[keyByPhone] || customerVoiceProfiles[keyByName] || null;
    if (profile && profile.turns.length > 0) {
      setVoiceMemory((prev) => ({
        ...prev,
        turnCount: Math.max(prev.turnCount, profile.turns.length),
        pastTurns: profile.turns,
        favoriteItems: profile.favoriteItems,
        recommendedRecipesHistory: profile.lastRecommendedRecipes,
      }));
      const lastTurn = profile.turns[0];
      const welcomeBackMsg = `Welcome back ${name} ji! Mujhe humari pichli baat yaad hai jab aapne "${lastTurn.userText}" pucha tha. Aaj main aapki kya madad karun?`;
      setCustVoiceFeedback(`🎙️ [Gnani Memory Active] ${welcomeBackMsg}`);
      setModalAiResponseText(`"${welcomeBackMsg}"`);
    }
  };

  const submitCustomerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = custPhone.trim();
    const otp = custOtp.trim();

    if (customerAuthMode === 'signin') {
      if (!/^\d{10}$/.test(phone) || !/^\d{4}$/.test(otp)) {
        setCustAuthError('Please enter your registered 10-digit mobile number and 4-digit OTP.');
        return;
      }
      // Verify customer is registered first in local state or local backend database
      let foundCustomer =
        registeredCustomers.find((c) => c.phone === phone) || null;
      if (!foundCustomer) {
        try {
          const res = await fetch('/api/db/customers/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.customer) {
              foundCustomer = data.customer as RegisteredCustomer;
            }
          }
        } catch {
          // Ignore network error
        }
      }

      if (!foundCustomer) {
        setCustAuthError(
          `Mobile +91 ${phone} is not registered yet! Please register your customer profile and delivery address first.`
        );
        notifyToast(
          `Unregistered mobile +91 ${phone}. Please complete Customer Registration first.`,
          'error'
        );
        return;
      }

      const resolvedAddr = foundCustomer.formattedAddress || foundCustomer.address || foundCustomer.flatOrHouse;
      setCustAuthError('');
      setAuth({
        role: 'customer',
        name: foundCustomer.name,
        phone: foundCustomer.phone,
        address: resolvedAddr,
        memberSince: foundCustomer.createdAt || foundCustomer.registeredAt || 'Verified Member',
      });
      setCustName(foundCustomer.name);
      setCustAddress(resolvedAddr);

      const signInAddr: CustomerDeliveryAddress = {
        id: `addr_${foundCustomer.id}`,
        tag: foundCustomer.addressTag || 'Home',
        flatOrHouse: foundCustomer.flatOrHouse || resolvedAddr,
        areaOrStreet: foundCustomer.areaOrStreet || foundCustomer.city || 'Verified Locality',
        landmark: foundCustomer.landmark || 'Local Kirana Hub',
        receiverName: foundCustomer.name,
        receiverPhone: foundCustomer.phone,
        isDefault: true,
      };
      setSavedAddresses((prev) => {
        const exists = prev.some((a) => a.id === signInAddr.id);
        return exists ? prev : [signInAddr, ...prev];
      });
      setSelectedAddressId(signInAddr.id);
      hydrateCustomerMemoryOnAuth(foundCustomer.name, foundCustomer.phone);
      notifyToast(
        `Welcome back ${foundCustomer.name}! Signed in with saved address (${resolvedAddr}).`,
        'success'
      );
      setActiveRoute('customer');
      return;
    }

    // Customer Registration Mode (Register First with Full Delivery Address)
    const name = custName.trim();
    const address = custAddress.trim();
    const landmark = custLandmark.trim() || 'Near Main Market';
    const city = custCity.trim() || 'Indore';
    const pincode = custPincode.trim() || '452001';

    if (!name || !/^\d{10}$/.test(phone) || !/^\d{4}$/.test(otp) || !address) {
      setCustAuthError(
        'Please complete Customer Registration with your Full Name, 10-digit mobile, 4-digit OTP, and Delivery Address.'
      );
      return;
    }
    setCustAuthError('');
    const memberSinceLabel = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const formattedFullAddress = `${address}, ${landmark}, ${city} - ${pincode}`;
    const newCustomerRecord: RegisteredCustomer = {
      id: `cust_${Date.now()}`,
      name,
      phone,
      address: formattedFullAddress,
      formattedAddress: formattedFullAddress,
      flatOrHouse: address,
      areaOrStreet: `${city} (${pincode})`,
      landmark,
      city,
      pincode,
      addressTag: custAddrTag,
      dietaryPreference: 'all',
      createdAt: memberSinceLabel,
      registeredAt: memberSinceLabel,
      lastLoginAt: memberSinceLabel,
    };

    setRegisteredCustomers((prev) => {
      const idx = prev.findIndex((c) => c.phone === phone);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newCustomerRecord, id: copy[idx].id };
        return copy;
      }
      return [newCustomerRecord, ...prev];
    });

    try {
      await fetch('/api/db/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address: formattedFullAddress,
          flatOrHouse: address,
          areaOrStreet: `${city} (${pincode})`,
          landmark,
          city,
          pincode,
          addressTag: custAddrTag,
        }),
      });
    } catch {
      // Local state already updated
    }

    setAuth({
      role: 'customer',
      name,
      phone,
      address,
      memberSince: memberSinceLabel,
    });

    // Sync default address in Swiggy/Zomato-style Saved Addresses list
    const homeAddrId = 'addr_home_default';
    const defaultHomeAddr: CustomerDeliveryAddress = {
      id: homeAddrId,
      tag: custAddrTag,
      flatOrHouse: address,
      areaOrStreet: `${city} - ${pincode}`,
      landmark,
      receiverName: name,
      receiverPhone: phone,
      isDefault: true,
    };
    setSavedAddresses((prev) => {
      const exists = prev.some((a) => a.id === homeAddrId);
      return exists
        ? prev.map((a) => (a.id === homeAddrId ? defaultHomeAddr : a))
        : [defaultHomeAddr, ...prev];
    });
    setSelectedAddressId((prev) => prev || homeAddrId);
    setAddrReceiverName(name);
    setAddrReceiverPhone(phone);
    hydrateCustomerMemoryOnAuth(name, phone);

    notifyToast(
      `Registered ${name} (+91 ${phone}) in Local Database & unlocked Customer Storefront!`,
      'success'
    );
    setActiveRoute('customer');
  };

  // Swiggy / Zomato Multi-Address Management Handlers
  const handleAddSavedAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const flat = addrFlat.trim();
    const area = addrArea.trim();
    const landmark = addrLandmark.trim();
    const recName = (addrReceiverName.trim() || auth?.name || custName.trim() || 'Customer').trim();
    const recPhone = (
      addrReceiverPhone.trim() ||
      auth?.phone ||
      custPhone.trim() ||
      '9876543210'
    ).trim();

    if (!flat || !area) {
      setAddrFormError('Please enter both Flat/House No. and Area/Street/Society.');
      return;
    }
    setAddrFormError('');

    const newAddr: CustomerDeliveryAddress = {
      id: `addr_${Date.now()}`,
      tag: addrTag,
      customLabel: addrTag === 'Other' ? addrCustomTag.trim() || 'Other' : undefined,
      flatOrHouse: flat,
      areaOrStreet: area,
      landmark: landmark || 'Main Market',
      receiverName: recName,
      receiverPhone: recPhone,
      isDefault: savedAddresses.length === 0,
      lat: userLivePosition?.lat,
      lng: userLivePosition?.lng,
    };

    setSavedAddresses((prev) => [newAddr, ...prev]);
    setSelectedAddressId(newAddr.id);
    if (auth?.role === 'customer') {
      setAuth({
        ...auth,
        address: formatDeliveryAddressSummary(newAddr),
      });
    }
    setAddrFlat('');
    setAddrArea('');
    setAddrLandmark('');
    setAddrCustomTag('');
    notifyToast(
      `Saved "${newAddr.customLabel || newAddr.tag}" delivery address & set as active!`,
      'success'
    );
  };

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const chosen = savedAddresses.find((a) => a.id === addrId);
    if (chosen && auth?.role === 'customer') {
      setAuth({
        ...auth,
        address: formatDeliveryAddressSummary(chosen),
      });
      notifyToast(
        `Delivering to ${chosen.customLabel || chosen.tag}: ${chosen.flatOrHouse}, ${chosen.areaOrStreet}`,
        'info'
      );
    }
  };

  const handleDeleteSavedAddress = (addrId: string) => {
    setSavedAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== addrId);
      if (selectedAddressId === addrId) {
        setSelectedAddressId(remaining[0]?.id || null);
      }
      return remaining;
    });
    notifyToast('Removed saved address.', 'info');
  };

  const handleAutoFillAddressGps = () => {
    if (userLivePosition) {
      setAddrArea(
        `GPS Pin (${userLivePosition.lat.toFixed(4)}, ${userLivePosition.lng.toFixed(4)})`
      );
      notifyToast('Auto-filled live GPS coordinates into Area/Street!', 'success');
    } else {
      requestUserLiveLocation();
      setAddrArea('GPS Verified Street Sector');
    }
  };

  const submitShopkeeperAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const storeName = shopName.trim();
    const ownerName = shopOwner.trim();
    const address = shopAddress.trim();
    const phone = shopPhone.trim();
    const pin = shopPin.trim();

    if (!storeName || !ownerName || !address || !/^\d{10}$/.test(phone) || !/^\d{4}$/.test(pin)) {
      setShopAuthError('Please complete all merchant and address fields (10-digit mobile & 4-digit PIN).');
      return;
    }

    setShopAuthError('');
    const newStoreId = 'store_' + Date.now();
    const newStore: RegisteredStore = {
      id: newStoreId,
      storeName,
      ownerName,
      address,
      phone,
      lat: userLivePosition ? userLivePosition.lat + 0.005 : 21.1458,
      lng: userLivePosition ? userLivePosition.lng + 0.005 : 79.0882,
      gstin: '27AABCS1429B1Z5',
      upiVpa: `${storeName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'merchant'}@upi`,
      isOpenForVoice: true,
    };

    setRegisteredStores((prev) => [...prev, newStore]);
    setSelectedStoreId(newStoreId);
    const memberSinceLabel = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    setAuth({
      role: 'shopkeeper',
      name: ownerName,
      storeName,
      phone,
      address,
      memberSince: memberSinceLabel,
    });

    setMapIframeSrc(
      `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    );
    setMapActiveStoreLabel(storeName);
    setMapActiveStoreDist(address);
    setMapOverlayStatus(`Store Selected: ${storeName}`);

    notifyToast(`Store "${storeName}" registered onto the Live GPS Map!`, 'success');
    setActiveRoute('shopkeeper');
  };

  const logoutSession = () => {
    setAuth(null);
    setLoginRole('customer');
    notifyToast('Signed out successfully.', 'info');
    setActiveRoute('home');
  };

  // Contact & Email Notification Dispatcher
  const submitContactFormWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const name = contactName.trim();
    const email = contactEmail.trim();
    const msg = contactMessage.trim();
    if (!name || !email || !msg) {
      setContactFormError('Please fill in your name, email address, and message.');
      return;
    }
    setContactFormError('');
    const ticketId = '#SQ-' + Math.floor(100000 + Math.random() * 900000);
    setEmailTicketPill(ticketId);
    setEmailGreeting(
      emailTemplateMode === 'admin'
        ? `Admin Alert: New Inquiry from ${name} (${email})`
        : `Namaste ${name}!`
    );
    setEmailCardTopic(contactTopic);
    setEmailCardMessage(`"${msg}"`);
    notifyToast(`HTML Email Generated for ${email}! (${ticketId})`, 'success');
  };

  const downloadEmlNotificationFile = () => {
    const eml = `From: notifications@suchiqo.in\r\nTo: ${
      contactEmail.trim() || 'support@suchiqo.in'
    }\r\nSubject: [SuchiQO ${emailTicketPill}] ${emailCardTopic}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${emailGreeting}\r\nTopic: ${emailCardTopic}\r\nTicket: ${emailTicketPill}\r\n\r\nMessage:\r\n${emailCardMessage}`;
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'SuchiQO_Notification.eml';
    a.click();
    notifyToast('Downloaded .EML notification file!', 'success');
  };

  // Shopkeeper Inventory, Cashbook & Udhaar Khata Handlers
  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSkuName.trim();
    const mrp = parseFloat(newSkuMrp);
    const price = parseFloat(newSkuPrice);
    const stock = parseFloat(newSkuStock);
    if (!name || isNaN(mrp) || isNaN(price) || isNaN(stock) || stock < 1) return;

    const newItem: ShelfItem = {
      id: 'sku_' + Date.now(),
      name,
      category: newSkuCategory,
      mrp,
      price,
      stock,
      unit: newSkuUnit || 'item',
      emoji: '🛍️',
    };

    setShelf((prev) => [...prev, newItem]);
    setNewSkuName('');
    setNewSkuMrp('');
    setNewSkuPrice('');
    setNewSkuStock('');
    notifyToast(`Published "${name}" to store shelf!`, 'success');
  };

  const handleAddKharchaEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const note = cbNote.trim();
    const amount = parseFloat(cbAmount);
    if (!note || isNaN(amount) || amount <= 0) return;

    setCashbook((prev) => [
      {
        id: 'cb_' + Date.now(),
        note,
        type: cbType,
        amount,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    setCbNote('');
    setCbAmount('');
    notifyToast(
      `Recorded ${cbType === 'income' ? 'Cash In' : 'Kharcha'}: ₹${amount}`,
      'success'
    );
  };

  const handleAddKhataEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const customerName = khataCustomer.trim();
    const phone = khataPhone.trim();
    const amount = parseFloat(khataAmount);
    if (!customerName || isNaN(amount) || amount <= 0) return;

    setKhata((prev) => [
      {
        id: 'kh_' + Date.now(),
        customerName,
        phone: phone || 'N/A',
        type: khataType,
        amount,
        note: khataNote.trim() || (khataType === 'udhaar' ? 'Credit Purchase' : 'Payment Received'),
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    setKhataCustomer('');
    setKhataPhone('');
    setKhataAmount('');
    setKhataNote('');
    notifyToast(
      `Updated Udhaar Khata for ${customerName}: ₹${amount}`,
      'success'
    );
  };

  // Customer Cart & Order Submission
  const mutateCustomerCart = (skuId: string, delta: number) => {
    if (!auth || auth.role !== 'customer') {
      requestRoute('login');
      return;
    }
    setCart((prev) => mutateCartItems(prev, shelf, skuId, delta));
  };

  // Derived states
  const cartSummary = computeCartSummary(cart);
  const erpKpis = computeErpKpis(orders, shelf, cashbook, khata);
  const activeStore = registeredStores.find((s) => s.id === selectedStoreId) || null;
  const activeCustomerKeyPhone = (auth?.phone || custPhone).trim().toLowerCase();
  const activeCustomerKeyName = (auth?.name || custName).trim().toLowerCase().replace(/\s+/g, '_');
  const activeCustomerVoiceProfile =
    customerVoiceProfiles[activeCustomerKeyPhone] ||
    customerVoiceProfiles[activeCustomerKeyName] ||
    customerVoiceProfiles['guest_session'] ||
    null;
  const filteredShelf = shelf.filter((s) => {
    if (userPreferences.pureVegOnly && s.isPureVeg === false) return false;
    return s.name.toLowerCase().includes(custShelfSearch.trim().toLowerCase());
  });
  const customerOrders = filterCustomerOrders(
    orders,
    orderHistoryFilter,
    auth?.role === 'customer' ? auth.name : undefined
  );
  const completedOrdersCount = filterCustomerOrders(
    orders,
    'completed',
    auth?.role === 'customer' ? auth.name : undefined
  ).length;
  const totalCustomerOrdersCount = filterCustomerOrders(
    orders,
    'all',
    auth?.role === 'customer' ? auth.name : undefined
  ).length;

  const activeNonDeliveredOrders = orders.filter(
    (o) =>
      o.status !== 'Delivered' &&
      (auth?.role !== 'customer' || !auth.name || o.customerName === auth.name)
  );
  const activeNonDeliveredOrdersCount = activeNonDeliveredOrders.length;
  const trackingOrder =
    orders.find((o) => o.id === selectedTrackingOrderId) ||
    activeNonDeliveredOrders[0] ||
    orders[0] ||
    null;

  const handleOpenOrderTracking = (orderId: string) => {
    setSelectedTrackingOrderId(orderId);
    setCustomerTab('tracking');
    notifyToast(`Opening Real-Time Delivery Radar for Order ${orderId}...`, 'info');
  };

  const activeDeliveryAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0] || null;
  const activeDeliveryAddressText = activeDeliveryAddress
    ? formatDeliveryAddressSummary(activeDeliveryAddress)
    : auth?.address || 'Verified Local Address';
  const activePaymentModeObj =
    PAYMENT_MODES.find((m) => m.id === selectedPaymentMode) || PAYMENT_MODES[0];
  const activeScheduleSummary =
    orderSchedule.slotId === 'custom-slot' && (orderSchedule.customDate || orderSchedule.customTime)
      ? `Custom: ${orderSchedule.customDate || 'Today'} ${orderSchedule.customTime || ''}`.trim()
      : orderSchedule.slotLabel;

  const submitAuthenticatedOrder = () => {
    if (!auth || cart.length === 0) return;
    const summary = computeCartSummary(cart);
    const itemsDesc = cart.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ');
    const orderId = `#${nextOrderSeq}`;
    setNextOrderSeq((n) => n + 1);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const paymentLabel =
      selectedPaymentMode === 'upi' && upiIdInput.trim()
        ? `${activePaymentModeObj.label} (${upiIdInput.trim()})`
        : selectedPaymentMode === 'cod' && codChangeNote.trim()
        ? `${activePaymentModeObj.label} • ${codChangeNote.trim()}`
        : activePaymentModeObj.label;

    const scheduleLabel =
      orderSchedule.recurring !== 'none'
        ? `${activeScheduleSummary} (${orderSchedule.recurring.toUpperCase()})`
        : activeScheduleSummary;

    setOrders((prev) => [
      {
        id: orderId,
        customerName: auth.name,
        items: itemsDesc,
        total: summary.totalPayable,
        status: 'Pending',
        createdAt: nowStr,
        paymentMode: paymentLabel,
        scheduledFor: scheduleLabel,
        deliveryAddress: activeDeliveryAddressText,
        storeName: activeStore?.storeName || registeredStores[0]?.storeName || 'Verified Local Kirana',
        handoverOtp: String(Math.floor(1000 + Math.random() * 9000)),
        voiceTranscript: lastSpokenVoicePhrase || undefined,
        mrpSavings: summary.totalSavings,
        lineItems: cart.map((c) => ({
          skuId: c.id,
          name: c.name,
          qty: c.qty,
          unit: c.unit,
          mrp: c.mrp,
          price: c.price,
          emoji: c.emoji,
          hsn: c.hsn,
        })),
      },
      ...prev,
    ]);

    // Auto-record Udhaar Khata ledger entry if customer paid via Digital Udhaar Khata
    if (selectedPaymentMode === 'udhaar_khata') {
      setKhata((prev) => [
        {
          id: `kh_${Date.now()}`,
          customerName: auth.name,
          phone: auth.phone || '9876543210',
          type: 'udhaar',
          amount: summary.totalPayable,
          note: `Order ${orderId} (${itemsDesc})`,
          createdAt: nowStr,
        },
        ...prev,
      ]);
    }

    // Decrement stock on shelf
    setShelf((prevShelf) =>
      prevShelf.map((sku) => {
        const inCart = cart.find((c) => c.id === sku.id);
        return inCart
          ? { ...sku, stock: Math.max(0, sku.stock - inCart.qty) }
          : sku;
      })
    );

    setCart([]);
    setCheckoutDrawerOpen(false);
    setSelectedTrackingOrderId(orderId);
    setCustomerTab('tracking');
    speakLocalTts(
      `Ji shukriya! Aapka order ${orderId} ${activePaymentModeObj.shortLabel} payment aur ${activeScheduleSummary} ke saath confirm ho gaya hai.`
    );
    notifyToast(
      `Order ${orderId} placed via ${activePaymentModeObj.shortLabel} (${scheduleLabel})!`,
      'success'
    );
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    nextStatus: OrderRecord['status']
  ) => {
    setOrders((prev) => updateOrderRecordStatus(prev, orderId, nextStatus));
    notifyToast(
      `Order ${orderId} marked as ${
        nextStatus === 'Delivered' ? 'Completed (Delivered)' : nextStatus
      }!`,
      'success'
    );
  };

  return (
    <>
      <BrandSvgDefs />

      {/* Non-Blocking Toast Notification Stack */}
      <div
        id="toast-stack"
        role="status"
        aria-live="polite"
        className="fixed top-24 right-5 z-[110] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto bg-[#121316] text-white px-4 py-3 rounded-2xl shadow-2xl border ${
              t.variant === 'error'
                ? 'border-red-500/60'
                : 'border-[#FF5500]/60'
            } text-xs font-bold flex items-center justify-between gap-3`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* MAIN STICKY NAVIGATION HEADER                                         */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-50 bg-sq-bg/95 backdrop-blur-md shadow-2xs overflow-x-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => requestRoute('home')}
            className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none shrink-0"
            aria-label="SuchiQO Home"
          >
            <svg className="w-9 h-9 rounded-xl shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <use href="#suchiqo-app-icon" />
            </svg>
            <svg className="h-8 w-32 text-sq-ink shrink-0">
              <use href="#suchiqo-wordmark" />
            </svg>
          </button>

          <nav
            className="hidden xl:flex items-center gap-0.5 bg-sq-surface p-1 rounded-full shadow-2xs"
            aria-label="Main Navigation"
          >
            {(
              [
                { key: 'home', label: 'Home & Map', locked: false },
                { key: 'how-it-works', label: 'How It Works', locked: false },
                { key: 'for-shopkeepers', label: 'For Shopkeepers', locked: false },
                { key: 'contact', label: 'Contact', locked: false },
                { key: 'customer', label: 'Customer Storefront', locked: auth?.role !== 'customer' },
                { key: 'shopkeeper', label: 'Shopkeeper Console', locked: auth?.role !== 'shopkeeper' },
              ] as const
            ).map((item) => {
              const isActive = activeRoute === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => requestRoute(item.key)}
                  data-nav={item.key}
                  className={`nav-pill px-2.5 py-1.5 rounded-full text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-sq-accent text-white'
                      : 'text-sq-muted hover:text-sq-ink'
                  }`}
                >
                  {item.locked && <Lock className="w-3 h-3 text-amber-500" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Saffron Light / OLED Dark Mode Toggle Switch */}
            <div className="flex items-center gap-1.5 bg-sq-surface px-2.5 py-1.5 rounded-full shadow-2xs">
              <span
                className="text-[11px] font-extrabold text-sq-ink flex items-center gap-1 whitespace-nowrap"
                id="theme-status-label"
              >
                {themeMode === 'oled' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-sq-accent" />
                    <span className="hidden 2xl:inline">OLED Dark</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden 2xl:inline">Saffron Light</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={toggleLightDarkMode}
                id="theme-toggle-btn"
                className={`w-9 h-5 rounded-full p-0.5 relative transition-colors cursor-pointer focus:outline-none ${
                  themeMode === 'oled' ? 'bg-neutral-700' : 'bg-sq-accent'
                }`}
                aria-label="Toggle Saffron Light / OLED Dark Mode"
              >
                <span
                  id="theme-toggle-knob"
                  className="block w-4 h-4 bg-white rounded-full shadow-md transform transition-transform"
                  style={{
                    transform: themeMode === 'oled' ? 'translateX(16px)' : 'translateX(0px)',
                  }}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setVoiceModalOpen(true);
                playChime();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-sq-surface text-sq-ink font-extrabold text-xs hover:bg-sq-accentSoft transition cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Mic className="w-3.5 h-3.5 text-sq-accent" />
              <span className="hidden sm:inline">Voice AI</span>
            </button>

            <button
              type="button"
              id="header-profile-btn"
              onClick={() => requestRoute('profile')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full font-extrabold text-xs transition cursor-pointer whitespace-nowrap shadow-2xs ${
                activeRoute === 'profile'
                  ? 'bg-sq-accent text-white'
                  : 'bg-sq-surface text-sq-ink hover:bg-sq-accentSoft'
              }`}
            >
              {!auth && <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <span>Profile</span>
            </button>


            <button
              type="button"
              id="header-primary-auth-btn"
              onClick={() =>
                auth
                  ? requestRoute(auth.role === 'shopkeeper' ? 'shopkeeper' : 'customer')
                  : requestRoute('login')
              }
              className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span id="header-primary-auth-text">
                {auth ? auth.name.split(' ')[0] : 'Register / Sign In'}
              </span>
            </button>

            {auth && (
              <button
                type="button"
                id="top-logout-btn"
                onClick={logoutSession}
                className="px-3 py-2 rounded-full bg-sq-surface hover:bg-red-500/15 text-red-500 font-extrabold text-xs transition cursor-pointer whitespace-nowrap shadow-2xs"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Semantic Breadcrumb Navigation */}
      <nav
        id="breadcrumb-bar"
        aria-label="Breadcrumb"
        className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-1 text-xs"
      >
        <ol
          id="breadcrumb-list"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
          className="flex flex-wrap items-center gap-1.5 font-semibold text-sq-muted"
        >
          <li
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
            className="flex items-center gap-1"
          >
            <a
              itemProp="item"
              href="#/home"
              onClick={(e) => {
                e.preventDefault();
                requestRoute('home');
              }}
              className="hover:text-sq-accent transition"
            >
              <span itemProp="name">Home</span>
            </a>
            <meta itemProp="position" content="1" />
          </li>
          {activeRoute !== 'home' && (
            <>
              <li aria-hidden="true" className="text-sq-muted">
                /
              </li>
              <li
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                className="flex items-center gap-1 text-sq-ink font-extrabold"
              >
                <span itemProp="name">
                  {ROUTE_TITLES[activeRoute]?.breadcrumb || 'Page'}
                </span>
                <meta itemProp="position" content="2" />
              </li>
            </>
          )}
        </ol>
      </nav>

      <main className="flex-1">
        {/* =================================================================== */}
        {/* PAGE 1: HOME SHOWCASE WITH GOOGLE MAP & GEOLOCATION RADAR (`#/home`) */}
        {/* =================================================================== */}
        {activeRoute === 'home' && (
          <div id="view-home">
            <section className="pt-4 pb-12 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-10">
              {/* Hero Section Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <div className="anim-reveal-1 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-sq-accentSoft border border-sq-accent/25 text-sq-accent text-xs font-extrabold">
                    <span>LIVE GPS RADAR & HYBRID VOICE COMMERCE</span>
                  </div>

                  <h1 className="anim-reveal-2 text-5xl sm:text-6xl lg:text-[66px] font-extrabold tracking-tight text-sq-ink leading-[1.03]">
                    Your Shop.
                    <br />
                    <span>Your </span>
                    <span className="text-sq-accent">Voice.</span>
                  </h1>

                  <p className="anim-reveal-3 text-base sm:text-lg text-sq-muted font-medium leading-relaxed max-w-xl">
                    Speak naturally in Hinglish, allow GPS location access to find registered
                    neighborhood kiranas right near you, and manage store operations with zero
                    connection drops.
                  </p>

                  <div className="anim-reveal-4 flex flex-wrap items-center gap-3.5 pt-2">
                    <button
                      type="button"
                      onClick={requestUserLiveLocation}
                      className="btn-tactile inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-sm sm:text-base shadow-tactile cursor-pointer"
                    >
                      <LocateFixed className="w-5 h-5" />
                      <span id="hero-gps-btn-text">{heroGpsBtnText}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVoiceModalOpen(true);
                        playChime();
                      }}
                      className="btn-tactile inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-sm sm:text-base shadow-tactile cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Talk to Voice AI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => requestRoute('customer')}
                      className="btn-tactile inline-flex items-center gap-2 px-5 py-4 rounded-full bg-sq-accentSoft hover:bg-sq-accent hover:text-white text-sq-accent font-extrabold text-sm border border-sq-accent/30 shadow-xs transition cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Sign In to Order</span>
                    </button>
                  </div>

                  {/* Quick Links */}
                  <div className="anim-reveal-4 pt-4 border-t border-black/10 flex flex-wrap items-center gap-4 text-xs font-bold text-sq-muted">
                    <span>Explore:</span>
                    <a
                      href="#kirana-google-map"
                      className="text-sq-accent hover:underline flex items-center gap-1 font-extrabold"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Live GPS Google Map ↓
                    </a>
                    <a
                      href="#/how-it-works"
                      onClick={(e) => {
                        e.preventDefault();
                        requestRoute('how-it-works');
                      }}
                      className="hover:text-sq-ink"
                    >
                      How Voice Works →
                    </a>
                    <a
                      href="#/contact"
                      onClick={(e) => {
                        e.preventDefault();
                        requestRoute('contact');
                      }}
                      className="hover:text-sq-ink"
                    >
                      Contact & Support →
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div
                    id="hero-tilt-card"
                    className="bg-sq-surface rounded-[40px] p-6 sm:p-8 shadow-card border border-black/10 relative overflow-hidden"
                  >
                    <div className="bg-gradient-to-r from-[#FF5500] to-[#FF7733] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="bg-white text-[#121316] px-4 py-2 rounded-2xl shadow-md flex items-center gap-2">
                          <svg className="w-7 h-7 rounded-lg">
                            <use href="#suchiqo-app-icon" />
                          </svg>
                          <svg className="h-6 w-24 text-[#121316]">
                            <use href="#suchiqo-wordmark" />
                          </svg>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white font-mono text-[11px] font-bold">
                          GNANI AI VACHANA • {gnaniLanguage.toUpperCase()}
                        </span>
                      </div>
                      {/* Canopy */}
                      <div className="mt-5 h-6 flex rounded-xl overflow-hidden shadow-inner">
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-[#CC4000]" />
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-[#CC4000]" />
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-[#CC4000]" />
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-[#CC4000]" />
                      </div>
                    </div>

                    <div className="mt-5 bg-sq-surfaceAlt rounded-3xl p-5 border border-black/5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono uppercase text-sq-accent font-extrabold block">
                            GNANI PRISMA v3.0 STT + TIMBRE v3.0 TTS
                          </span>
                          <span className="text-[11px] text-sq-muted font-semibold">
                            {gnaniTelemetry.personaName} • {gnaniTelemetry.codeMixRatio}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceModalOpen(true);
                            playChime();
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white text-xs font-extrabold cursor-pointer transition whitespace-nowrap shrink-0"
                        >
                          Launch Gnani Voice Studio →
                        </button>
                      </div>
                      <WaveformCanvas
                        id="hero-wave-canvas"
                        width={460}
                        height={48}
                        voiceActive={voiceActive}
                        className="w-full h-12 rounded-2xl bg-sq-surface border border-black/5 px-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* =============================================================== */}
              {/* LIVE GPS RADAR & INTERACTIVE GOOGLE MAP ON FRONT SCREEN          */}
              {/* =============================================================== */}
              <div
                id="kirana-google-map"
                className="bg-sq-surface rounded-[40px] p-6 sm:p-10 shadow-card border border-black/10 space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-sq-accent text-white">
                        <Map className="w-5 h-5" />
                      </span>
                      <span className="text-xs font-mono uppercase tracking-widest text-sq-accent font-extrabold">
                        LIVE GPS KIRANA RADAR
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-sq-ink mt-2">
                      Find Stores Near Your Real Location
                    </h2>
                    <p className="text-xs sm:text-sm text-sq-muted mt-1">
                      Grant location access to center the map on your exact coordinates and compute
                      real-time delivery distances.
                    </p>
                  </div>

                  {/* Live GPS Status & Trigger Button */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={requestUserLiveLocation}
                      className="btn-tactile px-4 py-2.5 rounded-2xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile flex items-center gap-2 cursor-pointer"
                    >
                      <Crosshair className="w-4 h-4" />
                      <span id="gps-action-btn-label">{gpsActionBtnLabel}</span>
                    </button>

                    <div className="flex items-center gap-3 bg-sq-surfaceAlt p-3 rounded-2xl border border-black/10">
                      <span
                        id="gps-pulse-dot"
                        className="w-3 h-3 rounded-full bg-sq-accent animate-ping"
                      />
                      <div className="text-xs font-bold">
                        <p id="map-active-store-label" className="text-sq-ink">
                          {mapActiveStoreLabel}
                        </p>
                        <p
                          id="map-active-store-dist"
                          className="text-sq-accent font-mono text-[11px]"
                        >
                          {mapActiveStoreDist}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GPS Coordinates Telemetry Bar */}
                <div
                  id="gps-telemetry-banner"
                  className="bg-sq-surfaceAlt rounded-2xl p-3.5 border border-black/10 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-sq-accent" />
                    <span className="font-bold text-sq-ink" id="gps-telemetry-text">
                      {gpsTelemetryText}
                    </span>
                  </div>
                  <span
                    id="gps-accuracy-pill"
                    className="px-2.5 py-0.5 rounded-full bg-black/10 font-mono text-[11px] text-sq-muted"
                  >
                    {gpsAccuracyPill}
                  </span>
                </div>

                {/* Store Selection Cards & Google Map Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Store Selection Column (4 Cols) */}
                  <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono uppercase text-sq-muted font-bold">
                          Registered Stores Directory:
                        </span>
                        <span
                          id="registered-stores-count-badge"
                          className="font-mono text-[11px] font-bold text-sq-accent"
                        >
                          {registeredStores.length} registered
                        </span>
                      </div>

                      <div id="registered-stores-container" className="space-y-3">
                        {registeredStores.length === 0 ? (
                          <div className="bg-sq-surfaceAlt rounded-2xl p-5 border border-dashed border-black/15 text-center space-y-2">
                            <p className="font-extrabold text-xs text-sq-ink">
                              0 Local Stores Registered on Network
                            </p>
                            <p className="text-[11px] text-sq-muted leading-relaxed">
                              All demo stores have been purged. Are you a kirana store owner?
                              Register your store to publish your real location on this GPS map.
                            </p>
                            <button
                              type="button"
                              onClick={() => openLoginWithRole('shopkeeper')}
                              className="mt-2 px-4 py-2 rounded-xl bg-sq-accent hover:bg-sq-accentHover text-white text-[11px] font-extrabold cursor-pointer transition"
                            >
                              Register My Store on Map →
                            </button>
                          </div>
                        ) : (
                          registeredStores.map((store) => {
                            let distText = 'Calculated after GPS detection';
                            if (userLivePosition && store.lat && store.lng) {
                              const d = calculateHaversineDistance(
                                userLivePosition.lat,
                                userLivePosition.lng,
                                store.lat,
                                store.lng
                              );
                              const eta = calculateDeliveryEtaMinutes(d);
                              distText = `📍 ${d} km • ⏱️ ${eta} Mins ETA`;
                            }
                            const isSelected = selectedStoreId === store.id;
                            return (
                              <div
                                key={store.id}
                                onClick={() => selectRegisteredStore(store.id)}
                                className={`map-store-card p-4 rounded-2xl transition cursor-pointer space-y-1 ${
                                  isSelected
                                    ? 'bg-sq-accentSoft border-2 border-sq-accent'
                                    : 'bg-sq-surfaceAlt border border-black/10'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <h4 className="font-extrabold text-sm text-sq-ink">
                                    {store.storeName}
                                  </h4>
                                  <span className="text-sq-accent text-[10px] font-extrabold">
                                    OPEN
                                  </span>
                                </div>
                                <p className="text-xs text-sq-muted truncate">{store.address}</p>
                                {/* Interactive 5-Star Rating Component for Customer Trust */}
                                <div className="pt-0.5">
                                  <StoreFiveStarRating
                                    store={store}
                                    onRate={handleRateKiranaStore}
                                    currentUserId={auth?.phone || auth?.name}
                                    size="sm"
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-sq-accent font-bold">
                                  <span>{distText}</span>
                                  <span>Owner: {store.ownerName}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => requestRoute('customer')}
                      className="btn-tactile w-full py-3.5 rounded-2xl bg-sq-accent text-white font-extrabold text-xs shadow-tactile cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      <span>Enter Store & Voice Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Google Map Iframe (8 Cols - Auto-Inverted in OLED Dark Mode) */}
                  <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-black/15 shadow-inner relative min-h-[360px] bg-neutral-200">
                    <iframe
                      id="google-maps-embed-frame"
                      title="SuchiQO Kirana Google Maps Live Radar"
                      className="google-map-frame w-full h-full min-h-[400px] border-0"
                      src={mapIframeSrc}
                      loading="lazy"
                      allowFullScreen
                    />

                    {/* Map Dynamic Overlay */}
                    <div className="absolute bottom-4 left-4 bg-sq-surface/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-black/10 shadow-lg text-xs font-bold flex items-center gap-2.5">
                      <span className="text-sq-ink font-mono" id="map-overlay-status">
                        {mapOverlayStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 2: HOW IT WORKS (`#/how-it-works`)                             */}
        {/* =================================================================== */}
        {activeRoute === 'how-it-works' && (
          <div id="view-how-it-works">
            <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
              <div className="text-center max-w-2xl mx-auto">
                <span className="text-xs font-mono uppercase tracking-widest text-sq-accent font-extrabold">
                  GNANI.AI VACHANA TRI-LAYER VOICE ARCHITECTURE
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-sq-ink mt-2">
                  How Gnani AI & SuchiQO Voice Commerce Works
                </h1>
                <p className="text-sm text-sq-muted mt-2">
                  Powered by Gnani Prisma v3.0 Speech-to-Text, Gnani Timbre v3.0 Indic TTS, and
                  Hinglish Kirana NLU.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-sq-surface p-6 rounded-3xl border border-black/10 shadow-card">
                  <span className="text-xs font-mono font-bold text-sq-accent">
                    01. GNANI PRISMA v3.0 STT
                  </span>
                  <h2 className="text-lg font-extrabold text-sq-ink mt-3">
                    Code-Mixed Hinglish & Indic ASR
                  </h2>
                  <p className="text-xs text-sq-muted mt-2 leading-relaxed">
                    Recognizes mid-sentence Hindi-English code-switching across 9 Indian languages
                    with 8kHz/16kHz market noise suppression.
                  </p>
                </div>
                <div className="bg-sq-surface p-6 rounded-3xl border border-black/10 shadow-card">
                  <span className="text-xs font-mono font-bold text-sq-accent">
                    02. KIRANA HINGLISH NLU
                  </span>
                  <h2 className="text-lg font-extrabold text-sq-ink mt-3">
                    Quantity & Catalog Grounding
                  </h2>
                  <p className="text-xs text-sq-muted mt-2 leading-relaxed">
                    Parses spoken quantities (<code>ek</code>, <code>do</code>, <code>teen</code>,{' '}
                    <code>aadha</code>, <code>pao</code>) and matches against live kirana store
                    shelf SKUs.
                  </p>
                </div>
                <div className="bg-sq-surface p-6 rounded-3xl border border-black/10 shadow-card">
                  <span className="text-xs font-mono font-bold text-sq-accent">
                    03. GNANI TIMBRE v3.0 TTS
                  </span>
                  <h2 className="text-lg font-extrabold text-sq-ink mt-3">
                    Expressive Indic Voice Personas
                  </h2>
                  <p className="text-xs text-sq-muted mt-2 leading-relaxed">
                    Synthesizes natural Hinglish and regional responses using Ananya, Aarav, Rohan,
                    and Meera voice personas.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 3: FOR SHOPKEEPERS (`#/for-shopkeepers`)                       */}
        {/* =================================================================== */}
        {activeRoute === 'for-shopkeepers' && (
          <div id="view-for-shopkeepers">
            <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8">
              <div className="bg-[#121316] text-white rounded-[36px] p-8 sm:p-12 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="text-[#FF7733] font-mono text-xs font-bold">
                    NEIGHBORHOOD KIRANA ERP
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
                    Voice-First Inventory, GPS Radar & Udhaar Khata.
                  </h1>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Register your store to appear live on the neighborhood GPS map, publish products
                    to your shelf, update stock by voice, and manage customer credit ledgers.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openLoginWithRole('shopkeeper')}
                      className="btn-tactile px-7 py-4 rounded-full bg-[#FF5500] hover:bg-[#E04800] text-white font-extrabold text-sm shadow-tactile cursor-pointer"
                    >
                      Shopkeeper Sign In / Register Store →
                    </button>
                    <button
                      type="button"
                      onClick={() => requestRoute('contact')}
                      className="px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm transition cursor-pointer"
                    >
                      Contact Onboarding Team
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-6 space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-neutral-400">Map Discovery</span>
                    <span className="font-bold text-[#FF7733]">Live GPS Radar</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-neutral-400">Voice Stock Commands</span>
                    <span className="font-bold text-[#FF7733]">"Add product" by Voice</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-neutral-400">Clean State Architecture</span>
                    <span className="font-bold text-[#FF7733]">Zero Demo / Mock Clutter</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-neutral-400">Daily Accounting</span>
                    <span className="font-bold text-[#FF7733]">Hisab-Kitab & Khata</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 4: CONTACT & EMAIL NOTIFICATION DISPATCHER (`#/contact`)       */}
        {/* =================================================================== */}
        {activeRoute === 'contact' && (
          <div id="view-contact">
            <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 bg-sq-surface rounded-[36px] shadow-card border border-black/10 p-7 sm:p-8 space-y-5">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-sq-accent font-extrabold">
                      AUTOMATED EMAIL ENGINE
                    </span>
                    <h1 className="text-2xl font-extrabold text-sq-ink mt-1">
                      Contact & Support
                    </h1>
                    <p className="text-xs text-sq-muted mt-1 leading-relaxed">
                      Submit your inquiry to generate a branded HTML email notification with a
                      Ticket ID and downloadable <code>.eml</code> file.
                    </p>
                  </div>

                  <form
                    id="contact-support-form"
                    onSubmit={submitContactFormWithEmail}
                    className="space-y-4"
                    noValidate
                  >
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-extrabold text-sq-ink mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-semibold text-sq-ink"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-extrabold text-sq-ink mb-1"
                      >
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-semibold text-sq-ink"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-topic"
                        className="block text-xs font-extrabold text-sq-ink mb-1"
                      >
                        Inquiry Topic *
                      </label>
                      <select
                        id="contact-topic"
                        value={contactTopic}
                        onChange={(e) => setContactTopic(e.target.value)}
                        className="w-full px-3 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                      >
                        <option value="Kirana Store Onboarding">Kirana Store Onboarding</option>
                        <option value="Customer Voice Order Support">
                          Customer Voice Order Support
                        </option>
                        <option value="Technical Integration">Technical Integration</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-extrabold text-sq-ink mb-1"
                      >
                        Message *
                      </label>
                      <textarea
                        id="contact-message"
                        rows={3}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Describe your request..."
                        className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-semibold text-sq-ink"
                      />
                    </div>
                    {contactFormError && (
                      <p id="contact-form-error" className="text-xs font-bold text-red-600">
                        {contactFormError}
                      </p>
                    )}
                    <button
                      type="submit"
                      className="btn-tactile w-full py-4 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-sm shadow-tactile cursor-pointer"
                    >
                      Generate & Dispatch Email Notification →
                    </button>
                  </form>
                </div>

                {/* HTML Email Template Preview Card */}
                <div className="lg:col-span-7 bg-sq-surface rounded-[36px] shadow-card border border-black/10 overflow-hidden">
                  <div className="bg-[#121316] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
                    <span className="text-xs font-mono font-bold text-neutral-300">
                      HTML EMAIL TEMPLATE DISPATCHER
                    </span>
                    <div className="flex items-center bg-white/10 p-1 rounded-xl text-[11px] font-bold">
                      <button
                        type="button"
                        id="email-mode-customer"
                        onClick={() => setEmailTemplateMode('customer')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${
                          emailTemplateMode === 'customer'
                            ? 'bg-[#FF5500] text-white'
                            : 'text-neutral-300 hover:text-white'
                        }`}
                      >
                        Customer Reply
                      </button>
                      <button
                        type="button"
                        id="email-mode-admin"
                        onClick={() => setEmailTemplateMode('admin')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${
                          emailTemplateMode === 'admin'
                            ? 'bg-[#FF5500] text-white'
                            : 'text-neutral-300 hover:text-white'
                        }`}
                      >
                        Admin Alert
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-[#F4EFEA]">
                    <div
                      id="rendered-html-email-card"
                      className="max-w-xl mx-auto bg-white rounded-3xl overflow-hidden shadow-md border border-black/10 font-sans text-[#121316]"
                    >
                      <div className="bg-[#121316] px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <svg className="w-9 h-9 rounded-xl">
                            <use href="#suchiqo-app-icon" />
                          </svg>
                          <svg className="h-7 w-28 text-white">
                            <use href="#suchiqo-wordmark" />
                          </svg>
                        </div>
                        <span
                          id="email-card-ticket-pill"
                          className="px-3 py-1 rounded-full bg-[#FF5500] text-white font-mono text-xs font-extrabold"
                        >
                          {emailTicketPill}
                        </span>
                      </div>
                      <div className="p-6 space-y-4 text-xs sm:text-sm">
                        <p id="email-card-greeting" className="font-extrabold text-base text-[#121316]">
                          {emailGreeting}
                        </p>
                        <div className="bg-[#FAF3EB] rounded-2xl p-4 border border-orange-200/70 space-y-2 text-xs">
                          <div>
                            <span className="text-neutral-500 font-semibold">Topic:</span>{' '}
                            <span id="email-card-topic" className="font-extrabold text-[#121316]">
                              {emailCardTopic}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 font-semibold">Message:</span>
                            <p
                              id="email-card-message"
                              className="font-medium text-[#121316] mt-1 bg-white p-3 rounded-xl border border-black/5 italic"
                            >
                              {emailCardMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-sq-surface px-6 py-4 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={downloadEmlNotificationFile}
                      className="px-4 py-2.5 rounded-xl bg-sq-accentSoft hover:bg-sq-accent hover:text-white border border-sq-accent/30 text-sq-accent font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .EML File</span>
                    </button>
                    <a
                      id="contact-mailto-link"
                      href={`mailto:support@suchiqo.in?subject=${encodeURIComponent(
                        `[SuchiQO] ${emailCardTopic}`
                      )}&body=${encodeURIComponent(contactMessage)}`}
                      className="px-5 py-2.5 rounded-xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs transition inline-flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open in Mail App ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 5: STRICT ROLE-ISOLATED LOGIN (`#/login`)                      */}
        {/* =================================================================== */}
        {activeRoute === 'login' && (
          <div id="view-login">
            <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
              <div className="bg-sq-surface rounded-[36px] shadow-card border border-black/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-5 bg-[#121316] text-white p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-6">
                      <svg className="w-9 h-9 rounded-xl">
                        <use href="#suchiqo-app-icon" />
                      </svg>
                      <svg className="h-7 w-28 text-white">
                        <use href="#suchiqo-wordmark" />
                      </svg>
                    </div>
                    <span className="inline-block text-[#FF7733] font-mono text-[10px] font-bold mb-3">
                      PROTECTED ROUTE GATE • LOCAL PERSISTENT DB
                    </span>
                    <h1 className="text-2xl font-extrabold leading-snug">
                      Register Your Profile & Delivery Address First
                    </h1>
                    <p className="text-xs text-neutral-400 mt-3 leading-relaxed">
                      Every customer registers their full delivery address first before placing an order
                      or signing in. Your profile, addresses, and Gnani Voice conversation memory are
                      persisted in the local backend database.
                    </p>
                  </div>
                  <div className="mt-8 pt-4 border-t border-white/10 text-[11px] text-neutral-400 space-y-1.5">
                    <p className="font-bold text-[#FF7733]">
                      ✓ {registeredCustomers.length} Registered Customer(s) • {registeredStores.length}{' '}
                      Registered Shop(s)
                    </p>
                    <p>
                      Persistent Voice Memory recalls your past conversations and favorite dishes across
                      sessions.
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-7 p-8 sm:p-10">
                  <div className="grid grid-cols-2 bg-sq-surfaceAlt p-1.5 rounded-2xl border border-black/10 mb-5">
                    <button
                      type="button"
                      id="login-tab-customer"
                      onClick={() => setLoginRole('customer')}
                      className={`py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition cursor-pointer ${
                        loginRole === 'customer'
                          ? 'bg-sq-accent text-white'
                          : 'text-sq-muted hover:text-sq-ink'
                      }`}
                    >
                      🎙️ Customer Portal
                    </button>
                    <button
                      type="button"
                      id="login-tab-shopkeeper"
                      onClick={() => setLoginRole('shopkeeper')}
                      className={`py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition cursor-pointer ${
                        loginRole === 'shopkeeper'
                          ? 'bg-sq-accent text-white'
                          : 'text-sq-muted hover:text-sq-ink'
                      }`}
                    >
                      🏪 Shopkeeper Registration
                    </button>
                  </div>

                  {/* Customer Registration First + Existing Sign-In Form */}
                  {loginRole === 'customer' ? (
                    <form
                      id="customer-login-form"
                      onSubmit={submitCustomerAuth}
                      className="space-y-4"
                      noValidate
                    >
                      {/* Sub-Mode Toggle: Step 1 Register First vs Step 2 Sign In */}
                      <div className="grid grid-cols-2 gap-2 bg-sq-surfaceAlt p-1.5 rounded-2xl border border-black/10">
                        <button
                          type="button"
                          id="cust-mode-register-btn"
                          onClick={() => {
                            setCustomerAuthMode('register');
                            setCustAuthError('');
                          }}
                          className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            customerAuthMode === 'register'
                              ? 'bg-[#121316] text-white shadow-xs'
                              : 'text-sq-muted hover:text-sq-ink'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5 text-sq-accent" />
                          <span>1. Register Customer First</span>
                        </button>
                        <button
                          type="button"
                          id="cust-mode-signin-btn"
                          onClick={() => {
                            setCustomerAuthMode('signin');
                            setCustAuthError('');
                          }}
                          className={`py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            customerAuthMode === 'signin'
                              ? 'bg-[#121316] text-white shadow-xs'
                              : 'text-sq-muted hover:text-sq-ink'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5 text-sq-accent" />
                          <span>2. Registered Sign In ({registeredCustomers.length})</span>
                        </button>
                      </div>

                      {customerAuthMode === 'register' ? (
                        <>
                          <div className="bg-sq-accentSoft border border-sq-accent/25 rounded-2xl px-3.5 py-2.5 text-[11px] font-bold text-sq-ink">
                            📝 <strong>Step 1 — New Customer Registration:</strong> Register your name,
                            mobile, and complete delivery address first so your orders & voice memory are
                            saved to your account.
                          </div>

                          <div>
                            <label
                              htmlFor="auth-cust-name"
                              className="block text-xs font-extrabold text-sq-ink mb-1"
                            >
                              Full Name *
                            </label>
                            <input
                              id="auth-cust-name"
                              type="text"
                              required
                              value={custName}
                              onChange={(e) => setCustName(e.target.value)}
                              placeholder="Enter full name (e.g. Aarush Dixit)"
                              className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-semibold text-sq-ink"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-7">
                              <label
                                htmlFor="auth-cust-phone"
                                className="block text-xs font-extrabold text-sq-ink mb-1"
                              >
                                10-Digit Mobile *
                              </label>
                              <div className="flex gap-2">
                                <input
                                  id="auth-cust-phone"
                                  type="tel"
                                  required
                                  maxLength={10}
                                  value={custPhone}
                                  onChange={(e) => setCustPhone(e.target.value)}
                                  placeholder="10-digit mobile"
                                  className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink"
                                />
                                <button
                                  type="button"
                                  onClick={generateVerificationOtp}
                                  className="px-3.5 py-2 rounded-2xl bg-sq-accent hover:bg-sq-accentHover text-white font-bold text-xs shrink-0 transition cursor-pointer"
                                >
                                  OTP
                                </button>
                              </div>
                            </div>
                            <div className="sm:col-span-5">
                              <label
                                htmlFor="auth-cust-otp"
                                className="block text-xs font-extrabold text-sq-ink mb-1"
                              >
                                4-Digit OTP *
                              </label>
                              <input
                                id="auth-cust-otp"
                                type="text"
                                required
                                maxLength={4}
                                value={custOtp}
                                onChange={(e) => setCustOtp(e.target.value)}
                                placeholder="Enter OTP"
                                className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink tracking-widest"
                              />
                            </div>
                          </div>

                          <div>
                            <label
                              htmlFor="auth-cust-address"
                              className="block text-xs font-extrabold text-sq-ink mb-1"
                            >
                              Flat / House No., Building & Street Address *
                            </label>
                            <input
                              id="auth-cust-address"
                              type="text"
                              required
                              value={custAddress}
                              onChange={(e) => setCustAddress(e.target.value)}
                              placeholder="e.g. Flat 402, Shanti Residency, MG Road"
                              className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-xs font-semibold text-sq-ink"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label
                                htmlFor="auth-cust-landmark"
                                className="block text-[11px] font-extrabold text-sq-ink mb-1"
                              >
                                Landmark
                              </label>
                              <input
                                id="auth-cust-landmark"
                                type="text"
                                value={custLandmark}
                                onChange={(e) => setCustLandmark(e.target.value)}
                                placeholder="Near Main Market"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-semibold text-sq-ink"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="auth-cust-city"
                                className="block text-[11px] font-extrabold text-sq-ink mb-1"
                              >
                                City / Locality
                              </label>
                              <input
                                id="auth-cust-city"
                                type="text"
                                value={custCity}
                                onChange={(e) => setCustCity(e.target.value)}
                                placeholder="Indore"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-semibold text-sq-ink"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="auth-cust-pincode"
                                className="block text-[11px] font-extrabold text-sq-ink mb-1"
                              >
                                Pincode
                              </label>
                              <input
                                id="auth-cust-pincode"
                                type="text"
                                maxLength={6}
                                value={custPincode}
                                onChange={(e) => setCustPincode(e.target.value)}
                                placeholder="452001"
                                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-mono font-bold text-sq-ink"
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="auth-cust-tag"
                                className="block text-[11px] font-extrabold text-sq-ink mb-1"
                              >
                                Address Tag
                              </label>
                              <select
                                id="auth-cust-tag"
                                aria-label="Address Tag"
                                value={custAddrTag}
                                onChange={(e) =>
                                  setCustAddrTag(e.target.value as 'Home' | 'Work' | 'Other')
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink"
                              >
                                <option value="Home">🏠 Home</option>
                                <option value="Work">🏢 Work</option>
                                <option value="Other">📍 Other</option>
                              </select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-sq-surfaceAlt border border-black/10 rounded-2xl px-3.5 py-2.5 text-[11px] font-bold text-sq-ink">
                            🔑 <strong>Step 2 — Registered Customer Sign-In:</strong> Enter your
                            registered 10-digit mobile number and OTP. Your saved delivery address and
                            past voice conversations will load automatically.
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-7">
                              <label
                                htmlFor="auth-cust-phone"
                                className="block text-xs font-extrabold text-sq-ink mb-1"
                              >
                                Registered 10-Digit Mobile *
                              </label>
                              <div className="flex gap-2">
                                <input
                                  id="auth-cust-phone"
                                  type="tel"
                                  required
                                  maxLength={10}
                                  value={custPhone}
                                  onChange={(e) => setCustPhone(e.target.value)}
                                  placeholder="Registered 10-digit mobile"
                                  className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink"
                                />
                                <button
                                  type="button"
                                  onClick={generateVerificationOtp}
                                  className="px-3.5 py-2 rounded-2xl bg-sq-accent hover:bg-sq-accentHover text-white font-bold text-xs shrink-0 transition cursor-pointer"
                                >
                                  OTP
                                </button>
                              </div>
                            </div>
                            <div className="sm:col-span-5">
                              <label
                                htmlFor="auth-cust-otp"
                                className="block text-xs font-extrabold text-sq-ink mb-1"
                              >
                                4-Digit OTP *
                              </label>
                              <input
                                id="auth-cust-otp"
                                type="text"
                                required
                                maxLength={4}
                                value={custOtp}
                                onChange={(e) => setCustOtp(e.target.value)}
                                placeholder="Enter OTP"
                                className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink tracking-widest"
                              />
                            </div>
                          </div>

                          {registeredCustomers.length > 0 && (
                            <div className="bg-sq-surfaceAlt rounded-2xl p-3 border border-black/10 space-y-1.5">
                              <span className="block text-[10px] font-mono uppercase text-sq-muted font-extrabold">
                                Registered Accounts in Local DB (Click to Autofill Mobile):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {registeredCustomers.map((rc) => (
                                  <button
                                    key={rc.id}
                                    type="button"
                                    onClick={() => {
                                      setCustPhone(rc.phone);
                                      setCustOtp('4210');
                                      setCustAuthError('');
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-sq-surface border border-black/10 text-xs font-bold text-sq-ink hover:border-sq-accent cursor-pointer"
                                  >
                                    {rc.name} (+91 {rc.phone})
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {custAuthError && (
                        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
                          <p id="cust-auth-error" className="text-xs font-bold text-red-600">
                            {custAuthError}
                          </p>
                          {customerAuthMode === 'signin' && (
                            <button
                              type="button"
                              id="switch-to-register-cta"
                              onClick={() => {
                                setCustomerAuthMode('register');
                                setCustAuthError('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                            >
                              Switch to Customer Registration First →
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        id="customer-auth-submit-btn"
                        className="btn-tactile w-full py-4 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-sm shadow-tactile cursor-pointer"
                      >
                        {customerAuthMode === 'register'
                          ? 'Register Customer Profile & Enter Storefront →'
                          : 'Verify Registered Mobile & Sign In →'}
                      </button>
                    </form>
                  ) : (
                    /* Shopkeeper Registration & Map Pin Form */
                    <form
                      id="shopkeeper-login-form"
                      onSubmit={submitShopkeeperAuth}
                      className="space-y-4"
                      noValidate
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="auth-shop-name"
                            className="block text-xs font-extrabold text-sq-ink mb-1"
                          >
                            Kirana Store Name *
                          </label>
                          <input
                            id="auth-shop-name"
                            type="text"
                            required
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            placeholder="e.g. City Super Mart"
                            className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-semibold text-sq-ink"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="auth-shop-owner"
                            className="block text-xs font-extrabold text-sq-ink mb-1"
                          >
                            Owner Name *
                          </label>
                          <input
                            id="auth-shop-owner"
                            type="text"
                            required
                            value={shopOwner}
                            onChange={(e) => setShopOwner(e.target.value)}
                            placeholder="Enter owner name"
                            className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-semibold text-sq-ink"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="auth-shop-address"
                          className="block text-xs font-extrabold text-sq-ink mb-1"
                        >
                          Store Address & Area (For Google Map Pin) *
                        </label>
                        <input
                          id="auth-shop-address"
                          type="text"
                          required
                          value={shopAddress}
                          onChange={(e) => setShopAddress(e.target.value)}
                          placeholder="Store Street Address, City, State"
                          className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-xs font-semibold text-sq-ink"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="auth-shop-phone"
                            className="block text-xs font-extrabold text-sq-ink mb-1"
                          >
                            Merchant Mobile *
                          </label>
                          <input
                            id="auth-shop-phone"
                            type="tel"
                            required
                            maxLength={10}
                            value={shopPhone}
                            onChange={(e) => setShopPhone(e.target.value)}
                            placeholder="10-digit mobile"
                            className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="auth-shop-pin"
                            className="block text-xs font-extrabold text-sq-ink mb-1"
                          >
                            4-Digit Security PIN *
                          </label>
                          <input
                            id="auth-shop-pin"
                            type="password"
                            required
                            maxLength={4}
                            value={shopPin}
                            onChange={(e) => setShopPin(e.target.value)}
                            placeholder="4-digit PIN"
                            className="w-full px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink tracking-widest"
                          />
                        </div>
                      </div>

                      {shopAuthError && (
                        <p id="shop-auth-error" className="text-xs font-bold text-red-600">
                          {shopAuthError}
                        </p>
                      )}
                      <button
                        type="submit"
                        className="btn-tactile w-full py-4 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-sm shadow-tactile transition cursor-pointer"
                      >
                        Register Store on Map & Launch Console →
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 6: PROTECTED CUSTOMER STOREFRONT (`#/customer`)                */}
        {/* =================================================================== */}
        {activeRoute === 'customer' && (
          <div id="view-customer" className="pb-28">
            <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6">
              {/* Storefront Header with Swiggy/Zomato Active Address, Schedule & Payment Summary */}
              <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-sq-accent text-white flex items-center justify-center shadow-sm">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h1
                        id="cust-portal-store-title"
                        className="font-extrabold text-base sm:text-lg text-sq-ink"
                      >
                        {activeStore ? activeStore.storeName : 'Selected Storefront'}
                      </h1>
                      {activeStore && (
                        <div className="pt-0.5">
                          <StoreFiveStarRating
                            store={activeStore}
                            onRate={handleRateKiranaStore}
                            currentUserId={auth?.phone || auth?.name}
                            size="sm"
                          />
                        </div>
                      )}
                      <p id="cust-portal-address-line" className="text-xs text-sq-muted font-medium">
                        Delivering to: <strong className="text-sq-ink">{activeDeliveryAddressText}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceModalOpen(true);
                        playChime();
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-sq-accent text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Human Voice Concierge</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutDrawerOpen(true)}
                      className="px-4 py-2.5 rounded-2xl bg-sq-surfaceAlt border border-black/10 text-xs font-extrabold text-sq-ink flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        Bag (<span id="cust-top-bag-count">{cart.length}</span>)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Swiggy / Zomato Quick Bar: Active Address, Schedule & Payment Mode */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-black/10 text-xs">
                  <div className="bg-sq-surfaceAlt rounded-2xl p-3.5 border border-black/10 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold block">
                        📍 DELIVERY ADDRESS ({savedAddresses.length || 1} SAVED)
                      </span>
                      <p
                        id="cust-active-address-pill"
                        className="font-extrabold text-sq-ink truncate mt-0.5"
                      >
                        {activeDeliveryAddress
                          ? `${activeDeliveryAddress.customLabel || activeDeliveryAddress.tag}: ${activeDeliveryAddress.flatOrHouse}, ${activeDeliveryAddress.areaOrStreet}`
                          : activeDeliveryAddressText}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerTab('addresses')}
                      className="px-3 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-[11px] shrink-0 cursor-pointer"
                    >
                      Change / Add
                    </button>
                  </div>

                  <div className="bg-sq-surfaceAlt rounded-2xl p-3.5 border border-black/10 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold block">
                        ⏰ ORDER SCHEDULE
                      </span>
                      <p
                        id="cust-active-schedule-pill"
                        className="font-extrabold text-sq-ink truncate mt-0.5"
                      >
                        {activeScheduleSummary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerTab('schedule')}
                      className="px-3 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-[11px] shrink-0 cursor-pointer"
                    >
                      Schedule Time
                    </button>
                  </div>

                  <div className="bg-sq-surfaceAlt rounded-2xl p-3.5 border border-black/10 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold block">
                        💳 PAYMENT MODE
                      </span>
                      <p
                        id="cust-active-payment-pill"
                        className="font-extrabold text-sq-ink truncate mt-0.5"
                      >
                        {activePaymentModeObj.badge} • {activePaymentModeObj.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomerTab('payment')}
                      className="px-3 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-[11px] shrink-0 cursor-pointer"
                    >
                      Select Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* Clean Gnani Human Voice Bar (Strictly Checks Available Shop Stock — Zero Pre-Ordered Buttons) */}
              <div className="bg-sq-surface rounded-3xl p-6 shadow-card border-2 border-sq-accent/25 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => startHybridVoiceCapture('customer')}
                      className={`w-16 h-16 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white shadow-tactile flex items-center justify-center shrink-0 cursor-pointer transition ${
                        voiceActive ? 'ring-4 ring-sq-accent/40 scale-105' : ''
                      }`}
                      aria-label="Start Customer Voice Capture"
                    >
                      <Mic className="w-7 h-7" />
                    </button>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                        GNANI HUMAN VOICE CONCIERGE • STRICT LIVE STOCK CHECK
                      </span>
                      <h2 className="text-lg font-extrabold text-sq-ink">
                        Speak or Ask in Natural Hinglish
                      </h2>
                      <p id="cust-mic-status" className="text-xs text-sq-muted">
                        {voiceActive
                          ? `Listening Live: ${liveInterimTranscript || 'Speak now...'}`
                          : `${gnaniTelemetry.personaName} • ${gnaniTelemetry.languageLabel}`}
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        id="cust-gnani-language-select"
                        aria-label="Select Gnani AI Voice Language"
                        value={gnaniLanguage}
                        onChange={(e) => setGnaniLanguage(e.target.value as GnaniLanguageCode)}
                        className="px-3.5 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink cursor-pointer"
                      >
                        {GNANI_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                      <select
                        id="cust-gnani-persona-select"
                        aria-label="Select Gnani Timbre Voice Persona"
                        value={gnaniPersonaId}
                        onChange={(e) => setGnaniPersonaId(e.target.value as GnaniVoicePersonaId)}
                        className="px-3.5 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink cursor-pointer"
                      >
                        {GNANI_VOICE_PERSONAS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setContinuousVoiceMode((v) => !v)}
                        className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-extrabold border transition cursor-pointer ${
                          continuousVoiceMode
                            ? 'bg-sq-accent text-white border-sq-accent'
                            : 'bg-sq-surfaceAlt text-sq-ink border-black/15'
                        }`}
                      >
                        Auto-Listen: {continuousVoiceMode ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        ref={custInputRef}
                        id="cust-hinglish-input"
                        type="text"
                        value={custHinglishInput}
                        onChange={(e) => setCustHinglishInput(e.target.value)}
                        placeholder="Ask what is available on the shelf, add stocked items, schedule delivery time, or select payment mode..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            void executeVoiceIntent(custHinglishInput, 'customer');
                          }
                        }}
                        className="flex-1 px-4 py-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-xs sm:text-sm font-bold text-sq-ink"
                      />
                      <button
                        type="button"
                        id="cust-voice-send-btn"
                        onClick={() => void executeVoiceIntent(custHinglishInput, 'customer')}
                        className="btn-tactile px-6 py-3.5 rounded-2xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs sm:text-sm cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        Ask Gnani Voice →
                      </button>
                    </div>

                    <div
                      id="cust-voice-feedback"
                      className="text-xs font-bold text-sq-ink bg-sq-surfaceAlt px-3.5 py-2.5 rounded-xl border border-black/5 leading-relaxed"
                    >
                      {custVoiceFeedback}
                    </div>

                    {/* Quick Human Conversational Prompts for Customer */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        '⚡ Confirm order',
                        '📋 Mere pichle orders ki summary batao',
                        '🍲 Aaj khane mein kya banao?',
                        '🥙 Pani puri bana sakte hain kya?',
                        '⚡ Pani puri ka saara saman add kar do',
                        '🧠 Pichla conversation yaad hai?',
                        '🕒 Sham 7 baje schedule karo',
                        '💳 UPI payment mode lagao',
                      ].map((promptChip) => (
                        <button
                          key={promptChip}
                          type="button"
                          onClick={() => {
                            setCustHinglishInput(promptChip);
                            void executeVoiceIntent(promptChip, 'customer');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-sq-surfaceAlt hover:bg-sq-accent hover:text-white border border-black/10 text-[11px] font-bold text-sq-ink transition cursor-pointer"
                        >
                          {promptChip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Gnani Culinary Chef & Recipe Recommendations (Based Strictly on Shopkeeper's Stock) */}
                {recommendedRecipes.length > 0 && (
                  <div
                    id="cust-recipe-recommendations"
                    className="pt-3 border-t border-black/10 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-sq-accent font-extrabold">
                        <Utensils className="w-3.5 h-3.5" />
                        <span>
                          GNANI CULINARY CHEF RECOMMENDATIONS (MATCHED TO LIVE SHOPKEEPER STOCK)
                        </span>
                      </span>
                      <span className="text-[11px] text-sq-muted font-bold">
                        Say &quot;Pani puri ka saara saman add kar do&quot; or click below
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recommendedRecipes.slice(0, 3).map((rec) => (
                        <div
                          key={rec.id}
                          data-testid={`recipe-card-${rec.id}`}
                          className="p-3.5 rounded-2xl bg-sq-surfaceAlt border border-sq-accent/30 flex flex-col justify-between gap-2.5 text-xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-sm text-sq-ink">
                                {rec.emoji} {rec.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-sq-accent text-white font-mono text-[10px] font-extrabold">
                                {rec.prepTimeMinutes}m • ₹{rec.estimatedBundleCost}
                              </span>
                            </div>
                            <p className="text-[11px] text-sq-muted leading-snug">
                              {rec.hinglishPitch}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {rec.availableIngredients.map((ing) => (
                                <span
                                  key={ing.id}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 font-mono text-[10px] font-bold"
                                >
                                  ✓ {ing.emoji} {ing.name} (₹{ing.price})
                                </span>
                              ))}
                              {rec.missingIngredientNames.map((missing) => (
                                <span
                                  key={missing}
                                  className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 font-mono text-[10px] font-bold"
                                >
                                  Out: {missing}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            id={`add-recipe-bundle-${rec.id}`}
                            onClick={() => addRecipeBundleToCart(rec)}
                            className="w-full py-2 px-3 rounded-xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs transition cursor-pointer"
                          >
                            + Add All {rec.availableIngredients.length} Stocked Ingredients (₹
                            {rec.estimatedBundleCost}) →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Semantic Mapping Brain Breakdown in Storefront */}
                {voiceBrainSteps.length > 0 && (
                  <div
                    id="cust-brain-steps"
                    className="pt-3 border-t border-black/10 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                        GNANI SEMANTIC BRAIN MAPPING ({voiceBrainSteps.length} PARSED INTENTS •{' '}
                        {voiceMemory.pastTurns?.length || 0} REMEMBERED TURNS)
                      </span>
                      {voiceFollowUpPrompt && (
                        <span className="text-[11px] font-bold text-sq-muted">
                          💡 {voiceFollowUpPrompt}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {voiceBrainSteps.map((step) => (
                        <div
                          key={step.id}
                          className="p-2.5 rounded-xl bg-sq-surfaceAlt border border-black/10 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="px-2 py-0.5 rounded bg-sq-accent text-white font-mono text-[10px] font-extrabold uppercase">
                              {step.intent.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-[10px] text-sq-muted">
                              {Math.round(step.confidence * 100)}%
                            </span>
                          </div>
                          <p className="font-extrabold text-sq-ink truncate">{step.entityLabel}</p>
                          <p className="text-[11px] text-sq-muted line-clamp-2">{step.resolution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Storefront 5-Tab Navigation: Store Shelf | Payment Mode | Order Scheduling | Delivery Addresses | Order History */}
              <div
                role="tablist"
                aria-label="Customer Storefront Tabs"
                className="bg-sq-surface rounded-3xl p-2 shadow-card border border-black/10 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    role="tab"
                    id="cust-tab-shelf"
                    aria-selected={customerTab === 'shelf'}
                    aria-controls="cust-shelf-panel"
                    onClick={() => setCustomerTab('shelf')}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      customerTab === 'shelf'
                        ? 'bg-sq-accent text-white shadow-sm'
                        : 'text-sq-muted hover:text-sq-ink bg-sq-surfaceAlt'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Store Shelf</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
                        customerTab === 'shelf'
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 text-sq-ink'
                      }`}
                    >
                      {shelf.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="cust-tab-payment"
                    aria-selected={customerTab === 'payment'}
                    aria-controls="cust-payment-panel"
                    onClick={() => setCustomerTab('payment')}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      customerTab === 'payment'
                        ? 'bg-sq-accent text-white shadow-sm'
                        : 'text-sq-muted hover:text-sq-ink bg-sq-surfaceAlt'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Mode</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
                        customerTab === 'payment'
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 text-sq-ink'
                      }`}
                    >
                      {activePaymentModeObj.shortLabel}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="cust-tab-schedule"
                    aria-selected={customerTab === 'schedule'}
                    aria-controls="cust-schedule-panel"
                    onClick={() => setCustomerTab('schedule')}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      customerTab === 'schedule'
                        ? 'bg-sq-accent text-white shadow-sm'
                        : 'text-sq-muted hover:text-sq-ink bg-sq-surfaceAlt'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span>Order Scheduling</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
                        customerTab === 'schedule'
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 text-sq-ink'
                      }`}
                    >
                      {orderSchedule.mode === 'instant' ? '15m' : 'Scheduled'}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="cust-tab-addresses"
                    aria-selected={customerTab === 'addresses'}
                    aria-controls="cust-addresses-panel"
                    onClick={() => setCustomerTab('addresses')}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      customerTab === 'addresses'
                        ? 'bg-sq-accent text-white shadow-sm'
                        : 'text-sq-muted hover:text-sq-ink bg-sq-surfaceAlt'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Delivery Addresses</span>
                    <span
                      id="cust-addresses-badge-count"
                      className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
                        customerTab === 'addresses'
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 text-sq-ink'
                      }`}
                    >
                      {savedAddresses.length || 1}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="cust-tab-history"
                    aria-selected={customerTab === 'history'}
                    aria-controls="cust-order-history-panel"
                    onClick={() => setCustomerTab('history')}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      customerTab === 'history'
                        ? 'bg-sq-accent text-white shadow-sm'
                        : 'text-sq-muted hover:text-sq-ink bg-sq-surfaceAlt'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Order History</span>
                    <span
                      id="cust-history-badge-count"
                      className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
                        customerTab === 'history'
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 text-sq-ink'
                      }`}
                    >
                      {totalCustomerOrdersCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="cust-tab-tracking"
                    aria-selected={customerTab === 'tracking'}
                    aria-controls="cust-order-tracking-panel"
                    onClick={() => {
                      const target =
                        orders.find((o) => o.id === selectedTrackingOrderId) ||
                        orders.find((o) => o.status !== 'Delivered') ||
                        orders[0] ||
                        null;
                      if (target) setSelectedTrackingOrderId(target.id);
                      setCustomerTab('tracking');
                    }}
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
                      customerTab === 'tracking'
                        ? 'bg-sq-accent text-white shadow-sm'
                        : 'text-sq-muted hover:text-sq-ink bg-sq-surfaceAlt'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>Live Tracking Radar</span>
                    {activeNonDeliveredOrdersCount > 0 && (
                      <span
                        id="cust-tracking-active-badge"
                        className="px-2 py-0.5 rounded-full font-mono text-[11px] bg-emerald-500 text-white font-extrabold animate-pulse"
                      >
                        {activeNonDeliveredOrdersCount} Live
                      </span>
                    )}
                  </button>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-sq-surfaceAlt text-[11px] font-mono font-bold text-sq-muted flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sq-accent" />
                  <span id="cust-completed-orders-summary">
                    Completed Orders: {completedOrdersCount} / {totalCustomerOrdersCount}
                  </span>
                </div>
              </div>

              {/* TAB 1: STORE SHELF */}
              {customerTab === 'shelf' && (
                <div
                  id="cust-shelf-panel"
                  role="tabpanel"
                  aria-labelledby="cust-tab-shelf"
                  className="bg-sq-surface rounded-3xl p-6 shadow-card border border-black/10 space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-sq-ink">
                        Live Store Shelf (Strictly Shopkeeper-Published Stock)
                      </h3>
                      <p className="text-xs text-sq-muted">
                        AI Voice checks only what the shopkeeper has stocked here — never auto-adding unavailable items.
                      </p>
                    </div>
                    <input
                      id="cust-shelf-search"
                      type="search"
                      value={custShelfSearch}
                      onChange={(e) => setCustShelfSearch(e.target.value)}
                      placeholder="Filter shelf..."
                      aria-label="Filter store shelf"
                      className="px-4 py-2 rounded-full bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                    />
                  </div>
                  <div
                    id="cust-shelf-grid"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  >
                    {shelf.length === 0 ? (
                      <div className="col-span-full bg-sq-surfaceAlt rounded-3xl p-8 text-center border border-dashed border-black/20 space-y-3">
                        <p className="font-extrabold text-sq-ink">
                          Store Shelf Has 0 Published Items
                        </p>
                        <p className="text-xs text-sq-muted max-w-md mx-auto">
                          Only the Shopkeeper can publish inventory to the store shelf. If you ask the AI Voice for an item right now, it will honestly inform you that the item is not available in stock.
                        </p>
                        <button
                          type="button"
                          onClick={() => openLoginWithRole('shopkeeper')}
                          className="px-5 py-2.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs cursor-pointer transition"
                        >
                          Shopkeeper Login to Stock Shelf →
                        </button>
                      </div>
                    ) : filteredShelf.length === 0 ? (
                      <div className="col-span-full bg-sq-surfaceAlt rounded-3xl p-8 text-center border border-dashed border-black/20 space-y-2">
                        <p className="font-extrabold text-sq-ink">
                          No shelf items match &ldquo;{custShelfSearch}&rdquo;
                        </p>
                      </div>
                    ) : (
                      filteredShelf.map((sku) => {
                        const inBag = cart.find((c) => c.id === sku.id);
                        const qty = inBag ? inBag.qty : 0;
                        return (
                          <div
                            key={sku.id}
                            className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-2xl">{sku.emoji}</span>
                                <span className="text-[11px] font-mono text-sq-muted">
                                  Stock: {sku.stock} {sku.unit}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-sm text-sq-ink mt-2">{sku.name}</h4>
                              {sku.mrp > sku.price && (
                                <p className="text-[11px] text-sq-muted font-mono mt-0.5">
                                  MRP <span className="line-through">₹{sku.mrp}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                              <span className="font-mono font-black text-sm">₹{sku.price}</span>
                              {qty > 0 ? (
                                <div className="flex items-center gap-2 bg-sq-accent text-white px-2.5 py-1 rounded-xl text-xs font-bold">
                                  <button
                                    type="button"
                                    onClick={() => mutateCustomerCart(sku.id, -1)}
                                    className="cursor-pointer px-1"
                                    aria-label={`Decrease quantity of ${sku.name}`}
                                  >
                                    -
                                  </button>
                                  <span>{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => mutateCustomerCart(sku.id, 1)}
                                    className="cursor-pointer px-1"
                                    aria-label={`Increase quantity of ${sku.name}`}
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => mutateCustomerCart(sku.id, 1)}
                                  className="px-3.5 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                                >
                                  + ADD
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Pre-Checkout Step Banner after adding items */}
                  {cart.length > 0 && (
                    <div className="bg-sq-surfaceAlt rounded-2xl p-4 border border-sq-accent/30 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm font-extrabold text-sq-ink">
                          {cartSummary.itemCount} item(s) added to bag • Total ₹{cartSummary.totalPayable}
                        </p>
                        <p className="text-[11px] text-sq-muted">
                          Select your Payment Mode, Delivery Time Slot, or Delivery Address before checking out.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          id="shelf-to-schedule-btn"
                          onClick={() => setCustomerTab('schedule')}
                          className="px-4 py-2.5 rounded-xl bg-sq-surface border border-black/15 text-sq-ink font-extrabold text-xs cursor-pointer"
                        >
                          ⏰ Schedule Order Time
                        </button>
                        <button
                          type="button"
                          id="shelf-to-payment-btn"
                          onClick={() => setCustomerTab('payment')}
                          className="btn-tactile px-5 py-2.5 rounded-xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                        >
                          Proceed to Payment Mode →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PAYMENT MODE (PRE-CHECKOUT & POST-CART SELECTION) */}
              {customerTab === 'payment' && (
                <div
                  id="cust-payment-panel"
                  role="tabpanel"
                  aria-labelledby="cust-tab-payment"
                  className="bg-sq-surface rounded-3xl p-6 shadow-card border border-black/10 space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                        STEP 2 • PRE-CHECKOUT PAYMENT GATEWAY
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-sq-ink flex items-center gap-2 mt-0.5">
                        <CreditCard className="w-5 h-5 text-sq-accent" />
                        <span>Select Your Payment Mode</span>
                      </h3>
                      <p className="text-xs text-sq-muted mt-0.5">
                        Choose how you want to pay for your kirana order before checking out (or tell Gnani Voice: &ldquo;UPI se payment karunga&rdquo; / &ldquo;Udhaar Khata mein likh do&rdquo;).
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-sq-muted block">
                        Current Bag Payable
                      </span>
                      <span
                        id="payment-tab-total-amount"
                        className="font-mono font-black text-xl text-sq-accent"
                      >
                        ₹{cartSummary.totalPayable}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PAYMENT_MODES.map((mode) => {
                      const isSelected = selectedPaymentMode === mode.id;
                      return (
                        <div
                          key={mode.id}
                          id={`payment-mode-card-${mode.id}`}
                          onClick={() => {
                            setSelectedPaymentMode(mode.id);
                            notifyToast(`Selected Payment Mode: ${mode.label}`, 'info');
                          }}
                          className={`p-5 rounded-2xl transition cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-sq-accentSoft border-2 border-sq-accent shadow-sm'
                              : 'bg-sq-surfaceAlt border border-black/10 hover:border-sq-accent/40'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-sq-accent text-white font-mono text-[10px] font-extrabold uppercase">
                                {mode.badge}
                              </span>
                              <span className="text-xs font-mono font-extrabold text-sq-accent">
                                {isSelected ? '✓ SELECTED' : 'Tap to Select'}
                              </span>
                            </div>
                            <h4 className="text-base font-extrabold text-sq-ink">{mode.label}</h4>
                            <p className="text-xs text-sq-muted leading-relaxed">
                              {mode.description}
                            </p>
                          </div>

                          {isSelected && mode.id === 'upi' && (
                            <div
                              className="pt-3 border-t border-sq-accent/20 space-y-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label
                                htmlFor="payment-upi-id-input"
                                className="block text-[11px] font-extrabold text-sq-ink"
                              >
                                Your Verified UPI ID (GPay / PhonePe / Paytm)
                              </label>
                              <input
                                id="payment-upi-id-input"
                                type="text"
                                value={upiIdInput}
                                onChange={(e) => setUpiIdInput(e.target.value)}
                                placeholder="name@okaxis"
                                className="w-full px-3.5 py-2 rounded-xl bg-sq-surface border border-black/15 text-xs font-mono font-bold text-sq-ink"
                              />
                            </div>
                          )}

                          {isSelected && mode.id === 'cod' && (
                            <div
                              className="pt-3 border-t border-sq-accent/20 space-y-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label
                                htmlFor="payment-cod-note-input"
                                className="block text-[11px] font-extrabold text-sq-ink"
                              >
                                Cash Change Instruction for Delivery Partner
                              </label>
                              <input
                                id="payment-cod-note-input"
                                type="text"
                                value={codChangeNote}
                                onChange={(e) => setCodChangeNote(e.target.value)}
                                placeholder="e.g. Keep change for ₹500"
                                className="w-full px-3.5 py-2 rounded-xl bg-sq-surface border border-black/15 text-xs font-bold text-sq-ink"
                              />
                            </div>
                          )}

                          {isSelected && mode.id === 'udhaar_khata' && (
                            <div className="pt-3 border-t border-sq-accent/20 text-[11px] font-bold text-sq-accent">
                              ✓ Auto-Syncs ₹{cartSummary.totalPayable} to Shopkeeper Udhaar Khata Ledger on Checkout
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pre-Checkout Order Summary & Place Order CTA */}
                  <div className="bg-sq-surfaceAlt rounded-2xl p-5 border border-black/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <p className="font-extrabold text-sq-ink">
                        Active Payment: <span className="text-sq-accent">{activePaymentModeObj.label}</span>
                      </p>
                      <p className="text-sq-muted">
                        Delivering to: <strong className="text-sq-ink">{activeDeliveryAddressText}</strong> • Slot:{' '}
                        <strong className="text-sq-ink">{activeScheduleSummary}</strong>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomerTab('schedule')}
                        className="px-4 py-3 rounded-2xl bg-sq-surface border border-black/15 text-sq-ink font-extrabold text-xs cursor-pointer"
                      >
                        ⏰ Change Schedule Slot
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerTab('addresses')}
                        className="px-4 py-3 rounded-2xl bg-sq-surface border border-black/15 text-sq-ink font-extrabold text-xs cursor-pointer"
                      >
                        📍 Change Delivery Address
                      </button>
                      {cart.length > 0 ? (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <button
                            type="button"
                            id="payment-tab-confirm-order-btn"
                            onClick={submitAuthenticatedOrder}
                            className="btn-tactile px-6 py-3.5 rounded-2xl bg-sq-accent text-white font-extrabold text-xs sm:text-sm cursor-pointer"
                          >
                            Confirm & Place Order (₹{cartSummary.totalPayable}) →
                          </button>
                          <button
                            type="button"
                            id="voice-confirm-checkout-btn"
                            onClick={() => void executeVoiceIntent('Confirm order', 'customer')}
                            className="btn-tactile px-4 py-3.5 rounded-2xl bg-sq-accentSoft text-sq-accent hover:bg-sq-accent/20 border border-sq-accent/30 font-extrabold text-xs cursor-pointer flex items-center justify-center gap-2 transition"
                            title="Speak or click 'Confirm' to place your order using voice assistant"
                          >
                            <Mic className="w-4 h-4 text-sq-accent animate-pulse" />
                            <span>🎤 Speak "Confirm"</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCustomerTab('shelf')}
                          className="px-5 py-3 rounded-2xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                        >
                          Add Items from Shelf First →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ORDER SCHEDULING */}
              {customerTab === 'schedule' && (
                <div
                  id="cust-schedule-panel"
                  role="tabpanel"
                  aria-labelledby="cust-tab-schedule"
                  className="bg-sq-surface rounded-3xl p-6 shadow-card border border-black/10 space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                        CUSTOM DELIVERY TIME & RECURRING KIRANA PLANNER
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-sq-ink flex items-center gap-2 mt-0.5">
                        <CalendarClock className="w-5 h-5 text-sq-accent" />
                        <span>Schedule Your Order Delivery</span>
                      </h3>
                      <p className="text-xs text-sq-muted mt-0.5">
                        Get your order in 10–15 minutes or schedule it for Morning, Afternoon, Evening, Night, or a custom date & time.
                      </p>
                    </div>
                    <span
                      id="schedule-active-badge"
                      className="px-3.5 py-1.5 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-xs font-extrabold border border-sq-accent/30"
                    >
                      Active: {activeScheduleSummary}
                    </span>
                  </div>

                  {/* Delivery Slot Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DELIVERY_TIME_SLOTS.map((slot) => {
                      const isSelected = orderSchedule.slotId === slot.id;
                      return (
                        <div
                          key={slot.id}
                          id={`schedule-slot-card-${slot.id}`}
                          onClick={() => {
                            setOrderSchedule((prev) => ({
                              ...prev,
                              mode: slot.id === 'instant-15m' ? 'instant' : 'scheduled',
                              slotId: slot.id,
                              slotLabel: `${slot.label} (${slot.windowText})`,
                            }));
                            notifyToast(`Scheduled delivery slot: ${slot.label}`, 'info');
                          }}
                          className={`p-4 rounded-2xl transition cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-sq-accentSoft border-2 border-sq-accent shadow-sm'
                              : 'bg-sq-surfaceAlt border border-black/10 hover:border-sq-accent/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-sq-accent text-white font-mono text-[10px] font-extrabold uppercase">
                              {slot.tag}
                            </span>
                            <span className="text-[11px] font-mono font-extrabold text-sq-accent">
                              {isSelected ? '✓ ACTIVE' : 'Select'}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-sq-ink mt-1">{slot.label}</h4>
                          <p className="text-xs text-sq-muted font-semibold">{slot.windowText}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Date/Time, Recurring Frequency & Delivery Instructions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sq-surfaceAlt rounded-2xl p-5 border border-black/10 text-xs">
                    <div>
                      <label
                        htmlFor="schedule-custom-date"
                        className="block font-extrabold text-sq-ink mb-1.5"
                      >
                        Preferred Delivery Date (Optional)
                      </label>
                      <input
                        id="schedule-custom-date"
                        type="date"
                        value={orderSchedule.customDate}
                        onChange={(e) =>
                          setOrderSchedule((prev) => ({
                            ...prev,
                            mode: 'scheduled',
                            slotId: 'custom-slot',
                            customDate: e.target.value,
                            slotLabel: `Custom Date: ${e.target.value} ${prev.customTime || ''}`.trim(),
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-mono font-bold text-sq-ink"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="schedule-custom-time"
                        className="block font-extrabold text-sq-ink mb-1.5"
                      >
                        Specific Time Window (e.g. 07:30 AM / 06:30 PM)
                      </label>
                      <input
                        id="schedule-custom-time"
                        type="text"
                        value={orderSchedule.customTime}
                        onChange={(e) =>
                          setOrderSchedule((prev) => ({
                            ...prev,
                            mode: 'scheduled',
                            slotId: 'custom-slot',
                            customTime: e.target.value,
                            slotLabel: `Custom Time: ${prev.customDate || 'Today'} ${e.target.value}`.trim(),
                          }))
                        }
                        placeholder="e.g. 6:30 PM Evening"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-bold text-sq-ink"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="schedule-recurring-select"
                        className="block font-extrabold text-sq-ink mb-1.5"
                      >
                        Recurring Kirana Subscription
                      </label>
                      <select
                        id="schedule-recurring-select"
                        value={orderSchedule.recurring}
                        onChange={(e) =>
                          setOrderSchedule((prev) => ({
                            ...prev,
                            recurring: e.target.value as OrderScheduleConfig['recurring'],
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-extrabold text-sq-ink cursor-pointer"
                      >
                        <option value="none">One-Time Delivery Only</option>
                        <option value="daily">Repeat Daily (Milk, Bread & Morning Essentials)</option>
                        <option value="weekly">Repeat Weekly (Weekly Kirana Ration)</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label
                        htmlFor="schedule-instructions-input"
                        className="block font-extrabold text-sq-ink mb-1.5"
                      >
                        Delivery Partner Instructions (Doorbell / Guard / Gate Note)
                      </label>
                      <input
                        id="schedule-instructions-input"
                        type="text"
                        value={orderSchedule.instructions}
                        onChange={(e) =>
                          setOrderSchedule((prev) => ({
                            ...prev,
                            instructions: e.target.value,
                          }))
                        }
                        placeholder="e.g. Call upon arrival, leave bag at security desk if not home..."
                        className="w-full px-4 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-semibold text-sq-ink"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-sq-muted">
                      💡 Tip: You can also say by voice: <strong>&ldquo;Mera order shaam 6 baje schedule kar do&rdquo;</strong>
                    </p>
                    <button
                      type="button"
                      id="schedule-save-continue-btn"
                      onClick={() => {
                        notifyToast(`Order scheduled for: ${activeScheduleSummary}`, 'success');
                        setCustomerTab('payment');
                      }}
                      className="btn-tactile px-6 py-3 rounded-2xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                    >
                      Save Schedule & Continue to Payment Mode →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: SWIGGY / ZOMATO STYLE MULTIPLE DELIVERY ADDRESSES */}
              {customerTab === 'addresses' && (
                <div
                  id="cust-addresses-panel"
                  role="tabpanel"
                  aria-labelledby="cust-tab-addresses"
                  className="bg-sq-surface rounded-3xl p-6 shadow-card border border-black/10 space-y-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                        SWIGGY / ZOMATO MULTI-ADDRESS MANAGER
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-sq-ink flex items-center gap-2 mt-0.5">
                        <MapPin className="w-5 h-5 text-sq-accent" />
                        <span>Manage Delivery Addresses (Home, Work & More)</span>
                      </h3>
                      <p className="text-xs text-sq-muted mt-0.5">
                        Add multiple delivery addresses and switch instantly where you want to receive your kirana order.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left 7 Cols: Saved Addresses List */}
                    <div className="lg:col-span-7 space-y-3">
                      <h4 className="text-xs font-mono uppercase text-sq-muted font-extrabold">
                        Saved Delivery Addresses ({savedAddresses.length})
                      </h4>

                      {savedAddresses.length === 0 ? (
                        <div className="bg-sq-surfaceAlt rounded-2xl p-6 border border-dashed border-black/20 text-center space-y-2">
                          <p className="text-sm font-extrabold text-sq-ink">
                            Default Address Active: {auth?.address || 'Verified Local Address'}
                          </p>
                          <p className="text-xs text-sq-muted">
                            Use the form on the right to add Home, Work, Parents&apos; House, or Hostel addresses with landmarks.
                          </p>
                        </div>
                      ) : (
                        <div id="saved-addresses-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {savedAddresses.map((addr) => {
                            const isSelected = activeDeliveryAddress?.id === addr.id;
                            const tagTitle = addr.customLabel || addr.tag;
                            return (
                              <div
                                key={addr.id}
                                data-testid={`saved-address-card-${addr.tag.toLowerCase()}`}
                                onClick={() => handleSelectSavedAddress(addr.id)}
                                className={`p-4 rounded-2xl transition cursor-pointer flex flex-col justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-sq-accentSoft border-2 border-sq-accent shadow-sm'
                                    : 'bg-sq-surfaceAlt border border-black/10 hover:border-sq-accent/40'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sq-accent text-white font-mono text-[10px] font-extrabold uppercase">
                                      {addr.tag === 'Home' ? (
                                        <Home className="w-3 h-3" />
                                      ) : addr.tag === 'Work' ? (
                                        <Briefcase className="w-3 h-3" />
                                      ) : (
                                        <MapPin className="w-3 h-3" />
                                      )}
                                      <span>{tagTitle}</span>
                                    </span>
                                    {savedAddresses.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSavedAddress(addr.id);
                                        }}
                                        aria-label={`Delete ${tagTitle} address`}
                                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="font-extrabold text-sm text-sq-ink">
                                    {addr.flatOrHouse}
                                  </p>
                                  <p className="text-xs text-sq-muted font-medium">
                                    {addr.areaOrStreet}
                                  </p>
                                  {addr.landmark && (
                                    <p className="text-[11px] text-sq-accent font-semibold">
                                      Landmark: {addr.landmark}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-sq-muted font-mono pt-1">
                                    Receiver: {addr.receiverName} ({addr.receiverPhone})
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectSavedAddress(addr.id);
                                  }}
                                  className="w-full py-2 rounded-xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                                >
                                  {isSelected ? '✓ Delivering Here' : 'Deliver Here →'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right 5 Cols: Add New Swiggy/Zomato Style Address Form */}
                    <form
                      id="add-delivery-address-form"
                      onSubmit={handleAddSavedAddress}
                      className="lg:col-span-5 bg-sq-surfaceAlt rounded-2xl p-5 border border-black/10 space-y-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-sq-ink flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-sq-accent" />
                          <span>Add New Delivery Address</span>
                        </h4>
                        <button
                          type="button"
                          onClick={handleAutoFillAddressGps}
                          className="px-2.5 py-1 rounded-lg bg-sq-accent text-white font-extrabold text-[10px] cursor-pointer"
                        >
                          📍 Use Live GPS
                        </button>
                      </div>

                      {/* Address Tag Selector (Home / Work / Other) */}
                      <div>
                        <span className="block font-extrabold text-sq-ink mb-1.5">
                          Address Label (Swiggy / Zomato Tag)
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Home', 'Work', 'Other'] as const).map((tagOpt) => (
                            <button
                              key={tagOpt}
                              type="button"
                              id={`addr-tag-btn-${tagOpt.toLowerCase()}`}
                              onClick={() => setAddrTag(tagOpt)}
                              className={`py-2 rounded-xl font-extrabold text-xs border transition cursor-pointer ${
                                addrTag === tagOpt
                                  ? 'bg-sq-accent text-white border-sq-accent'
                                  : 'bg-sq-surface text-sq-ink border-black/15'
                              }`}
                            >
                              {tagOpt === 'Home' ? '🏠 Home' : tagOpt === 'Work' ? '🏢 Work' : '📍 Other'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {addrTag === 'Other' && (
                        <div>
                          <label
                            htmlFor="addr-custom-tag-input"
                            className="block font-extrabold text-sq-ink mb-1"
                          >
                            Custom Label (e.g. Parents&apos; Home, Hostel, Gym)
                          </label>
                          <input
                            id="addr-custom-tag-input"
                            type="text"
                            value={addrCustomTag}
                            onChange={(e) => setAddrCustomTag(e.target.value)}
                            placeholder="e.g. Parents' Home"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-semibold text-sq-ink"
                          />
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="addr-flat-input"
                          className="block font-extrabold text-sq-ink mb-1"
                        >
                          Flat / House No. / Floor / Building *
                        </label>
                        <input
                          id="addr-flat-input"
                          type="text"
                          required
                          value={addrFlat}
                          onChange={(e) => setAddrFlat(e.target.value)}
                          placeholder="e.g. Flat 402, Tower B, Shanti Heights"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-semibold text-sq-ink"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="addr-area-input"
                          className="block font-extrabold text-sq-ink mb-1"
                        >
                          Area / Street / Sector / Colony *
                        </label>
                        <input
                          id="addr-area-input"
                          type="text"
                          required
                          value={addrArea}
                          onChange={(e) => setAddrArea(e.target.value)}
                          placeholder="e.g. Dharampeth Main Road, Sector 4"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-semibold text-sq-ink"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="addr-landmark-input"
                          className="block font-extrabold text-sq-ink mb-1"
                        >
                          Nearby Landmark (Helps Delivery Partner)
                        </label>
                        <input
                          id="addr-landmark-input"
                          type="text"
                          value={addrLandmark}
                          onChange={(e) => setAddrLandmark(e.target.value)}
                          placeholder="e.g. Opposite Shiv Mandir / Near Metro Gate 2"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surface border border-black/15 font-semibold text-sq-ink"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label
                            htmlFor="addr-receiver-name"
                            className="block font-extrabold text-sq-ink mb-1"
                          >
                            Receiver Name
                          </label>
                          <input
                            id="addr-receiver-name"
                            type="text"
                            value={addrReceiverName}
                            onChange={(e) => setAddrReceiverName(e.target.value)}
                            placeholder={auth?.name || 'Receiver Name'}
                            className="w-full px-3 py-2 rounded-xl bg-sq-surface border border-black/15 font-semibold text-sq-ink"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="addr-receiver-phone"
                            className="block font-extrabold text-sq-ink mb-1"
                          >
                            Receiver Mobile
                          </label>
                          <input
                            id="addr-receiver-phone"
                            type="tel"
                            maxLength={10}
                            value={addrReceiverPhone}
                            onChange={(e) => setAddrReceiverPhone(e.target.value)}
                            placeholder={auth?.phone || '9876543210'}
                            className="w-full px-3 py-2 rounded-xl bg-sq-surface border border-black/15 font-mono font-bold text-sq-ink"
                          />
                        </div>
                      </div>

                      {addrFormError && (
                        <p id="addr-form-error" className="text-xs font-bold text-red-600">
                          {addrFormError}
                        </p>
                      )}

                      <button
                        type="submit"
                        id="save-new-address-btn"
                        className="btn-tactile w-full py-3.5 rounded-2xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                      >
                        + Save Address & Deliver Here →
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 5: ORDER HISTORY */}
              {customerTab === 'history' && (
                <div
                  id="cust-order-history-panel"
                  role="tabpanel"
                  aria-labelledby="cust-tab-history"
                  className="bg-sq-surface rounded-3xl p-6 shadow-card border border-black/10 space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-sq-ink flex items-center gap-2">
                        <History className="w-5 h-5 text-sq-accent" />
                        <span>Customer Order History</span>
                      </h3>
                      <p className="text-xs text-sq-muted mt-0.5">
                        Track your past completed kirana orders, payment mode, scheduled delivery slot, and address.
                      </p>
                    </div>

                    <div
                      className="flex flex-wrap items-center gap-1.5 bg-sq-surfaceAlt p-1.5 rounded-2xl border border-black/10"
                      role="group"
                      aria-label="Filter orders by status"
                    >
                      {(
                        [
                          { key: 'all', label: 'All Orders' },
                          { key: 'completed', label: 'Completed (Delivered)' },
                          { key: 'Packed', label: 'Packed' },
                          { key: 'Pending', label: 'Pending' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          id={`order-filter-${f.key.toLowerCase()}`}
                          onClick={() => setOrderHistoryFilter(f.key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer whitespace-nowrap shrink-0 ${
                            orderHistoryFilter === f.key
                              ? 'bg-sq-accent text-white'
                              : 'text-sq-muted hover:text-sq-ink'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div id="cust-order-history-list" className="space-y-3">
                    {customerOrders.length === 0 ? (
                      <div className="bg-sq-surfaceAlt rounded-3xl p-8 text-center border border-dashed border-black/20 space-y-3">
                        <p className="font-extrabold text-sq-ink">
                          {orderHistoryFilter === 'completed'
                            ? 'No Completed Orders Yet'
                            : 'No Orders Found in History'}
                        </p>
                        <p className="text-xs text-sq-muted max-w-md mx-auto">
                          {totalCustomerOrdersCount === 0
                            ? 'Place an order from the Store Shelf or using the Hinglish Voice Assistant to see your OrderRecord history here.'
                            : 'No orders match the selected status filter. Switch to "All Orders" or mark a pending order as completed.'}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          {orderHistoryFilter !== 'all' && totalCustomerOrdersCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setOrderHistoryFilter('all')}
                              className="px-4 py-2 rounded-full bg-sq-surface border border-black/15 text-sq-ink font-extrabold text-xs cursor-pointer"
                            >
                              Show All Orders ({totalCustomerOrdersCount})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCustomerTab('shelf')}
                            className="px-5 py-2.5 rounded-full bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                          >
                            Browse Store Shelf →
                          </button>
                        </div>
                      </div>
                    ) : (
                      customerOrders.map((order) => {
                        const isCompleted = order.status === 'Delivered';
                        const isPacked = order.status === 'Packed';
                        return (
                          <article
                            key={order.id}
                            data-testid={`customer-order-card-${order.id}`}
                            className="bg-sq-surfaceAlt rounded-2xl p-4 sm:p-5 border border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="font-mono font-black text-sm text-sq-accent">
                                  {order.id}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                                    isCompleted
                                      ? 'bg-sq-accentSoft text-sq-accent border border-sq-accent/30'
                                      : isPacked
                                      ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 animate-pulse shadow-sm shadow-amber-500/20'
                                      : 'bg-orange-500/15 text-orange-700 border border-orange-500/30'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : isPacked ? (
                                    <PackageCheck className="w-3.5 h-3.5" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5" />
                                  )}
                                  <span>
                                    {isCompleted
                                      ? 'Completed • Delivered'
                                      : `Status • ${order.status}`}
                                  </span>
                                </span>
                                <span className="text-[11px] font-mono text-sq-muted">
                                  Placed at {order.createdAt}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm font-bold text-sq-ink">
                                {order.items}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-sq-muted font-medium">
                                <span>
                                  Customer: <strong className="text-sq-ink">{order.customerName}</strong>
                                </span>
                                {order.paymentMode && (
                                  <span className="px-2 py-0.5 rounded bg-sq-surface border border-black/10 text-sq-ink font-mono text-[10px] font-bold">
                                    💳 {order.paymentMode}
                                  </span>
                                )}
                                {order.scheduledFor && (
                                  <span className="px-2 py-0.5 rounded bg-sq-surface border border-black/10 text-sq-accent font-mono text-[10px] font-bold">
                                    ⏰ {order.scheduledFor}
                                  </span>
                                )}
                                {order.deliveryAddress && (
                                  <span className="px-2 py-0.5 rounded bg-sq-surface border border-black/10 text-sq-ink text-[10px] font-bold">
                                    📍 {order.deliveryAddress}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap sm:flex-col items-center sm:items-end justify-between gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-black/10 shrink-0">
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] font-mono uppercase text-sq-muted block">
                                  Order Total
                                </span>
                                <span className="font-mono font-black text-base sm:text-lg text-sq-ink tabular-nums">
                                  ₹{order.total}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  data-testid={`track-live-order-btn-${order.id}`}
                                  onClick={() => handleOpenOrderTracking(order.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-sq-surface border border-black/15 hover:border-sq-accent text-sq-ink font-extrabold text-xs cursor-pointer whitespace-nowrap shrink-0 transition flex items-center gap-1.5"
                                  title="Track delivery rider live on Google Map"
                                >
                                  <Bike className="w-3.5 h-3.5 text-sq-accent" />
                                  <span>Track Live on Map</span>
                                </button>

                                {!isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOrderStatus(order.id, 'Delivered')
                                    }
                                    className="px-3.5 py-1.5 rounded-xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs cursor-pointer whitespace-nowrap shrink-0 transition"
                                  >
                                    ✓ Confirm Order Received
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: REAL-TIME ORDER TRACKING MAP COMPONENT */}
              {customerTab === 'tracking' && (
                <div
                  id="cust-order-tracking-panel"
                  role="tabpanel"
                  aria-labelledby="cust-tab-tracking"
                  className="space-y-4"
                >
                  {trackingOrder ? (
                    <LiveOrderTrackingMap
                      order={trackingOrder}
                      store={
                        registeredStores.find((s) => s.storeName === trackingOrder.storeName) ||
                        activeStore ||
                        registeredStores[0] ||
                        null
                      }
                      customerAddressText={trackingOrder.deliveryAddress || activeDeliveryAddressText}
                      customerName={trackingOrder.customerName || auth?.name || custName}
                      onConfirmDelivered={(orderId) => {
                        handleUpdateOrderStatus(orderId, 'Delivered');
                        notifyToast(`Order ${orderId} marked as Delivered! Thank you.`, 'success');
                      }}
                      onClose={() => setCustomerTab('history')}
                    />
                  ) : (
                    <div className="bg-sq-surface rounded-3xl p-8 text-center border border-dashed border-black/20 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sq-accentSoft text-sq-accent flex items-center justify-center mx-auto text-xl font-bold">
                        🛵
                      </div>
                      <p className="font-extrabold text-sq-ink">No Active Orders to Track</p>
                      <p className="text-xs text-sq-muted max-w-md mx-auto">
                        You have not placed an order yet. Select items from the Store Shelf or use Voice to place an order and track your delivery partner moving live on the map.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCustomerTab('shelf')}
                        className="px-5 py-2.5 rounded-full bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                      >
                        Browse Store Shelf →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Floating Cart Bar */}
            {cart.length > 0 && auth?.role === 'customer' && (
              <div
                id="floating-cart-bar"
                className="fixed bottom-5 inset-x-0 z-40 px-4 max-w-2xl mx-auto"
              >
                <div className="bg-[#121316] text-white rounded-3xl p-4 shadow-2xl border border-white/15 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl bg-sq-accent text-white flex items-center justify-center font-extrabold text-sm font-mono"
                      id="float-bar-count"
                    >
                      {cart.length}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold font-mono" id="float-bar-total">
                        ₹{cartSummary.totalPayable} • {activePaymentModeObj.shortLabel}
                      </p>
                      <p
                        className="text-[11px] text-[#FF7733] font-semibold"
                        id="float-bar-savings"
                      >
                        {activeScheduleSummary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomerTab('payment')}
                      className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs cursor-pointer"
                    >
                      Payment Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutDrawerOpen(true)}
                      className="btn-tactile px-5 py-3 rounded-2xl bg-sq-accent text-white font-extrabold text-xs sm:text-sm cursor-pointer"
                    >
                      View Bag & Checkout →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 7: PROTECTED SHOPKEEPER ERP CONSOLE (`#/shopkeeper`)           */}
        {/* =================================================================== */}
        {activeRoute === 'shopkeeper' && (
          <div id="view-shopkeeper">
            <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
              <div className="bg-sq-surface rounded-[36px] shadow-card border border-black/10 overflow-hidden flex flex-col lg:flex-row min-h-[720px]">
                <aside className="w-full lg:w-64 bg-sq-sidebar text-white p-6 flex flex-col justify-between shrink-0">
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <svg className="h-8 w-32 text-white">
                        <use href="#suchiqo-wordmark" />
                      </svg>
                      <span className="text-[#FF7733] font-mono text-[10px] font-bold">ERP</span>
                    </div>
                    <nav className="space-y-1.5 text-xs font-bold" aria-label="Shopkeeper Sidebar">
                      <button
                        type="button"
                        onClick={() => setErpTab('overview')}
                        data-erptab="overview"
                        className={`erp-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-left ${
                          erpTab === 'overview'
                            ? 'bg-sq-accent text-white'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Overview Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => setErpTab('inventory')}
                        data-erptab="inventory"
                        className={`erp-nav-btn w-full flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer text-left ${
                          erpTab === 'inventory'
                            ? 'bg-sq-accent text-white'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span>Store Inventory</span>
                        <span
                          id="erp-badge-skus"
                          className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 font-mono"
                        >
                          {shelf.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setErpTab('cashbook')}
                        data-erptab="cashbook"
                        className={`erp-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-left ${
                          erpTab === 'cashbook'
                            ? 'bg-sq-accent text-white'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Hisab-Kitab Cashbook
                      </button>
                      <button
                        type="button"
                        onClick={() => setErpTab('khata')}
                        data-erptab="khata"
                        className={`erp-nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer text-left ${
                          erpTab === 'khata'
                            ? 'bg-sq-accent text-white'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Udhaar Khata Book
                      </button>
                    </nav>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/10 space-y-2">
                    <div className="bg-white/5 rounded-2xl p-3">
                      <p
                        id="erp-sidebar-store-name"
                        className="text-xs font-extrabold text-white truncate"
                      >
                        {auth?.storeName || 'Registered Store'}
                      </p>
                      <p
                        id="erp-sidebar-owner-name"
                        className="text-[11px] text-[#FF7733] font-semibold mt-0.5"
                      >
                        Merchant Active • {auth?.name}
                      </p>
                    </div>
                  </div>
                </aside>

                <div className="flex-1 p-6 sm:p-8 bg-sq-surfaceAlt space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10">
                    <div>
                      <h1 className="text-2xl font-extrabold text-sq-ink">
                        Shopkeeper ERP Console
                      </h1>
                      <p className="text-xs text-sq-muted">
                        Manage products, live orders, and your GPS store listing
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErpTab('inventory')}
                      className="px-5 py-2.5 rounded-full bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                    >
                      + Add Product to Shelf
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-sq-surface border border-black/5 rounded-2xl p-4">
                      <span className="text-[11px] text-sq-muted font-bold uppercase">
                        Today's Orders
                      </span>
                      <p id="erp-kpi-orders" className="text-2xl font-black text-sq-ink font-mono mt-1">
                        {erpKpis.orderCount}
                      </p>
                    </div>
                    <div className="bg-sq-surface border border-black/5 rounded-2xl p-4">
                      <span className="text-[11px] text-sq-muted font-bold uppercase">
                        Sales Revenue
                      </span>
                      <p
                        id="erp-kpi-revenue"
                        className="text-2xl font-black text-sq-accent font-mono mt-1"
                      >
                        ₹{erpKpis.salesRevenue}
                      </p>
                    </div>
                    <div className="bg-sq-surface border border-black/5 rounded-2xl p-4">
                      <span className="text-[11px] text-sq-muted font-bold uppercase">
                        Published SKUs
                      </span>
                      <p id="erp-kpi-skus" className="text-2xl font-black text-sq-ink font-mono mt-1">
                        {erpKpis.publishedSkus}
                      </p>
                    </div>
                    <div className="bg-sq-surface border border-black/5 rounded-2xl p-4">
                      <span className="text-[11px] text-sq-muted font-bold uppercase">
                        Net Cashbook
                      </span>
                      <p
                        id="erp-kpi-netcash"
                        className="text-2xl font-black text-sq-accent font-mono mt-1"
                      >
                        ₹{erpKpis.netCashbook}
                      </p>
                    </div>
                  </div>

                  {/* Tab 1: Overview */}
                  {erpTab === 'overview' && (
                    <div id="erp-tab-overview" className="erp-panel grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-7 bg-sq-surface rounded-2xl p-5 border border-black/5">
                        <h3 className="text-sm font-extrabold text-sq-ink mb-3">
                          Incoming Customer Orders
                        </h3>
                        <div id="erp-overview-orders-list" className="space-y-2 text-xs">
                          {orders.length === 0 ? (
                            <p className="text-sq-muted py-4 text-center">0 orders received yet.</p>
                          ) : (
                            orders.map((o) => (
                              <div
                                key={o.id}
                                className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-sq-surfaceAlt"
                              >
                                <div>
                                  <span className="font-mono font-extrabold text-sq-accent">
                                    {o.id}
                                  </span>{' '}
                                  <span className="font-bold text-sq-ink">({o.customerName})</span>
                                  <p className="text-sq-muted mt-0.5">{o.items}</p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className="font-mono font-bold text-sm tabular-nums">
                                    ₹{o.total}
                                  </span>
                                  <span className="text-[11px] font-bold text-sq-accent">
                                    {o.status}
                                  </span>
                                  {o.status !== 'Delivered' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderStatus(
                                          o.id,
                                          o.status === 'Pending' ? 'Packed' : 'Delivered'
                                        )
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-sq-accent text-white font-extrabold text-[11px] cursor-pointer whitespace-nowrap shrink-0"
                                    >
                                      {o.status === 'Pending' ? 'Mark Packed' : 'Mark Delivered'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="lg:col-span-5 bg-sq-surface rounded-2xl p-5 border border-black/5">
                        <h3 className="text-sm font-extrabold text-sq-ink mb-2">Shelf Readiness</h3>
                        <div id="erp-overview-lowstock-box" className="text-xs text-sq-muted space-y-2">
                          {shelf.length === 0 ? (
                            <p className="py-2">
                              Store shelf has <strong>0 published SKUs</strong>. Click{' '}
                              <strong>Store Inventory</strong> to add real products.
                            </p>
                          ) : (
                            <p className="text-sq-accent font-bold py-2">
                              ✓ {shelf.length} SKUs active on store shelf.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Store Inventory */}
                  {erpTab === 'inventory' && (
                    <div id="erp-tab-inventory" className="erp-panel space-y-5">
                      <form
                        onSubmit={handleAddCustomProduct}
                        className="bg-sq-surface rounded-2xl p-5 border border-black/10 space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-extrabold text-sq-ink">
                            Publish Real Product to Store Shelf
                          </h3>
                          <button
                            type="button"
                            id="erp-seed-recipe-shelf-btn"
                            onClick={() => void handleSeedCompleteRecipeShelf()}
                            className="px-3.5 py-2 rounded-xl bg-sq-accentSoft hover:bg-sq-accent hover:text-white border border-sq-accent/30 text-sq-accent font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>🥙 Stock Pani Puri & Full Recipe Catalog (18 SKUs)</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                          <input
                            id="new-sku-name"
                            type="text"
                            required
                            value={newSkuName}
                            onChange={(e) => setNewSkuName(e.target.value)}
                            placeholder="Product Name"
                            aria-label="Product Name"
                            className="sm:col-span-2 px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-semibold text-sq-ink"
                          />
                          <input
                            id="new-sku-mrp"
                            type="number"
                            min={1}
                            required
                            value={newSkuMrp}
                            onChange={(e) => setNewSkuMrp(e.target.value)}
                            placeholder="MRP (₹)"
                            aria-label="MRP in Rupees"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
                          />
                          <input
                            id="new-sku-price"
                            type="number"
                            min={1}
                            required
                            value={newSkuPrice}
                            onChange={(e) => setNewSkuPrice(e.target.value)}
                            placeholder="Sell Price (₹)"
                            aria-label="Sell Price in Rupees"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
                          />
                          <input
                            id="new-sku-stock"
                            type="number"
                            min={1}
                            required
                            value={newSkuStock}
                            onChange={(e) => setNewSkuStock(e.target.value)}
                            placeholder="Stock Qty"
                            aria-label="Stock Quantity"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
                          />
                          <select
                            id="new-sku-unit"
                            value={newSkuUnit}
                            onChange={(e) => setNewSkuUnit(e.target.value)}
                            aria-label="Unit"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
                          >
                            <option value="pack">pack</option>
                            <option value="kg">kg</option>
                            <option value="litre">litre</option>
                            <option value="item">item</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                        >
                          + Publish SKU to Shelf
                        </button>
                      </form>

                      <div
                        id="erp-inventory-list"
                        className="bg-sq-surface rounded-2xl p-5 border border-black/5 space-y-2 text-xs"
                      >
                        {shelf.length === 0 ? (
                          <p className="text-sq-muted py-4 text-center">0 published products.</p>
                        ) : (
                          shelf.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-sq-surfaceAlt"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg">{s.emoji}</span>
                                <div>
                                  <p className="font-extrabold text-sq-ink">{s.name}</p>
                                  <p className="text-[11px] text-sq-muted font-mono">
                                    MRP ₹{s.mrp} • Sell ₹{s.price}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-sq-ink">
                                  {s.stock} {s.unit}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShelf((prev) => prev.filter((item) => item.id !== s.id))
                                  }
                                  className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                                  aria-label={`Remove ${s.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Hisab-Kitab Cashbook */}
                  {erpTab === 'cashbook' && (
                    <div id="erp-tab-cashbook" className="erp-panel space-y-4">
                      <form
                        onSubmit={handleAddKharchaEntry}
                        className="bg-sq-surface rounded-2xl p-5 border border-black/10 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
                      >
                        <input
                          id="cb-note"
                          type="text"
                          required
                          value={cbNote}
                          onChange={(e) => setCbNote(e.target.value)}
                          placeholder="Expense / Income Note"
                          aria-label="Expense or Income Note"
                          className="sm:col-span-2 px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-semibold text-sq-ink"
                        />
                        <select
                          id="cb-type"
                          value={cbType}
                          onChange={(e) => setCbType(e.target.value as 'expense' | 'income')}
                          aria-label="Entry Type"
                          className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
                        >
                          <option value="expense">Kharcha (Expense)</option>
                          <option value="income">Cash In (Income)</option>
                        </select>
                        <div className="flex gap-2">
                          <input
                            id="cb-amount"
                            type="number"
                            min={1}
                            required
                            value={cbAmount}
                            onChange={(e) => setCbAmount(e.target.value)}
                            placeholder="₹ Amount"
                            aria-label="Amount in Rupees"
                            className="w-full px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold cursor-pointer transition"
                          >
                            Add
                          </button>
                        </div>
                      </form>
                      <div
                        id="erp-cashbook-list"
                        className="bg-sq-surface rounded-2xl p-5 border border-black/5 space-y-2 text-xs"
                      >
                        {cashbook.length === 0 ? (
                          <p className="text-sq-muted py-4 text-center">0 Cashbook entries.</p>
                        ) : (
                          cashbook.map((c) => (
                            <div
                              key={c.id}
                              className="flex justify-between p-2.5 border-b border-black/5"
                            >
                              <span className="font-semibold text-sq-ink">{c.note}</span>
                              <span
                                className={`font-mono font-bold ${
                                  c.type === 'income' ? 'text-sq-accent' : 'text-red-600'
                                }`}
                              >
                                {c.type === 'income' ? '+' : '-'}₹{c.amount}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Udhaar Khata Book */}
                  {erpTab === 'khata' && (
                    <div id="erp-tab-khata" className="erp-panel space-y-4">
                      <form
                        onSubmit={handleAddKhataEntry}
                        className="bg-sq-surface rounded-2xl p-5 border border-black/10 space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-sq-ink">
                            Record Udhaar (Credit Given) or Jama (Payment Received)
                          </h3>
                          <span className="font-mono font-bold text-sq-accent">
                            Net Receivable: ₹{erpKpis.netKhataReceivable}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                          <input
                            id="khata-customer"
                            type="text"
                            required
                            value={khataCustomer}
                            onChange={(e) => setKhataCustomer(e.target.value)}
                            placeholder="Customer Name *"
                            aria-label="Khata Customer Name"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-semibold text-sq-ink"
                          />
                          <input
                            id="khata-phone"
                            type="tel"
                            maxLength={10}
                            value={khataPhone}
                            onChange={(e) => setKhataPhone(e.target.value)}
                            placeholder="Mobile (Optional)"
                            aria-label="Khata Customer Phone"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-semibold text-sq-ink"
                          />
                          <select
                            id="khata-type"
                            value={khataType}
                            onChange={(e) => setKhataType(e.target.value as 'udhaar' | 'jama')}
                            aria-label="Khata Entry Type"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
                          >
                            <option value="udhaar">Udhaar (Credit Given)</option>
                            <option value="jama">Jama (Payment Received)</option>
                          </select>
                          <input
                            id="khata-amount"
                            type="number"
                            min={1}
                            required
                            value={khataAmount}
                            onChange={(e) => setKhataAmount(e.target.value)}
                            placeholder="₹ Amount *"
                            aria-label="Khata Amount"
                            className="px-3 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-sq-accent text-white font-extrabold cursor-pointer"
                          >
                            + Save Khata Entry
                          </button>
                        </div>
                      </form>

                      <div
                        id="erp-khata-container"
                        className="bg-sq-surface rounded-2xl p-5 border border-black/5 space-y-2 text-xs"
                      >
                        {khata.length === 0 ? (
                          <p className="text-sq-muted py-4 text-center">
                            0 Udhaar Khata entries recorded yet.
                          </p>
                        ) : (
                          khata.map((k) => (
                            <div
                              key={k.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-sq-surfaceAlt"
                            >
                              <div>
                                <span className="font-extrabold text-sq-ink">{k.customerName}</span>{' '}
                                <span className="text-sq-muted font-mono">({k.phone})</span>
                                <p className="text-[11px] text-sq-muted mt-0.5">{k.note}</p>
                              </div>
                              <span
                                className={`font-mono font-bold ${
                                  k.type === 'udhaar' ? 'text-amber-600' : 'text-sq-accent'
                                }`}
                              >
                                {k.type === 'udhaar' ? 'Udhaar ₹' : 'Jama -₹'}
                                {k.amount}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* PAGE 7B: ROLE-ADAPTIVE PROFILE, ORDER HISTORY & VOICE LEDGER        */}
        {/* =================================================================== */}
        {activeRoute === 'profile' && auth && (
          <ProfileCommandCenter
            auth={auth}
            orders={orders}
            shelf={shelf}
            cart={cart}
            khata={khata}
            cashbook={cashbook}
            registeredStores={registeredStores}
            activeStore={activeStore}
            savedAddresses={savedAddresses}
            selectedAddressId={selectedAddressId}
            voiceConversationLog={voiceConversationLog}
            gnaniLanguage={gnaniLanguage}
            setGnaniLanguage={setGnaniLanguage}
            themeMode={themeMode}
            onToggleTheme={toggleLightDarkMode}
            userPreferences={userPreferences}
            onUpdatePreferences={(next) => {
              setUserPreferences((prev) => ({ ...prev, ...next }));
              notifyToast('Updated account preferences!', 'success');
            }}
            onSettleUdhaarViaUpi={() => {
              const customerUdhaar = khata
                .filter(
                  (k) =>
                    k.customerName.trim().toLowerCase() ===
                    auth.name.trim().toLowerCase()
                )
                .reduce(
                  (s, k) => (k.type === 'udhaar' ? s + k.amount : s - k.amount),
                  0
                );
              if (customerUdhaar <= 0) return;
              const nowStr = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              setKhata((prev) => [
                {
                  id: `kh_settle_${Date.now()}`,
                  customerName: auth.name,
                  phone: auth.phone,
                  type: 'jama',
                  amount: customerUdhaar,
                  note: 'Settled Udhaar Khata Dues via UPI Instant Pay',
                  createdAt: nowStr,
                },
                ...prev,
              ]);
              notifyToast(
                `Settled ₹${customerUdhaar} Udhaar Khata dues via UPI!`,
                'success'
              );
            }}
            onReorderOrder={(order) => {
              const { nextCart, addedCount, unavailableNames } =
                reorderItemsIntoCart(cart, order, shelf);
              if (addedCount > 0) {
                setCart(nextCart);
                setCheckoutDrawerOpen(true);
                notifyToast(
                  `Reordered ${addedCount} item(s) from ${order.id} into your Kirana Bag!`,
                  'success'
                );
              } else {
                notifyToast(
                  unavailableNames.length > 0
                    ? `Items from ${order.id} (${unavailableNames.join(', ')}) are currently out of stock.`
                    : `Could not reorder ${order.id} — check store shelf stock.`,
                  'error'
                );
              }
            }}
            onReportIssueByVoice={(order) => {
              setModalVoiceInput(
                `Mere order ${order.id} (${order.items}) ka status kya hai?`
              );
              setVoiceModalOpen(true);
              playChime();
            }}
            onReplayVoiceText={(text) => {
              speakLocalTts(text);
            }}
            onMutateCart={mutateCustomerCart}
            onRunVoiceCommandAgain={(phrase) => {
              void executeVoiceIntent(phrase, 'modal');
            }}
            onSelectAddress={handleSelectSavedAddress}
            onDeleteAddress={handleDeleteSavedAddress}
            onAddAddressFromProfile={({ tag, flatOrHouse, areaOrStreet, lat, lng }) => {
              const newAddr: CustomerDeliveryAddress = {
                id: `addr_${Date.now()}`,
                tag,
                flatOrHouse,
                areaOrStreet,
                landmark: 'Pinned via Profile GPS Book',
                receiverName: auth.name,
                receiverPhone: auth.phone,
                isDefault: savedAddresses.length === 0,
                lat,
                lng,
              };
              setSavedAddresses((prev) => [newAddr, ...prev]);
              setSelectedAddressId(newAddr.id);
              setAuth({
                ...auth,
                address: formatDeliveryAddressSummary(newAddr),
              });
              notifyToast(
                `Saved ${tag} address (${flatOrHouse}, ${areaOrStreet})!`,
                'success'
              );
            }}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateShopkeeperStoreKyc={(updated) => {
              setAuth({
                ...auth,
                name: updated.ownerName,
                storeName: updated.storeName,
                phone: updated.phone,
                address: updated.address,
              });
              setRegisteredStores((prev) => {
                if (prev.length === 0) {
                  const created: RegisteredStore = {
                    id: `store_${Date.now()}`,
                    storeName: updated.storeName,
                    ownerName: updated.ownerName,
                    address: updated.address,
                    phone: updated.phone,
                    lat: 21.1458,
                    lng: 79.0882,
                    gstin: updated.gstin,
                    upiVpa: updated.upiVpa,
                    isOpenForVoice: updated.isOpenForVoice,
                  };
                  setSelectedStoreId(created.id);
                  return [created];
                }
                return prev.map((st, idx) =>
                  st.id === selectedStoreId || idx === 0
                    ? {
                        ...st,
                        storeName: updated.storeName,
                        ownerName: updated.ownerName,
                        address: updated.address,
                        phone: updated.phone,
                        gstin: updated.gstin,
                        upiVpa: updated.upiVpa,
                        isOpenForVoice: updated.isOpenForVoice,
                      }
                    : st
                );
              });
              setMapIframeSrc(
                `https://maps.google.com/maps?q=${encodeURIComponent(
                  updated.address
                )}&t=&z=15&ie=UTF8&iwloc=&output=embed`
              );
              setMapActiveStoreLabel(updated.storeName);
              setMapActiveStoreDist(updated.address);
              notifyToast(
                `Updated Store KYC & synced live Google Map pin for "${updated.storeName}"!`,
                'success'
              );
            }}
            onNavigateToCustomerShelf={() => requestRoute('customer')}
            onNavigateToShopkeeperErp={() => requestRoute('shopkeeper')}
            onLogout={logoutSession}
            notifyToast={notifyToast}
          />
        )}

        {/* =================================================================== */}
        {/* PAGE 7C: CREATOR-ONLY LOCAL BACKEND DATABASE VAULT (`#/creator-vault`) */}
        {/* =================================================================== */}
        {activeRoute === 'creator-vault' && (
          <CreatorBackendVault
            registeredCustomers={registeredCustomers}
            registeredStores={registeredStores}
            shelf={shelf}
            orders={orders}
            customerVoiceProfiles={customerVoiceProfiles}
            onSyncFromBackend={(snap) => {
              if (Array.isArray(snap.registeredCustomers)) {
                setRegisteredCustomers(snap.registeredCustomers);
              }
              if (Array.isArray(snap.registeredStores)) {
                setRegisteredStores(snap.registeredStores);
                if (snap.registeredStores.length > 0) {
                  setSelectedStoreId((prev) => prev || snap.registeredStores![0].id);
                }
              }
              if (Array.isArray(snap.shelf) && snap.shelf.length > 0) {
                setShelf(snap.shelf);
              }
              if (Array.isArray(snap.orders)) {
                setOrders(snap.orders);
              }
              if (snap.customerVoiceProfiles) {
                setCustomerVoiceProfiles((prev) => ({
                  ...prev,
                  ...snap.customerVoiceProfiles,
                }));
              }
            }}
            onAddCustomer={(c) =>
              setRegisteredCustomers((prev) => [c, ...prev.filter((x) => x.id !== c.id)])
            }
            onRemoveCustomer={(id) =>
              setRegisteredCustomers((prev) => prev.filter((x) => x.id !== id))
            }
            onAddStore={(st) => {
              setRegisteredStores((prev) => [st, ...prev.filter((x) => x.id !== st.id)]);
              setSelectedStoreId((prev) => prev || st.id);
            }}
            onRemoveStore={(id) =>
              setRegisteredStores((prev) => prev.filter((x) => x.id !== id))
            }
            onSeedRecipeShelf={handleSeedCompleteRecipeShelf}
            notifyToast={notifyToast}
          />
        )}

        {/* =================================================================== */}
        {/* PAGE 8: ILLUSTRATED 404 KIRANA AISLE (`#/404`)                      */}
        {/* =================================================================== */}
        {activeRoute === '404' && (
          <div id="view-404">
            <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
              <div className="bg-sq-surface rounded-[40px] p-8 sm:p-12 shadow-card border border-black/10 text-center space-y-6 relative overflow-hidden">
                <div className="max-w-md mx-auto">
                  <Kirana404Illustration />
                </div>

                <div className="space-y-2">
                  <span className="text-sq-accent font-mono text-xs font-extrabold">HTTP 404</span>
                  <h1 className="text-3xl font-extrabold text-sq-ink">
                    Arre! Yeh Rack Khali Hai (Page Not Found)
                  </h1>
                  <p className="text-xs text-sq-muted max-w-md mx-auto">
                    This aisle isn't stocked. Use the navigation links or voice router below.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => requestRoute('home')}
                    className="btn-tactile px-6 py-3.5 rounded-full bg-sq-accent text-white font-extrabold text-xs shadow-tactile cursor-pointer"
                  >
                    ← Return to Home & Live Map
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceModalOpen(true);
                      playChime();
                    }}
                    className="px-5 py-3.5 rounded-full bg-sq-surfaceAlt border border-black/15 text-sq-ink font-extrabold text-xs cursor-pointer"
                  >
                    🎙️ Ask Voice Assistant
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* FLOATING QUICK VOICE AGENT LAUNCHER ORB (ACCESSIBLE ON EVERY PAGE)    */}
      {/* ===================================================================== */}
      {!voiceModalOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
          <button
            type="button"
            id="floating-voice-brain-btn"
            onClick={() => {
              setVoiceModalOpen(true);
              playChime();
              setTimeout(() => modalInputRef.current?.focus(), 80);
            }}
            className="btn-tactile px-4 py-3.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile flex items-center gap-2 cursor-pointer border-2 border-white/20"
            aria-label="Open Gnani AI Voice Brain Studio"
          >
            <Mic className="w-4 h-4" />
            <span>Gnani Voice Brain</span>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-[#FF5500] font-mono text-[10px] font-black">
                {cart.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ALWAYS-CONNECTED AI VOICE ASSISTANT & SEMANTIC MAPPING BRAIN MODAL    */}
      {/* ===================================================================== */}
      {voiceModalOpen && (
        <div
          id="voice-assistant-modal"
          className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-sq-surface rounded-[36px] max-w-xl w-full p-5 sm:p-7 shadow-2xl border-2 border-sq-accent/30 space-y-4 relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                stopVoiceCapture();
                setVoiceModalOpen(false);
              }}
              aria-label="Close Voice Assistant Modal"
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-sq-surfaceAlt flex items-center justify-center text-sq-ink font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
              <div className="flex items-center gap-3">
                <svg className="w-10 h-10 rounded-xl shrink-0">
                  <use href="#suchiqo-app-icon" />
                </svg>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold text-sq-ink">
                      SuchiQO Human Voice Concierge
                    </h2>
                    <span className="text-sq-accent font-mono text-[10px] font-extrabold">
                      24kHz NATURAL VOICE
                    </span>
                  </div>
                  <p id="gnani-provider-badge" className="text-[11px] font-mono text-sq-muted">
                    {gnaniProviderUsed} • {gnaniLatencyMs}ms • Bag: {cartSummary.itemCount} items (₹
                    {cartSummary.totalPayable})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="modal-continuous-toggle"
                  onClick={() => setContinuousVoiceMode((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-extrabold border transition cursor-pointer ${
                    continuousVoiceMode
                      ? 'bg-sq-accent text-white border-sq-accent'
                      : 'bg-sq-surfaceAlt text-sq-ink border-black/15'
                  }`}
                >
                  Hands-Free: {continuousVoiceMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Gnani AI Language, Voice Persona & Acoustic Mode Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label
                  htmlFor="gnani-language-select"
                  className="block text-[10px] font-mono uppercase text-sq-muted font-bold mb-1"
                >
                  Indic Language
                </label>
                <select
                  id="gnani-language-select"
                  value={gnaniLanguage}
                  onChange={(e) => setGnaniLanguage(e.target.value as GnaniLanguageCode)}
                  className="w-full px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 font-extrabold text-sq-ink cursor-pointer"
                >
                  {GNANI_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="gnani-persona-select"
                  className="block text-[10px] font-mono uppercase text-sq-muted font-bold mb-1"
                >
                  Human Voice Persona
                </label>
                <select
                  id="gnani-persona-select"
                  value={gnaniPersonaId}
                  onChange={(e) => setGnaniPersonaId(e.target.value as GnaniVoicePersonaId)}
                  className="w-full px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 font-extrabold text-sq-ink cursor-pointer"
                >
                  {GNANI_VOICE_PERSONAS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="gnani-acoustic-select"
                  className="block text-[10px] font-mono uppercase text-sq-muted font-bold mb-1"
                >
                  Acoustic Mode
                </label>
                <select
                  id="gnani-acoustic-select"
                  value={gnaniAcousticMode}
                  onChange={(e) => setGnaniAcousticMode(e.target.value as GnaniAcousticMode)}
                  className="w-full px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 font-extrabold text-sq-ink cursor-pointer"
                >
                  {GNANI_ACOUSTIC_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.samplingRate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-sq-surfaceAlt rounded-3xl p-4 border border-black/10 text-center space-y-2">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => startHybridVoiceCapture('modal')}
                  className={`w-16 h-16 rounded-full bg-gradient-to-b from-[#FF7733] to-[#FF5500] text-white shadow-tactile flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer ${
                    voiceActive ? 'ring-4 ring-sq-accent/40 scale-105' : ''
                  }`}
                  aria-label="Activate Voice Mic"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <div className="text-left flex-1 max-w-sm">
                  <WaveformCanvas
                    id="modal-wave-canvas"
                    width={320}
                    height={38}
                    voiceActive={voiceActive}
                    className="w-full h-9"
                  />
                  <p id="modal-voice-status" className="text-xs font-extrabold text-sq-accent mt-1">
                    {liveInterimTranscript
                      ? `🎙️ Hearing: "${liveInterimTranscript}"`
                      : modalVoiceStatus}
                  </p>
                </div>
              </div>
            </div>

            {/* Continuous Thinking & Reasoning Engine Banner */}
            {voiceThinkingStage !== 'idle' && (
              <div
                id="modal-thinking-indicator"
                className="p-3 rounded-2xl bg-sq-accentSoft border border-sq-accent/30 text-xs flex items-center justify-between gap-2 animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-sq-accent animate-ping" />
                  <span className="font-extrabold text-sq-ink">
                    {voiceThinkingStage === 'analyzing' && '🧠 Analyzing request & understanding intents...'}
                    {voiceThinkingStage === 'inventory_scan' && '📦 Scanning live shopkeeper stock & matching recipes...'}
                    {voiceThinkingStage === 'memory_lookup' && '💭 Recalling past conversations & dietary preferences...'}
                    {voiceThinkingStage === 'synthesizing' && '🎙️ Synthesizing human Hinglish voice response...'}
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase text-sq-accent font-extrabold px-2 py-0.5 rounded bg-sq-accent/15">
                  Continuous Thinking
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={modalInputRef}
                id="modal-voice-input"
                type="text"
                value={modalVoiceInput}
                onChange={(e) => setModalVoiceInput(e.target.value)}
                placeholder="Speak or type naturally (e.g. 'Aaj khane mein kya banao?', 'Atta aur Maggi add karo')..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void executeVoiceIntent(modalVoiceInput, 'modal');
                  }
                }}
                className="flex-1 px-4 py-3 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
              />
              <button
                type="button"
                id="modal-voice-send-btn"
                onClick={() => void executeVoiceIntent(modalVoiceInput, 'modal')}
                className="px-5 py-3 rounded-2xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs transition cursor-pointer whitespace-nowrap shrink-0"
              >
                Speak / Ask →
              </button>
            </div>

            {/* Quick Conversational Prompt Chips & Memory Badge */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-[10px] uppercase text-sq-muted font-bold">
                  Try asking naturally:
                </span>
                {activeCustomerVoiceProfile && activeCustomerVoiceProfile.turns && activeCustomerVoiceProfile.turns.length > 0 && (
                  <span
                    id="modal-memory-badge"
                    className="text-[10px] font-mono text-emerald-600 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
                  >
                    🧠 Memory: {activeCustomerVoiceProfile.turns.length} past turn(s) remembered
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🍲 Aaj khane mein kya banao?',
                  '🥙 Pani puri bana sakte hain kya?',
                  '⚡ Pani puri ka saara saman bag mein daal do',
                  '🥘 Dinner mein kya banaye?',
                  '🧠 Tumhe mera pichla conversation yaad hai?',
                  '📦 2 Tata Salt aur 1 Maggi add karo',
                ].map((promptChip) => (
                  <button
                    key={promptChip}
                    type="button"
                    onClick={() => {
                      setModalVoiceInput(promptChip);
                      void executeVoiceIntent(promptChip, 'modal');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-sq-surfaceAlt hover:bg-sq-accent hover:text-white border border-black/10 text-[11px] font-bold text-sq-ink transition cursor-pointer"
                  >
                    {promptChip}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-sq-accentSoft text-sq-ink rounded-2xl p-4 border border-sq-accent/30 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase font-extrabold text-sq-accent">
                  {gnaniTelemetry.personaName} • HUMAN VOICE RESPONSE
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="modal-replay-voice-btn"
                    onClick={() =>
                      speakLocalTts(
                        modalAiResponseText,
                        gnaniLanguage,
                        gnaniTelemetry.ttsPitch,
                        gnaniTelemetry.ttsRate
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-sq-surface text-sq-ink border border-black/10 font-bold text-[11px] hover:bg-sq-accent hover:text-white transition cursor-pointer"
                  >
                    🔊 Replay Voice
                  </button>
                </div>
              </div>
              <p id="modal-ai-response-text" className="font-bold leading-relaxed text-sm">
                {modalAiResponseText}
              </p>
              {voiceFollowUpPrompt && (
                <p id="modal-followup-prompt" className="text-[11px] text-sq-accent font-semibold">
                  💡 {voiceFollowUpPrompt}
                </p>
              )}
            </div>

            {/* Recommended Recipes inside Voice Modal */}
            {recommendedRecipes.length > 0 && (
              <div id="modal-recipe-cards" className="space-y-2">
                <span className="block text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                  🥙 Recommended Dishes from Live Store Stock ({recommendedRecipes.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendedRecipes.slice(0, 2).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl bg-sq-surfaceAlt border border-sq-accent/30 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-sq-ink">
                          {rec.emoji} {rec.title}
                        </span>
                        <span className="font-mono text-[10px] text-sq-accent font-bold">
                          ₹{rec.estimatedBundleCost}
                        </span>
                      </div>
                      <p className="text-[11px] text-sq-muted line-clamp-2">
                        Stocked: {rec.availableIngredients.map((i) => i.name).join(', ')}
                      </p>
                      <button
                        type="button"
                        onClick={() => addRecipeBundleToCart(rec)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-sq-accent text-white font-extrabold text-[11px] cursor-pointer"
                      >
                        + Add {rec.availableIngredients.length} Recipe Items to Bag
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Semantic Mapping Brain Breakdown inside Modal */}
            {voiceBrainSteps.length > 0 && (
              <div id="modal-brain-steps" className="space-y-2">
                <span className="block text-[10px] font-mono uppercase text-sq-muted font-extrabold">
                  Understood Actions ({voiceBrainSteps.length} • Memory:{' '}
                  {voiceMemory.pastTurns?.length || 0} past turns):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {voiceBrainSteps.map((step) => (
                    <div
                      key={step.id}
                      className="p-2.5 rounded-xl bg-sq-surfaceAlt border border-black/10 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-sq-accent text-white font-mono text-[10px] font-extrabold uppercase">
                          {step.intent.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono text-[10px] text-sq-muted">
                          {Math.round(step.confidence * 100)}%
                        </span>
                      </div>
                      <p className="font-extrabold text-sq-ink">{step.entityLabel}</p>
                      <p className="text-[11px] text-sq-muted">{step.resolution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-Over Checkout Drawer with Pre-Checkout Payment Mode, Order Schedule & Multi-Address Switcher */}
      {checkoutDrawerOpen && (
        <div
          id="checkout-drawer-backdrop"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
        >
          <div className="bg-sq-surface w-full max-w-md h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl border-l border-black/10">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-black/10">
                <div>
                  <h2 className="text-lg font-extrabold text-sq-ink">Your Kirana Bag</h2>
                  <p className="text-[11px] text-sq-muted">
                    Review items, delivery address, schedule & payment mode
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutDrawerOpen(false)}
                  aria-label="Close Kirana Bag"
                  className="w-8 h-8 rounded-full bg-sq-surfaceAlt flex items-center justify-center text-sq-ink font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div
                id="drawer-cart-items"
                className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1"
              >
                {cart.length === 0 ? (
                  <p className="text-xs text-sq-muted text-center py-6">Your bag is empty.</p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-sq-surfaceAlt text-xs font-bold"
                    >
                      <span>
                        {item.emoji} {item.name} × {item.qty}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">₹{item.price * item.qty}</span>
                        <button
                          type="button"
                          onClick={() => mutateCustomerCart(item.id, -1)}
                          className="px-2 py-0.5 rounded bg-black/10 hover:bg-black/20 cursor-pointer"
                          aria-label={`Remove one ${item.name}`}
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => mutateCustomerCart(item.id, 1)}
                          className="px-2 py-0.5 rounded bg-black/10 hover:bg-black/20 cursor-pointer"
                          aria-label={`Add one ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pre-Checkout Address, Schedule & Payment Mode Selectors */}
              <div className="bg-sq-surfaceAlt rounded-2xl p-4 space-y-3 text-xs border border-black/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold block">
                      📍 Delivering To
                    </span>
                    <p className="font-extrabold text-sq-ink truncate">
                      {activeDeliveryAddressText}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutDrawerOpen(false);
                      setCustomerTab('addresses');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sq-accent text-white font-extrabold text-[11px] shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/10">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold block">
                      ⏰ Delivery Slot
                    </span>
                    <p className="font-extrabold text-sq-ink truncate">
                      {activeScheduleSummary}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCheckoutDrawerOpen(false);
                      setCustomerTab('schedule');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sq-accent text-white font-extrabold text-[11px] shrink-0 cursor-pointer"
                  >
                    Schedule
                  </button>
                </div>

                <div className="pt-2 border-t border-black/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold">
                      💳 Payment Mode
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutDrawerOpen(false);
                        setCustomerTab('payment');
                      }}
                      className="text-[11px] font-extrabold text-sq-accent underline cursor-pointer"
                    >
                      Full Payment Options →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAYMENT_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedPaymentMode(m.id)}
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-extrabold border text-left truncate cursor-pointer ${
                          selectedPaymentMode === m.id
                            ? 'bg-sq-accent text-white border-sq-accent'
                            : 'bg-sq-surface text-sq-ink border-black/15'
                        }`}
                      >
                        {m.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between text-base font-black text-sq-ink pt-2 border-t border-black/10">
                  <span>Total Payable</span>
                  <span id="drawer-payable-total" className="font-mono text-sq-accent">
                    ₹{cartSummary.totalPayable}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-black/10 space-y-2">
              <button
                type="button"
                onClick={submitAuthenticatedOrder}
                className="btn-tactile w-full py-4 rounded-full bg-sq-accent text-white font-extrabold text-sm shadow-tactile cursor-pointer"
              >
                Confirm & Send Order ({activePaymentModeObj.shortLabel}) →
              </button>
              <button
                type="button"
                id="drawer-voice-confirm-btn"
                onClick={() => {
                  setCheckoutDrawerOpen(false);
                  void executeVoiceIntent('Confirm order', 'customer');
                }}
                className="w-full py-3 rounded-full bg-sq-accentSoft hover:bg-sq-accent/20 border border-sq-accent/30 font-extrabold text-xs text-sq-accent cursor-pointer flex items-center justify-center gap-2 transition"
              >
                <Mic className="w-4 h-4 text-sq-accent animate-pulse" />
                <span>🎤 Confirm by Voice ("Confirm")</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Footer */}
      <footer className="bg-[#121316] text-neutral-400 py-10 px-4 sm:px-6 lg:px-8 border-t border-white/10 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 rounded-xl">
              <use href="#suchiqo-app-icon" />
            </svg>
            <svg className="h-6 w-24 text-white">
              <use href="#suchiqo-wordmark" />
            </svg>
            <span className="text-xs font-mono text-[#FF5500] border-l border-white/15 pl-3">
              Speak. Order. Done.
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-neutral-300">
            <a
              href="#/home"
              onClick={(e) => {
                e.preventDefault();
                requestRoute('home');
              }}
              className="hover:text-[#FF5500]"
            >
              Home & Map
            </a>
            <a
              href="#/how-it-works"
              onClick={(e) => {
                e.preventDefault();
                requestRoute('how-it-works');
              }}
              className="hover:text-[#FF5500]"
            >
              How It Works
            </a>
            <a
              href="#/for-shopkeepers"
              onClick={(e) => {
                e.preventDefault();
                requestRoute('for-shopkeepers');
              }}
              className="hover:text-[#FF5500]"
            >
              For Shopkeepers
            </a>
            <a
              href="#/contact"
              onClick={(e) => {
                e.preventDefault();
                requestRoute('contact');
              }}
              className="hover:text-[#FF5500]"
            >
              Contact Support
            </a>
          </div>
          <p
            id="secret-creator-touchpoint"
            onClick={handleSecretCreatorTrigger}
            title="SuchiQO Engine • Authorized Creator Tap Point (5x)"
            className="text-xs text-neutral-500 cursor-pointer select-none transition-colors hover:text-neutral-400"
          >
            © 2026 SuchiQO. Google Maps GPS & Saffron/OLED Architecture.
          </p>
        </div>
      </footer>
    </>
  );
}

export default App;
