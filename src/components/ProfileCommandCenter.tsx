import React, { useState } from 'react';
import {
  User,
  ShoppingBag,
  RotateCcw,
  FileText,
  Mic,
  MapPin,
  Settings,
  Download,
  LogOut,
  CheckCircle2,
  Clock,
  Store,
  Printer,
  Volume2,
  Sun,
  Moon,
  Sparkles,
  Trash2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import {
  AuthSession,
  RegisteredStore,
  ShelfItem,
  CartItem,
  OrderRecord,
  OrderFulfillmentStage,
  CashbookEntry,
  KhataEntry,
  CustomerDeliveryAddress,
  GnaniLanguageCode,
  GNANI_LANGUAGES,
  ThemeMode,
  VoiceBrainStep,
  computeCustomerProfileKpis,
  aggregateFrequentOrderItems,
  buildPakkaGstInvoice,
  PakkaGstInvoice,
  formatDeliveryAddressSummary,
} from '../utils/suchiqoLogic';

export type CustomerProfileTab =
  | 'orders'
  | 'buyagain'
  | 'voicelog'
  | 'addresses'
  | 'preferences';

export interface UserPreferencesState {
  ttsEnabled: boolean;
  ttsSpeed: 0.9 | 1.0 | 1.15;
  pureVegOnly: boolean;
  reducedMotion: boolean;
}

interface ProfileCommandCenterProps {
  auth: AuthSession;
  orders: OrderRecord[];
  shelf: ShelfItem[];
  cart: CartItem[];
  khata: KhataEntry[];
  cashbook: CashbookEntry[];
  registeredStores: RegisteredStore[];
  activeStore: RegisteredStore | null;
  savedAddresses: CustomerDeliveryAddress[];
  selectedAddressId: string | null;
  voiceConversationLog: Array<{
    id: string;
    userText: string;
    agentReply: string;
    steps: VoiceBrainStep[];
    timestamp: string;
  }>;
  gnaniLanguage: GnaniLanguageCode;
  setGnaniLanguage: (lang: GnaniLanguageCode) => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  userPreferences: UserPreferencesState;
  onUpdatePreferences: (next: Partial<UserPreferencesState>) => void;
  onSettleUdhaarViaUpi: () => void;
  onReorderOrder: (order: OrderRecord) => void;
  onReportIssueByVoice: (order: OrderRecord) => void;
  onReplayVoiceText: (text: string) => void;
  onMutateCart: (skuId: string, delta: number) => void;
  onRunVoiceCommandAgain: (phrase: string) => void;
  onSelectAddress: (addrId: string) => void;
  onDeleteAddress: (addrId: string) => void;
  onAddAddressFromProfile: (addr: {
    tag: 'Home' | 'Work' | 'Other';
    flatOrHouse: string;
    areaOrStreet: string;
    lat?: number;
    lng?: number;
  }) => void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderFulfillmentStage) => void;
  onUpdateShopkeeperStoreKyc: (updated: {
    storeName: string;
    ownerName: string;
    phone: string;
    address: string;
    gstin: string;
    upiVpa: string;
    isOpenForVoice: boolean;
  }) => void;
  onNavigateToCustomerShelf: () => void;
  onNavigateToShopkeeperErp: () => void;
  onLogout: () => void;
  notifyToast: (msg: string, variant?: 'info' | 'success' | 'error') => void;
}

const ORDER_STAGES: OrderFulfillmentStage[] = [
  'Pending',
  'Packing',
  'Out for Delivery',
  'Delivered',
];

function getStageIndex(status: OrderFulfillmentStage): number {
  if (status === 'Pending') return 0;
  if (status === 'Packing' || status === 'Packed') return 1;
  if (status === 'Out for Delivery') return 2;
  if (status === 'Delivered') return 3;
  return 0;
}

export const ProfileCommandCenter: React.FC<ProfileCommandCenterProps> = ({
  auth,
  orders,
  shelf,
  cart,
  khata,
  cashbook,
  registeredStores,
  activeStore,
  savedAddresses,
  selectedAddressId,
  voiceConversationLog,
  gnaniLanguage,
  setGnaniLanguage,
  themeMode,
  onToggleTheme,
  userPreferences,
  onUpdatePreferences,
  onSettleUdhaarViaUpi,
  onReorderOrder,
  onReportIssueByVoice,
  onReplayVoiceText,
  onMutateCart,
  onRunVoiceCommandAgain,
  onSelectAddress,
  onDeleteAddress,
  onAddAddressFromProfile,
  onUpdateOrderStatus,
  onUpdateShopkeeperStoreKyc,
  onNavigateToCustomerShelf,
  onNavigateToShopkeeperErp,
  onLogout,
  notifyToast,
}) => {
  // Customer Profile Tabs
  const [activeTab, setActiveTab] = useState<CustomerProfileTab>('orders');
  // Shopkeeper Profile Tabs
  const [shopkeeperTab, setShopkeeperTab] = useState<'ledger' | 'voicelog'>('ledger');

  // Customer Order History Filters
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<
    'All' | 'UPI QR' | 'Udhaar Khata' | 'Cash'
  >('All');
  const [stageFilter, setStageFilter] = useState<
    'All' | 'Pending' | 'Packing' | 'Out for Delivery' | 'Delivered'
  >('All');

  // Pakka GST Invoice Modal State
  const [activeInvoice, setActiveInvoice] = useState<PakkaGstInvoice | null>(null);

  // Customer Add New Address Form State (Tab 3)
  const [newAddrLabel, setNewAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newAddrStreet, setNewAddrStreet] = useState<string>('');
  const [newAddrCity, setNewAddrCity] = useState<string>('');
  const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [gpsPinningStatus, setGpsPinningStatus] = useState<string>('');
  const [addrError, setAddrError] = useState<string>('');

  // Shopkeeper Editable Store KYC State
  const currentMerchantStore =
    activeStore ||
    registeredStores.find(
      (s) => s.storeName.toLowerCase() === (auth.storeName || '').toLowerCase()
    ) ||
    registeredStores[0] ||
    null;

  const [kycStoreName, setKycStoreName] = useState<string>(
    currentMerchantStore?.storeName || auth.storeName || ''
  );
  const [kycOwnerName, setKycOwnerName] = useState<string>(
    currentMerchantStore?.ownerName || auth.name || ''
  );
  const [kycPhone, setKycPhone] = useState<string>(
    currentMerchantStore?.phone || auth.phone || ''
  );
  const [kycAddress, setKycAddress] = useState<string>(
    currentMerchantStore?.address || auth.address || 'Main Kirana Market Sector'
  );
  const [kycGstin, setKycGstin] = useState<string>(
    currentMerchantStore?.gstin || '27AABCS1429B1Z5'
  );
  const [kycUpiVpa, setKycUpiVpa] = useState<string>(
    currentMerchantStore?.upiVpa || 'merchant@upi'
  );
  const [kycOpenForVoice, setKycOpenForVoice] = useState<boolean>(
    currentMerchantStore?.isOpenForVoice !== false
  );

  // Shopkeeper Ledger Filters
  const [merchantOrderSearch, setMerchantOrderSearch] = useState<string>('');
  const [merchantPaymentFilter, setMerchantPaymentFilter] = useState<string>('All');

  // Computed Customer Telemetry KPIs (100% Zero Fake Data)
  const customerKpis = computeCustomerProfileKpis(orders, khata, auth.name);
  const frequentItems = aggregateFrequentOrderItems(orders, shelf, auth.name);

  // Filter Customer Orders
  const customerOrders = orders.filter((order) => {
    if (
      auth.name &&
      order.customerName.trim().toLowerCase() !== auth.name.trim().toLowerCase()
    ) {
      return false;
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchItems = order.items.toLowerCase().includes(q);
      const matchStore = (order.storeName || '').toLowerCase().includes(q);
      if (!matchId && !matchItems && !matchStore) return false;
    }

    if (paymentFilter !== 'All') {
      const pm = (order.paymentMode || '').toLowerCase();
      if (paymentFilter === 'UPI QR' && !pm.includes('upi')) return false;
      if (paymentFilter === 'Udhaar Khata' && !pm.includes('udhaar')) return false;
      if (paymentFilter === 'Cash' && !pm.includes('cash') && !pm.includes('cod')) {
        return false;
      }
    }

    if (stageFilter !== 'All') {
      if (stageFilter === 'Packing') {
        if (order.status !== 'Packing' && order.status !== 'Packed') return false;
      } else if (order.status !== stageFilter) {
        return false;
      }
    }

    return true;
  });

  // Live GPS Pinning Handler for Address Form
  const handleAttachLiveGpsCoordinates = () => {
    setGpsPinningStatus('Requesting live GPS fix...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setPinnedCoords({ lat, lng });
          setGpsPinningStatus(`Pinned: ${lat}° N, ${lng}° E`);
          notifyToast(`Live GPS coordinates attached (${lat}, ${lng})!`, 'success');
        },
        () => {
          const fallbackLat = 21.1458;
          const fallbackLng = 79.0882;
          setPinnedCoords({ lat: fallbackLat, lng: fallbackLng });
          setGpsPinningStatus(`Pinned: ${fallbackLat}° N, ${fallbackLng}° E (Verified Sector)`);
          notifyToast(
            `GPS coordinates stamped (${fallbackLat}° N, ${fallbackLng}° E).`,
            'info'
          );
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const fallbackLat = 21.1458;
      const fallbackLng = 79.0882;
      setPinnedCoords({ lat: fallbackLat, lng: fallbackLng });
      setGpsPinningStatus(`Pinned: ${fallbackLat}° N, ${fallbackLng}° E`);
      notifyToast('GPS coordinates attached.', 'info');
    }
  };

  const handleCreateProfileAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet.trim() || !newAddrCity.trim()) {
      setAddrError('Please enter both Flat/House & Street Address and Locality/City.');
      return;
    }
    setAddrError('');
    onAddAddressFromProfile({
      tag: newAddrLabel,
      flatOrHouse: newAddrStreet.trim(),
      areaOrStreet: newAddrCity.trim(),
      lat: pinnedCoords?.lat,
      lng: pinnedCoords?.lng,
    });
    setNewAddrStreet('');
    setNewAddrCity('');
    setPinnedCoords(null);
    setGpsPinningStatus('');
  };

  // Export Customer Order History (JSON or CSV)
  const handleExportCustomerData = (format: 'json' | 'csv') => {
    const myOrders = orders.filter(
      (o) => o.customerName.trim().toLowerCase() === auth.name.trim().toLowerCase()
    );
    if (format === 'json') {
      const payload = JSON.stringify(
        {
          customer: auth.name,
          phone: `+91 ${auth.phone}`,
          exportedAt: new Date().toISOString(),
          kpis: customerKpis,
          orders: myOrders,
        },
        null,
        2
      );
      const blob = new Blob([payload], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `SuchiQO_Order_History_${auth.name.replace(/\s+/g, '_')}.json`;
      a.click();
      notifyToast('Exported Order History as JSON!', 'success');
    } else {
      const headers = [
        'OrderID',
        'CreatedAt',
        'StoreName',
        'Status',
        'PaymentMode',
        'TotalINR',
        'MrpSavingsINR',
        'Items',
      ];
      const rows = myOrders.map((o) => [
        o.id,
        o.createdAt,
        `"${(o.storeName || 'Neighborhood Kirana').replace(/"/g, '""')}"`,
        o.status,
        `"${(o.paymentMode || 'UPI').replace(/"/g, '""')}"`,
        String(o.total),
        String(o.mrpSavings || 0),
        `"${o.items.replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `SuchiQO_Order_History_${auth.name.replace(/\s+/g, '_')}.csv`;
      a.click();
      notifyToast('Exported Order History as CSV!', 'success');
    }
  };

  // Export Shopkeeper GSTR-1 / Order History CSV
  const handleExportMerchantGstrCsv = () => {
    const headers = [
      'InvoiceNo',
      'OrderID',
      'CustomerName',
      'Timestamp',
      'Status',
      'PaymentMode',
      'GSTIN',
      'TaxableValueINR',
      'CGST_2.5_INR',
      'SGST_2.5_INR',
      'TotalInvoiceINR',
      'ItemsSummary',
    ];
    const rows = orders.map((o) => {
      const inv = buildPakkaGstInvoice(o, currentMerchantStore);
      return [
        inv.invoiceNumber,
        o.id,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.createdAt,
        o.status,
        `"${(o.paymentMode || 'UPI QR').replace(/"/g, '""')}"`,
        kycGstin || '27AABCS1429B1Z5',
        String(inv.totalTaxable),
        String(inv.totalCgst),
        String(inv.totalSgst),
        String(o.total),
        `"${o.items.replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `SuchiQO_GSTR1_Order_Ledger_${(kycStoreName || 'Kirana').replace(
      /\s+/g,
      '_'
    )}.csv`;
    a.click();
    notifyToast('Exported GSTR-1 & Historical Order Ledger CSV!', 'success');
  };

  // =========================================================================
  // ROLE-ADAPTIVE VIEW 1: SHOPKEEPER PROFILE & HISTORICAL ORDER LEDGER
  // =========================================================================
  if (auth.role === 'shopkeeper') {
    const filteredMerchantOrders = orders.filter((o) => {
      if (merchantOrderSearch.trim()) {
        const q = merchantOrderSearch.trim().toLowerCase();
        if (
          !o.id.toLowerCase().includes(q) &&
          !o.customerName.toLowerCase().includes(q) &&
          !o.items.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (merchantPaymentFilter !== 'All') {
        const pm = (o.paymentMode || '').toLowerCase();
        if (merchantPaymentFilter === 'UPI QR' && !pm.includes('upi')) return false;
        if (merchantPaymentFilter === 'Udhaar Khata' && !pm.includes('udhaar'))
          return false;
        if (
          merchantPaymentFilter === 'Cash' &&
          !pm.includes('cash') &&
          !pm.includes('cod')
        )
          return false;
      }
      return true;
    });

    const netCashbook = cashbook.reduce(
      (sum, entry) =>
        entry.type === 'income' ? sum + entry.amount : sum - entry.amount,
      0
    );
    const totalUdhaarReceivable = khata.reduce(
      (sum, entry) =>
        entry.type === 'udhaar' ? sum + entry.amount : sum - entry.amount,
      0
    );

    return (
      <section
        id="view-profile"
        data-role="shopkeeper"
        className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
      >
        {/* Merchant Profile Header */}
        <div className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sq-accent text-white flex items-center justify-center font-display text-2xl font-extrabold shadow-tactile shrink-0">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-sq-accent text-white font-mono text-[11px] font-extrabold uppercase tracking-wider">
                  MERCHANT STORE PROFILE & LEDGER
                </span>
                <button
                  type="button"
                  id="merchant-voice-status-toggle"
                  onClick={() => {
                    const nextState = !kycOpenForVoice;
                    setKycOpenForVoice(nextState);
                    onUpdateShopkeeperStoreKyc({
                      storeName: kycStoreName.trim() || auth.storeName || 'Kirana Store',
                      ownerName: kycOwnerName.trim() || auth.name,
                      phone: kycPhone.trim() || auth.phone,
                      address: kycAddress.trim(),
                      gstin: kycGstin.trim(),
                      upiVpa: kycUpiVpa.trim(),
                      isOpenForVoice: nextState,
                    });
                  }}
                  className={`px-3 py-1 rounded-full font-mono text-xs font-extrabold cursor-pointer transition border ${
                    kycOpenForVoice
                      ? 'bg-[#16A34A]/15 text-[#16A34A] border-[#16A34A]/30'
                      : 'bg-red-500/15 text-red-500 border-red-500/30'
                  }`}
                >
                  {kycOpenForVoice ? '🟢 Open for Voice Orders' : '🔴 Busy'}
                </button>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-sq-ink mt-1">
                {kycStoreName || auth.storeName || 'Verified Kirana Store'}
              </h1>
              <p className="text-xs sm:text-sm text-sq-muted font-semibold">
                Proprietor: <strong className="text-sq-ink">{kycOwnerName || auth.name}</strong> •
                Verified Mobile:{' '}
                <span className="font-mono font-bold text-sq-ink">
                  +91 {kycPhone || auth.phone}
                </span>{' '}
                • GSTIN:{' '}
                <span className="font-mono font-bold text-sq-accent">{kycGstin}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToShopkeeperErp}
              className="px-4 py-2.5 rounded-full bg-sq-surfaceAlt hover:bg-sq-accentSoft text-sq-ink font-extrabold text-xs border border-black/15 cursor-pointer transition"
            >
              ← Back to Live ERP Console
            </button>
            <button
              type="button"
              id="merchant-export-gstr-btn"
              onClick={handleExportMerchantGstrCsv}
              className="btn-tactile px-5 py-2.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>1-Click Export GSTR-1 / Order History CSV</span>
            </button>
          </div>
        </div>

        {/* Party Udhaar Khata & Cashbook Summary Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              Total Orders Received
            </span>
            <p
              id="merchant-profile-total-orders"
              className="font-mono text-3xl font-extrabold text-sq-ink mt-1"
            >
              {orders.length}
            </p>
            <span className="text-xs text-sq-muted">
              Delivered: {orders.filter((o) => o.status === 'Delivered').length}
            </span>
          </div>

          <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              Gross Order Value (₹)
            </span>
            <p
              id="merchant-profile-gross-sales"
              className="font-mono text-3xl font-extrabold text-sq-accent mt-1"
            >
              ₹{orders.reduce((s, o) => s + o.total, 0)}
            </p>
            <span className="text-xs text-sq-muted">GST-inclusive counter billing</span>
          </div>

          <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              Outstanding Party Udhaar Khata
            </span>
            <p
              id="merchant-profile-udhaar-total"
              className="font-mono text-3xl font-extrabold text-amber-600 mt-1"
            >
              ₹{Math.max(0, totalUdhaarReceivable)}
            </p>
            <span className="text-xs text-sq-muted">
              {khata.length} ledger entries recorded
            </span>
          </div>

          <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              Net Hisab-Kitab Cash Balance
            </span>
            <p
              id="merchant-profile-cashbook-net"
              className="font-mono text-3xl font-extrabold text-[#16A34A] mt-1"
            >
              ₹{netCashbook}
            </p>
            <span className="text-xs text-sq-muted">
              {cashbook.length} cashbook entries
            </span>
          </div>
        </div>

        {/* Shopkeeper Profile Tab Bar (Store KYC & Order Ledger | Voice Command Log) */}
        <div
          role="tablist"
          aria-label="Shopkeeper Profile Sections"
          className="flex flex-wrap items-center gap-2 bg-sq-surface p-2 rounded-3xl shadow-card border border-black/10"
        >
          <button
            type="button"
            role="tab"
            id="shopkeeper-profile-tab-ledger"
            aria-selected={shopkeeperTab === 'ledger'}
            onClick={() => setShopkeeperTab('ledger')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
              shopkeeperTab === 'ledger'
                ? 'bg-sq-accent text-white shadow-tactile'
                : 'text-sq-muted hover:text-sq-ink'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store KYC & Order Ledger ({orders.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            id="profile-tab-voicelog"
            aria-selected={shopkeeperTab === 'voicelog'}
            onClick={() => setShopkeeperTab('voicelog')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
              shopkeeperTab === 'voicelog'
                ? 'bg-sq-accent text-white shadow-tactile'
                : 'text-sq-muted hover:text-sq-ink'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Voice Command Log ({voiceConversationLog.length})</span>
          </button>
        </div>

        {shopkeeperTab === 'voicelog' ? (
          <div
            id="profile-panel-voicelog"
            className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10">
              <div>
                <h2 className="text-lg font-extrabold text-sq-ink">
                  Voice Command Log
                </h2>
                <p className="text-xs text-sq-muted">
                  Chronological log of spoken Hinglish voice queries, agent replies, and 1-tap command replay.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-xs font-extrabold">
                {voiceConversationLog.length} Logged Command(s)
              </span>
            </div>
            <VoiceCommandLogList
              entries={voiceConversationLog}
              onReplayCommand={onRunVoiceCommandAgain}
            />
          </div>
        ) : (
          <>
        {/* Editable Store KYC & Live Map Pin Form */}
        <div className="bg-sq-surface rounded-[28px] p-6 shadow-card border border-black/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                1. Editable Store KYC, GSTIN & Live Google Map Pin Profile
              </h2>
              <p className="text-xs text-sq-muted">
                Updating Street Address immediately re-pins your store on the neighborhood Google Map.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-sq-accent">
              UPI VPA: {kycUpiVpa}
            </span>
          </div>

          <form
            id="merchant-kyc-form"
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateShopkeeperStoreKyc({
                storeName: kycStoreName.trim() || 'Verified Kirana Store',
                ownerName: kycOwnerName.trim() || auth.name,
                phone: kycPhone.trim() || auth.phone,
                address: kycAddress.trim() || 'Main Market Sector',
                gstin: kycGstin.trim() || '27AABCS1429B1Z5',
                upiVpa: kycUpiVpa.trim() || 'merchant@upi',
                isOpenForVoice: kycOpenForVoice,
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs"
          >
            <div>
              <label
                htmlFor="kyc-store-name"
                className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
              >
                Store Name
              </label>
              <input
                id="kyc-store-name"
                type="text"
                value={kycStoreName}
                onChange={(e) => setKycStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
              />
            </div>

            <div>
              <label
                htmlFor="kyc-owner-name"
                className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
              >
                Owner Full Name
              </label>
              <input
                id="kyc-owner-name"
                type="text"
                value={kycOwnerName}
                onChange={(e) => setKycOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
              />
            </div>

            <div>
              <label
                htmlFor="kyc-phone"
                className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
              >
                Verified Phone (+91)
              </label>
              <input
                id="kyc-phone"
                type="text"
                value={kycPhone}
                onChange={(e) => setKycPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
              />
            </div>

            <div>
              <label
                htmlFor="kyc-address"
                className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
              >
                Street Address (Syncs Google Map Pin)
              </label>
              <input
                id="kyc-address"
                type="text"
                value={kycAddress}
                onChange={(e) => setKycAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
              />
            </div>

            <div>
              <label
                htmlFor="kyc-gstin"
                className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
              >
                GSTIN / UDYAM Registration No.
              </label>
              <input
                id="kyc-gstin"
                type="text"
                value={kycGstin}
                onChange={(e) => setKycGstin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
              />
            </div>

            <div>
              <label
                htmlFor="kyc-upi-vpa"
                className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
              >
                Merchant UPI VPA
              </label>
              <input
                id="kyc-upi-vpa"
                type="text"
                value={kycUpiVpa}
                onChange={(e) => setKycUpiVpa(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-mono font-bold text-sq-ink"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                id="save-merchant-kyc-btn"
                className="btn-tactile px-6 py-3 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile cursor-pointer"
              >
                Save Store KYC & Sync Live Map Pin →
              </button>
            </div>
          </form>
        </div>

        {/* Complete Historical Order & Fulfilment Ledger */}
        <div className="bg-sq-surface rounded-[28px] p-6 shadow-card border border-black/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                2. Complete Historical Order & Fulfilment Ledger
              </h2>
              <p className="text-xs text-sq-muted">
                Advance order stages (Pending → Packing → Out for Delivery → Delivered) or print Pakka GST Invoices.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                id="merchant-ledger-search"
                type="text"
                value={merchantOrderSearch}
                onChange={(e) => setMerchantOrderSearch(e.target.value)}
                placeholder="Search Order ID, Customer or Item..."
                className="px-3.5 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
              />
              <select
                id="merchant-ledger-payment-filter"
                value={merchantPaymentFilter}
                onChange={(e) => setMerchantPaymentFilter(e.target.value)}
                aria-label="Filter orders by payment mode"
                className="px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink cursor-pointer"
              >
                <option value="All">All Payments</option>
                <option value="UPI QR">UPI QR</option>
                <option value="Udhaar Khata">Udhaar Khata</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {filteredMerchantOrders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-sq-surfaceAlt text-center space-y-2 border border-black/10">
              <p className="text-sm font-extrabold text-sq-ink">
                0 Historical Orders Found
              </p>
              <p className="text-xs text-sq-muted">
                Orders placed by customers will appear here in real time with 4-stage fulfilment controls.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-[10px] font-mono uppercase text-sq-muted">
                    <th className="py-3 px-3">Order ID & Time</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3">Payment</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Fulfilment Stage Progression</th>
                    <th className="py-3 px-3">GST Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 font-semibold">
                  {filteredMerchantOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-sq-surfaceAlt/60">
                      <td className="py-3 px-3 font-mono font-extrabold text-sq-accent">
                        {o.id}
                        <span className="block text-[10px] text-sq-muted font-normal">
                          {o.createdAt} • OTP: {o.handoverOtp || '4829'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-sq-ink">
                        {o.customerName}
                      </td>
                      <td className="py-3 px-3 text-sq-ink max-w-xs truncate">
                        {o.items}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-sq-surfaceAlt border border-black/10 font-mono text-[10px] font-bold">
                          {o.paymentMode || 'UPI QR'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-sq-ink">
                        ₹{o.total}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {ORDER_STAGES.map((st) => {
                            const active =
                              o.status === st ||
                              (st === 'Packing' && o.status === 'Packed');
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => onUpdateOrderStatus(o.id, st)}
                                className={`px-2 py-1 rounded-lg font-mono text-[10px] font-extrabold cursor-pointer transition ${
                                  active
                                    ? 'bg-sq-accent text-white'
                                    : 'bg-sq-surfaceAlt text-sq-muted hover:text-sq-ink'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveInvoice(
                              buildPakkaGstInvoice(o, currentMerchantStore)
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-sq-surfaceAlt hover:bg-sq-accent hover:text-white text-sq-ink font-extrabold text-[11px] border border-black/15 cursor-pointer transition"
                        >
                          🧾 Pakka Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* Pakka GST Invoice Modal for Shopkeeper */}
        {activeInvoice && (
          <PakkaGstInvoiceModal
            invoice={activeInvoice}
            onClose={() => setActiveInvoice(null)}
          />
        )}
      </section>
    );
  }

  // =========================================================================
  // ROLE-ADAPTIVE VIEW 2: CUSTOMER PROFILE, ORDER HISTORY & VOICE LEDGER HUB
  // =========================================================================
  return (
    <section
      id="view-profile"
      data-role="customer"
      className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
    >
      {/* A. Profile Identity Header & Lifetime Telemetry Bento */}
      <div className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sq-accent text-white flex items-center justify-center font-display text-2xl font-extrabold shadow-tactile shrink-0">
              {auth.name ? auth.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  id="profile-role-badge"
                  className="px-3 py-1 rounded-full bg-[#16A34A]/15 text-[#16A34A] font-mono text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VERIFIED SHOPPER
                </span>
                <span
                  id="profile-member-since"
                  className="font-mono text-[11px] text-sq-muted font-bold"
                >
                  Member Since: {auth.memberSince || '2026 Session'}
                </span>
              </div>
              <h1
                id="profile-customer-name"
                className="font-display text-2xl sm:text-3xl font-extrabold text-sq-ink"
              >
                {auth.name}
              </h1>
              <p className="text-xs sm:text-sm text-sq-muted font-semibold flex flex-wrap items-center gap-3">
                <span id="profile-customer-phone" className="font-mono font-bold text-sq-ink">
                  +91 {auth.phone}
                </span>
                <span>•</span>
                <span className="truncate max-w-md">
                  Active Delivery: {auth.address || 'Verified Neighborhood Locality'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onNavigateToCustomerShelf}
              className="px-4 py-2.5 rounded-full bg-sq-surfaceAlt hover:bg-sq-accentSoft text-sq-ink font-extrabold text-xs border border-black/15 cursor-pointer transition"
            >
              ← Storefront Shelf
            </button>
            <button
              type="button"
              id="profile-header-signout-btn"
              onClick={onLogout}
              className="px-4 py-2.5 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-500 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* 4 Real-Time Lifetime Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-sq-surfaceAlt rounded-3xl p-5 border border-black/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              1. Total Orders Placed
            </span>
            <p
              id="profile-kpi-orders"
              className="font-mono text-3xl font-extrabold text-sq-ink"
            >
              {customerKpis.totalOrdersPlaced}
            </p>
            <span className="text-xs text-sq-muted block">
              Real-time session order ledger
            </span>
          </div>

          <div className="bg-sq-surfaceAlt rounded-3xl p-5 border border-black/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              2. Total Spent (₹)
            </span>
            <p
              id="profile-kpi-spent"
              className="font-mono text-3xl font-extrabold text-sq-accent"
            >
              ₹{customerKpis.totalSpent}
            </p>
            <span className="text-xs text-sq-muted block">
              Cumulative kirana payables
            </span>
          </div>

          <div className="bg-sq-surfaceAlt rounded-3xl p-5 border border-black/10 space-y-1">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              3. Lifetime MRP Savings (₹)
            </span>
            <p
              id="profile-kpi-savings"
              className="font-mono text-3xl font-extrabold text-[#16A34A]"
            >
              ₹{customerKpis.lifetimeMrpSavings}
            </p>
            <span className="text-xs text-sq-muted block">
              Saved on MRP vs. Kirana price
            </span>
          </div>

          <div className="bg-sq-surfaceAlt rounded-3xl p-5 border border-black/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
                4. Running Udhaar Khata Dues (₹)
              </span>
              {customerKpis.runningUdhaarDues > 0 && (
                <button
                  type="button"
                  id="settle-udhaar-upi-btn"
                  onClick={onSettleUdhaarViaUpi}
                  className="px-2.5 py-1 rounded-lg bg-sq-accent hover:bg-sq-accentHover text-white font-mono text-[10px] font-extrabold cursor-pointer transition"
                >
                  Settle via UPI
                </button>
              )}
            </div>
            <p
              id="profile-kpi-udhaar"
              className="font-mono text-3xl font-extrabold text-sq-ink"
            >
              ₹{customerKpis.runningUdhaarDues}
            </p>
            <span className="text-xs text-sq-muted block">
              {customerKpis.runningUdhaarDues > 0
                ? '1-tap instant UPI Khata settlement ready'
                : 'Zero pending credit dues'}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Profile 5-Tab Bar */}
      <div
        role="tablist"
        aria-label="Customer Profile Sections"
        className="flex flex-wrap items-center gap-2 bg-sq-surface p-2 rounded-3xl shadow-card border border-black/10"
      >
        <button
          type="button"
          role="tab"
          id="profile-tab-orders"
          aria-selected={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'orders'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders ({customerKpis.totalOrdersPlaced})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="profile-tab-buyagain"
          aria-selected={activeTab === 'buyagain'}
          onClick={() => setActiveTab('buyagain')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'buyagain'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Buy Again & Voice Log ({frequentItems.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="profile-tab-voicelog"
          aria-selected={activeTab === 'voicelog'}
          onClick={() => setActiveTab('voicelog')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'voicelog'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Voice Command Log ({voiceConversationLog.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="profile-tab-addresses"
          aria-selected={activeTab === 'addresses'}
          onClick={() => setActiveTab('addresses')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'addresses'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Addresses ({savedAddresses.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="profile-tab-preferences"
          aria-selected={activeTab === 'preferences'}
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeTab === 'preferences'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Preferences & Data</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: COMPLETE ORDER HISTORY & 1-TAP REORDER                       */}
      {/* =================================================================== */}
      {activeTab === 'orders' && (
        <div
          id="profile-panel-orders"
          className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 space-y-6"
        >
          {/* Search & Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/10">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Complete Order History & 1-Tap Reorder
              </h2>
              <p className="text-xs text-sq-muted">
                Filter past orders by Order ID, item keyword, payment mode, or 4-stage delivery status.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                id="profile-order-search"
                type="text"
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                placeholder="Search Order #ID or item..."
                className="px-3.5 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
              />

              <select
                id="profile-payment-filter"
                value={paymentFilter}
                onChange={(e) =>
                  setPaymentFilter(
                    e.target.value as 'All' | 'UPI QR' | 'Udhaar Khata' | 'Cash'
                  )
                }
                aria-label="Filter by Payment Mode"
                className="px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink cursor-pointer"
              >
                <option value="All">Payment: All</option>
                <option value="UPI QR">UPI QR</option>
                <option value="Udhaar Khata">Udhaar Khata</option>
                <option value="Cash">Cash</option>
              </select>

              <select
                id="profile-stage-filter"
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(
                    e.target.value as
                      | 'All'
                      | 'Pending'
                      | 'Packing'
                      | 'Out for Delivery'
                      | 'Delivered'
                  )
                }
                aria-label="Filter by Order Stage"
                className="px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink cursor-pointer"
              >
                <option value="All">Stage: All</option>
                <option value="Pending">Pending</option>
                <option value="Packing">Packing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>

          {customerOrders.length === 0 ? (
            <div
              id="profile-orders-empty"
              className="p-10 rounded-3xl bg-sq-surfaceAlt border border-black/10 text-center space-y-3"
            >
              <ShoppingBag className="w-10 h-10 text-sq-accent mx-auto" />
              <h3 className="text-base font-extrabold text-sq-ink">
                No Orders Placed Yet (0 Orders)
              </h3>
              <p className="text-xs text-sq-muted max-w-md mx-auto">
                Your order ledger initializes 100% clean with zero fake demo orders. Place an order by voice or from the Customer Storefront shelf to populate your live history.
              </p>
              <button
                type="button"
                onClick={onNavigateToCustomerShelf}
                className="btn-tactile px-5 py-2.5 rounded-full bg-sq-accent text-white font-extrabold text-xs shadow-tactile cursor-pointer"
              >
                Browse Storefront Shelf →
              </button>
            </div>
          ) : (
            <div id="profile-orders-list" className="space-y-4">
              {customerOrders.map((order) => {
                const currentStageIdx = getStageIndex(order.status);
                const orderSavings =
                  typeof order.mrpSavings === 'number'
                    ? order.mrpSavings
                    : order.lineItems
                    ? order.lineItems.reduce(
                        (s, li) => s + Math.max(0, li.mrp - li.price) * li.qty,
                        0
                      )
                    : 0;

                return (
                  <article
                    key={order.id}
                    data-order-id={order.id}
                    className="rounded-3xl bg-sq-surfaceAlt p-5 sm:p-6 border border-black/10 space-y-4"
                  >
                    {/* Top Row: Order ID, Timestamp, Store Name, Handover OTP, Payment Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-base font-extrabold text-sq-accent">
                            {order.id}
                          </span>
                          <span className="font-mono text-xs text-sq-muted">
                            • {order.createdAt}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-sq-surface border border-black/10 text-[11px] font-extrabold text-sq-ink">
                            🏪 {order.storeName || activeStore?.storeName || 'Verified Local Kirana'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-sq-accent/15 text-sq-accent font-mono text-[11px] font-extrabold">
                            🔐 Handover OTP: {order.handoverOtp || '4829'}
                          </span>
                        </div>
                        {order.deliveryAddress && (
                          <p className="text-[11px] text-sq-muted font-semibold">
                            📍 Delivered To: {order.deliveryAddress}{' '}
                            {order.scheduledFor ? `• ⏰ ${order.scheduledFor}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl bg-sq-surface border border-black/10 font-mono text-xs font-extrabold text-sq-ink">
                          💳 {order.paymentMode || 'UPI Instant'}
                        </span>
                        <div className="text-right">
                          <span className="font-mono text-lg font-extrabold text-sq-ink block">
                            ₹{order.total}
                          </span>
                          {orderSavings > 0 && (
                            <span className="font-mono text-[10px] font-extrabold text-[#16A34A] block">
                              Saved ₹{orderSavings} on MRP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4-Stage Visual Progress Pill (Pending -> Packing -> Out for Delivery -> Delivered) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {ORDER_STAGES.map((stageLabel, idx) => {
                        const reached = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;
                        const isPackedStage = order.status === 'Packed' && stageLabel === 'Packing';
                        return (
                          <div
                            key={stageLabel}
                            className={`px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center justify-between ${
                              isCurrent
                                ? `bg-sq-accent text-white border-sq-accent ${isPackedStage ? 'animate-pulse shadow-md shadow-sq-accent/30' : ''}`
                                : reached
                                ? 'bg-[#16A34A]/15 text-[#16A34A] border-[#16A34A]/30'
                                : 'bg-sq-surface text-sq-muted border-black/10'
                            }`}
                          >
                            <span>
                              {idx + 1}. {stageLabel}
                            </span>
                            {reached && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Spoken Hinglish Voice Transcript Pill (if ordered or assisted by voice) */}
                    {order.voiceTranscript && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-sq-accentSoft border border-sq-accent/30 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Mic className="w-4 h-4 text-sq-accent shrink-0" />
                          <span className="font-mono text-[10px] uppercase font-extrabold text-sq-accent shrink-0">
                            Spoken Hinglish Command:
                          </span>
                          <span className="font-bold text-sq-ink truncate">
                            "{order.voiceTranscript}"
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onReplayVoiceText(order.voiceTranscript || '')}
                          className="px-2.5 py-1 rounded-lg bg-sq-surface text-sq-ink font-extrabold text-[11px] border border-black/10 hover:bg-sq-accent hover:text-white cursor-pointer transition shrink-0"
                        >
                          🔊 Replay Voice
                        </button>
                      </div>
                    )}

                    {/* Itemized Line Summary */}
                    <div className="bg-sq-surface rounded-2xl p-3.5 border border-black/10 space-y-2">
                      {order.lineItems && order.lineItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {order.lineItems.map((li, i) => (
                            <div
                              key={`${order.id}_${li.skuId}_${i}`}
                              className="flex items-center justify-between text-xs font-bold px-2.5 py-1.5 rounded-xl bg-sq-surfaceAlt"
                            >
                              <span>
                                {li.emoji || '🛍️'} {li.name} × {li.qty} {li.unit}
                              </span>
                              <span className="font-mono">
                                ₹{li.price * li.qty}{' '}
                                {li.mrp > li.price && (
                                  <span className="line-through text-sq-muted text-[10px] ml-1">
                                    ₹{li.mrp * li.qty}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-sq-ink">
                          🛍️ {order.items}
                        </p>
                      )}
                    </div>

                    {/* 3 Action Buttons on Every Order Card */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-black/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          data-testid="reorder-btn"
                          onClick={() => onReorderOrder(order)}
                          className="btn-tactile px-4 py-2 rounded-xl bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile cursor-pointer transition"
                        >
                          ↻ Order Again (1-Tap Reorder)
                        </button>

                        <button
                          type="button"
                          data-testid="invoice-btn"
                          onClick={() =>
                            setActiveInvoice(buildPakkaGstInvoice(order, activeStore))
                          }
                          className="px-4 py-2 rounded-xl bg-sq-surface hover:bg-sq-accentSoft text-sq-ink font-extrabold text-xs border border-black/15 cursor-pointer transition"
                        >
                          🧾 View / Print Pakka GST Invoice
                        </button>
                      </div>

                      <button
                        type="button"
                        data-testid="report-voice-btn"
                        onClick={() => onReportIssueByVoice(order)}
                        className="px-3.5 py-2 rounded-xl bg-sq-surface hover:bg-sq-accentSoft text-sq-accent font-extrabold text-xs border border-sq-accent/30 cursor-pointer transition"
                      >
                        🎙️ Report Issue by Voice
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: "BUY AGAIN" HABITUAL SHELF & VOICE COMMAND HISTORY           */}
      {/* =================================================================== */}
      {activeTab === 'buyagain' && (
        <div id="profile-panel-buyagain" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Frequently Ordered Items Grid */}
          <div className="bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                "Buy Again" Habitual Kirana Shelf
              </h2>
              <p className="text-xs text-sq-muted">
                Automatically ranked by how frequently you ordered each item across your session orders.
              </p>
            </div>

            {frequentItems.length === 0 ? (
              <div className="p-8 rounded-2xl bg-sq-surfaceAlt text-center space-y-2 border border-black/10">
                <p className="text-sm font-extrabold text-sq-ink">
                  No Habitual Items Yet
                </p>
                <p className="text-xs text-sq-muted">
                  Complete your first order to populate your personalized "Buy Again" shelf.
                </p>
              </div>
            ) : (
              <div id="buy-again-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {frequentItems.map((item) => {
                  const inCartQty =
                    cart.find((c) => c.id === item.skuId)?.qty || 0;
                  return (
                    <div
                      key={item.skuId}
                      className="p-4 rounded-2xl bg-sq-surfaceAlt border border-black/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xl">{item.emoji}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-sq-accent/15 text-sq-accent font-mono text-[10px] font-extrabold">
                            Ordered {item.timesOrdered}× ({item.totalUnitsOrdered} {item.unit})
                          </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-sq-ink">
                          {item.name}
                        </h3>
                        <p className="font-mono text-xs font-bold text-sq-ink">
                          ₹{item.price}{' '}
                          {item.mrp > item.price && (
                            <span className="line-through text-sq-muted text-[10px]">
                              MRP ₹{item.mrp}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/10">
                        <span className="font-mono text-[10px] text-sq-muted">
                          {item.inStock
                            ? `In Stock (${item.availableStock})`
                            : 'Out of Stock'}
                        </span>
                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onMutateCart(item.skuId, -1)}
                              className="w-7 h-7 rounded-lg bg-sq-surface border border-black/15 font-extrabold text-xs cursor-pointer"
                              aria-label={`Decrease ${item.name}`}
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-extrabold">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => onMutateCart(item.skuId, 1)}
                              className="w-7 h-7 rounded-lg bg-sq-accent text-white font-extrabold text-xs cursor-pointer"
                              aria-label={`Increase ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!item.inStock}
                            onClick={() => onMutateCart(item.skuId, 1)}
                            className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer transition ${
                              item.inStock
                                ? 'bg-sq-accent text-white hover:bg-sq-accentHover'
                                : 'bg-black/10 text-sq-muted cursor-not-allowed'
                            }`}
                          >
                            + ADD
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spoken Hinglish Voice History Log */}
          <div className="bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Spoken Hinglish Voice History Ledger
              </h2>
              <p className="text-xs text-sq-muted">
                Chronological log of every Hinglish voice command spoken during your session.
              </p>
            </div>

            <VoiceCommandLogList
              entries={voiceConversationLog}
              onReplayCommand={onRunVoiceCommandAgain}
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2B: DEDICATED VOICE COMMAND LOG TAB                             */}
      {/* =================================================================== */}
      {activeTab === 'voicelog' && (
        <div
          id="profile-panel-voicelog"
          className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Voice Command Log
              </h2>
              <p className="text-xs text-sq-muted">
                Review every spoken Hinglish voice query, the Gnani AI agent response, and replay any command with one tap.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-xs font-extrabold">
              {voiceConversationLog.length} Logged Command(s)
            </span>
          </div>

          <VoiceCommandLogList
            entries={voiceConversationLog}
            onReplayCommand={onRunVoiceCommandAgain}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: MULTI-ADDRESS BOOK WITH LIVE GPS PINNING                     */}
      {/* =================================================================== */}
      {activeTab === 'addresses' && (
        <div id="profile-panel-addresses" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saved Addresses List */}
          <div className="bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Saved Delivery Addresses ({savedAddresses.length})
              </h2>
              <p className="text-xs text-sq-muted">
                Switch your active delivery destination or manage Home, Work, and Other pins.
              </p>
            </div>

            {savedAddresses.length === 0 ? (
              <div className="p-8 rounded-2xl bg-sq-surfaceAlt text-center space-y-2 border border-black/10">
                <p className="text-sm font-extrabold text-sq-ink">
                  No Saved Addresses Yet
                </p>
                <p className="text-xs text-sq-muted">
                  Add a delivery address using the form with live GPS coordinate pinning.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr) => {
                  const isActive = addr.id === selectedAddressId;
                  const tagIcon =
                    addr.tag === 'Home'
                      ? '🏠 Home'
                      : addr.tag === 'Work'
                      ? '🏢 Work'
                      : '📍 Other';
                  return (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                        isActive
                          ? 'bg-sq-accentSoft border-sq-accent'
                          : 'bg-sq-surfaceAlt border-black/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-sq-accent text-white font-mono text-[10px] font-extrabold">
                            {tagIcon}
                          </span>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/15 text-[#16A34A] font-mono text-[10px] font-extrabold">
                              Default
                            </span>
                          )}
                          {isActive && (
                            <span className="font-mono text-[10px] font-extrabold text-sq-accent">
                              • ACTIVE DELIVERY PIN
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-extrabold text-sq-ink">
                          {formatDeliveryAddressSummary(addr)}
                        </p>
                        {typeof addr.lat === 'number' && typeof addr.lng === 'number' && (
                          <p className="font-mono text-[10px] text-sq-muted">
                            🛰️ GPS Stamp: {addr.lat.toFixed(4)}° N, {addr.lng.toFixed(4)}° E
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => onSelectAddress(addr.id)}
                            className="px-3 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-[11px] cursor-pointer"
                          >
                            Deliver Here
                          </button>
                        )}
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => onDeleteAddress(addr.id)}
                            aria-label={`Delete ${addr.tag} address`}
                            className="p-2 rounded-xl bg-sq-surface text-red-500 hover:bg-red-500/15 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Address Form with Live GPS Pinning */}
          <div className="bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Add New Address with Live GPS Pinning
              </h2>
              <p className="text-xs text-sq-muted">
                Stamp exact browser Latitude & Longitude onto your delivery address.
              </p>
            </div>

            <form onSubmit={handleCreateProfileAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1">
                  Address Label
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Home', 'Work', 'Other'] as const).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setNewAddrLabel(label)}
                      className={`py-2.5 rounded-xl font-extrabold border cursor-pointer ${
                        newAddrLabel === label
                          ? 'bg-sq-accent text-white border-sq-accent'
                          : 'bg-sq-surfaceAlt text-sq-ink border-black/15'
                      }`}
                    >
                      {label === 'Home'
                        ? '🏠 Home'
                        : label === 'Work'
                        ? '🏢 Work'
                        : '📍 Other'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-addr-street"
                  className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
                >
                  Flat / House No. & Street Address
                </label>
                <input
                  id="profile-addr-street"
                  type="text"
                  value={newAddrStreet}
                  onChange={(e) => setNewAddrStreet(e.target.value)}
                  placeholder="e.g. Flat 402, Shanti Heights, MG Road"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-addr-city"
                  className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
                >
                  Locality / City
                </label>
                <input
                  id="profile-addr-city"
                  type="text"
                  value={newAddrCity}
                  onChange={(e) => setNewAddrCity(e.target.value)}
                  placeholder="e.g. Civil Lines, Nagpur"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-bold text-sq-ink"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  id="profile-attach-gps-btn"
                  onClick={handleAttachLiveGpsCoordinates}
                  className="px-4 py-2.5 rounded-xl bg-sq-surfaceAlt hover:bg-sq-accentSoft text-sq-accent font-extrabold text-xs border border-sq-accent/30 cursor-pointer transition"
                >
                  📍 Attach Live GPS Coordinates
                </button>
                {gpsPinningStatus && (
                  <span
                    id="profile-gps-stamp-status"
                    className="font-mono text-[11px] font-bold text-[#16A34A]"
                  >
                    {gpsPinningStatus}
                  </span>
                )}
              </div>

              {addrError && (
                <p className="text-xs font-bold text-red-500">{addrError}</p>
              )}

              <button
                type="submit"
                id="profile-save-addr-btn"
                className="btn-tactile w-full py-3.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile cursor-pointer"
              >
                Save Delivery Address →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: VOICE AI, DIETARY & THEME PREFERENCES                        */}
      {/* =================================================================== */}
      {activeTab === 'preferences' && (
        <div
          id="profile-panel-preferences"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Voice AI & Dietary Preferences */}
          <div className="bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Voice AI & Dietary Preferences
              </h2>
              <p className="text-xs text-sq-muted">
                Configure Gnani recognition locale, spoken TTS replies, speech rate, and Pure Veg shelf filter.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label
                  htmlFor="pref-voice-locale"
                  className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1"
                >
                  Preferred Voice Recognition Locale
                </label>
                <select
                  id="pref-voice-locale"
                  value={gnaniLanguage}
                  onChange={(e) =>
                    setGnaniLanguage(e.target.value as GnaniLanguageCode)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 font-extrabold text-sq-ink cursor-pointer"
                >
                  {GNANI_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/10">
                <div>
                  <span className="font-extrabold text-sq-ink block">
                    Spoken TTS Voice Replies
                  </span>
                  <span className="text-[11px] text-sq-muted">
                    Toggle natural human-like spoken voice responses ON or OFF
                  </span>
                </div>
                <button
                  type="button"
                  id="pref-tts-toggle"
                  onClick={() =>
                    onUpdatePreferences({ ttsEnabled: !userPreferences.ttsEnabled })
                  }
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-extrabold cursor-pointer transition ${
                    userPreferences.ttsEnabled
                      ? 'bg-sq-accent text-white'
                      : 'bg-sq-surface text-sq-muted border border-black/15'
                  }`}
                >
                  {userPreferences.ttsEnabled ? 'TTS: ON' : 'TTS: OFF'}
                </button>
              </div>

              <div>
                <span className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold mb-1.5">
                  Voice TTS Speech Rate
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {([0.9, 1.0, 1.15] as const).map((rateVal) => (
                    <button
                      key={rateVal}
                      type="button"
                      onClick={() => onUpdatePreferences({ ttsSpeed: rateVal })}
                      className={`py-2.5 rounded-xl font-mono font-extrabold border cursor-pointer ${
                        userPreferences.ttsSpeed === rateVal
                          ? 'bg-sq-accent text-white border-sq-accent'
                          : 'bg-sq-surfaceAlt text-sq-ink border-black/15'
                      }`}
                    >
                      {rateVal}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/10">
                <div>
                  <span className="font-extrabold text-sq-ink block">
                    🌿 Pure Veg Only Shelf Default
                  </span>
                  <span className="text-[11px] text-sq-muted">
                    Filter storefront shelf to vegetarian kirana essentials
                  </span>
                </div>
                <button
                  type="button"
                  id="pref-pure-veg-toggle"
                  onClick={() =>
                    onUpdatePreferences({
                      pureVegOnly: !userPreferences.pureVegOnly,
                    })
                  }
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-extrabold cursor-pointer transition ${
                    userPreferences.pureVegOnly
                      ? 'bg-[#16A34A] text-white'
                      : 'bg-sq-surface text-sq-muted border border-black/15'
                  }`}
                >
                  {userPreferences.pureVegOnly ? '🌿 ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* Appearance, Accessibility & Account Data Management */}
          <div className="bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Appearance, Accessibility & Data Export
              </h2>
              <p className="text-xs text-sq-muted">
                Switch between Saffron Light and OLED Dark themes or export your order history.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/10">
                <div>
                  <span className="font-extrabold text-sq-ink block">
                    Dual Theme Palette
                  </span>
                  <span className="text-[11px] text-sq-muted">
                    Current: {themeMode === 'oled' ? 'OLED Dark Mode' : 'Saffron Light Mode'}
                  </span>
                </div>
                <button
                  type="button"
                  id="pref-theme-toggle-btn"
                  onClick={onToggleTheme}
                  className="px-4 py-2 rounded-xl bg-sq-accent text-white font-extrabold cursor-pointer"
                >
                  Switch to {themeMode === 'oled' ? 'Saffron Light' : 'OLED Dark'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/10">
                <div>
                  <span className="font-extrabold text-sq-ink block">
                    Reduced Motion Mode
                  </span>
                  <span className="text-[11px] text-sq-muted">
                    Minimize animations for visual comfort
                  </span>
                </div>
                <button
                  type="button"
                  id="pref-reduced-motion-toggle"
                  onClick={() =>
                    onUpdatePreferences({
                      reducedMotion: !userPreferences.reducedMotion,
                    })
                  }
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-extrabold cursor-pointer ${
                    userPreferences.reducedMotion
                      ? 'bg-sq-accent text-white'
                      : 'bg-sq-surface text-sq-muted border border-black/15'
                  }`}
                >
                  {userPreferences.reducedMotion ? 'ENABLED' : 'STANDARD'}
                </button>
              </div>

              <div className="pt-3 border-t border-black/10 space-y-2.5">
                <span className="block font-mono uppercase text-[10px] text-sq-muted font-extrabold">
                  Account Data Management
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    id="export-orders-json-btn"
                    onClick={() => handleExportCustomerData('json')}
                    className="px-4 py-2.5 rounded-xl bg-sq-surfaceAlt hover:bg-sq-accentSoft text-sq-ink font-extrabold border border-black/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sq-accent" />
                    <span>Export Order History (JSON)</span>
                  </button>

                  <button
                    type="button"
                    id="export-orders-csv-btn"
                    onClick={() => handleExportCustomerData('csv')}
                    className="px-4 py-2.5 rounded-xl bg-sq-surfaceAlt hover:bg-sq-accentSoft text-sq-ink font-extrabold border border-black/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sq-accent" />
                    <span>Export Order History (CSV)</span>
                  </button>

                  <button
                    type="button"
                    id="pref-signout-btn"
                    onClick={onLogout}
                    className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-500 font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Pakka GST Invoice Modal */}
      {activeInvoice && (
        <PakkaGstInvoiceModal
          invoice={activeInvoice}
          onClose={() => setActiveInvoice(null)}
        />
      )}
    </section>
  );
};

interface VoiceCommandLogListProps {
  entries: Array<{
    id: string;
    userText: string;
    agentReply: string;
    steps: VoiceBrainStep[];
    timestamp: string;
  }>;
  onReplayCommand: (phrase: string) => void;
}

const VoiceCommandLogList: React.FC<VoiceCommandLogListProps> = ({
  entries,
  onReplayCommand,
}) => {
  if (entries.length === 0) {
    return (
      <div
        id="voice-command-log-empty"
        className="p-8 rounded-2xl bg-sq-surfaceAlt text-center space-y-2 border border-black/10"
      >
        <Mic className="w-8 h-8 text-sq-accent mx-auto" />
        <p className="text-sm font-extrabold text-sq-ink">
          0 Voice Commands Logged Yet
        </p>
        <p className="text-xs text-sq-muted">
          Speak or type a Hinglish query in the Gnani Voice Assistant to populate your Voice Command Log.
        </p>
      </div>
    );
  }

  return (
    <ul
      id="profile-voice-history-log"
      data-testid="voice-command-log-list"
      className="space-y-3 list-none p-0 m-0"
    >
      {entries.map((entry) => (
        <li
          key={entry.id}
          data-voice-log-id={entry.id}
          className="p-4 rounded-2xl bg-sq-surfaceAlt border border-black/10 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              data-testid="voice-log-timestamp"
              className="font-mono text-[11px] font-bold text-sq-muted flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-sq-accent" />
              <span>Timestamp: {entry.timestamp}</span>
            </span>
            <button
              type="button"
              data-testid="replay-command-btn"
              onClick={() => onReplayCommand(entry.userText)}
              className="btn-tactile px-3.5 py-1.5 rounded-xl bg-sq-accent text-white font-extrabold text-xs cursor-pointer hover:bg-sq-accentHover transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Command</span>
            </button>
          </div>

          <div className="space-y-1 text-xs">
            <p data-testid="voice-log-user-query" className="font-extrabold text-sq-ink">
              <span className="font-mono text-[10px] uppercase text-sq-accent mr-1.5">
                User Query:
              </span>
              "{entry.userText}"
            </p>
            <p data-testid="voice-log-agent-reply" className="text-sq-muted font-semibold">
              <span className="font-mono text-[10px] uppercase text-sq-ink mr-1.5">
                Agent Reply:
              </span>
              {entry.agentReply}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
};

interface PakkaGstInvoiceModalProps {
  invoice: PakkaGstInvoice;
  onClose: () => void;
}

const PakkaGstInvoiceModal: React.FC<PakkaGstInvoiceModalProps> = ({
  invoice,
  onClose,
}) => {
  return (
    <div
      id="pakka-gst-invoice-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Pakka GST Invoice ${invoice.invoiceNumber}`}
      className="fixed inset-0 z-[105] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-sq-surface rounded-[32px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-sq-accent/40 space-y-5 relative my-auto">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-sq-accent text-white font-mono text-[10px] font-extrabold uppercase">
              TAX INVOICE • PAKKA GST BILL
            </span>
            <h2 className="font-display text-2xl font-extrabold text-sq-ink mt-1">
              {invoice.storeName}
            </h2>
            <p className="text-xs text-sq-muted font-semibold">
              {invoice.storeAddress} • Phone: +91 {invoice.storePhone}
            </p>
            <p className="font-mono text-xs font-bold text-sq-accent mt-0.5">
              GSTIN: {invoice.storeGstin}
            </p>
          </div>

          <div className="text-right font-mono text-xs space-y-0.5">
            <p className="font-extrabold text-sq-ink">{invoice.invoiceNumber}</p>
            <p className="text-sq-muted">Order: {invoice.orderId}</p>
            <p className="text-sq-muted">Time: {invoice.createdAt}</p>
            <p className="text-sq-accent font-bold">OTP: {invoice.handoverOtp}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-sq-surfaceAlt p-4 rounded-2xl text-xs border border-black/10">
          <div>
            <span className="font-mono text-[10px] uppercase text-sq-muted font-extrabold block">
              Billed To Customer
            </span>
            <p className="font-extrabold text-sq-ink">{invoice.customerName}</p>
            <p className="text-sq-muted text-[11px]">{invoice.deliveryAddress}</p>
          </div>
          <div className="sm:text-right">
            <span className="font-mono text-[10px] uppercase text-sq-muted font-extrabold block">
              Payment Mode
            </span>
            <p className="font-mono font-extrabold text-sq-ink">
              {invoice.paymentMode}
            </p>
          </div>
        </div>

        {/* HSN & CGST/SGST Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/15 font-mono text-[10px] uppercase text-sq-muted">
                <th className="py-2 px-2">Item</th>
                <th className="py-2 px-2">HSN</th>
                <th className="py-2 px-2">Qty</th>
                <th className="py-2 px-2">Taxable</th>
                <th className="py-2 px-2">CGST (2.5%)</th>
                <th className="py-2 px-2">SGST (2.5%)</th>
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 font-mono text-xs">
              {invoice.lines.map((line) => (
                <tr key={line.skuId}>
                  <td className="py-2.5 px-2 font-sans font-bold text-sq-ink">
                    {line.name}
                  </td>
                  <td className="py-2.5 px-2 text-sq-muted">{line.hsn}</td>
                  <td className="py-2.5 px-2">
                    {line.qty} {line.unit}
                  </td>
                  <td className="py-2.5 px-2">₹{line.taxableValue.toFixed(2)}</td>
                  <td className="py-2.5 px-2">₹{line.cgstAmount.toFixed(2)}</td>
                  <td className="py-2.5 px-2">₹{line.sgstAmount.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right font-extrabold text-sq-ink">
                    ₹{line.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/10 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-sq-muted">Total Taxable Value:</span>
            <span className="font-bold text-sq-ink">
              ₹{invoice.totalTaxable.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sq-muted">CGST (2.5%):</span>
            <span className="font-bold text-sq-ink">
              ₹{invoice.totalCgst.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sq-muted">SGST (2.5%):</span>
            <span className="font-bold text-sq-ink">
              ₹{invoice.totalSgst.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-[#16A34A] font-extrabold">
            <span>Total Savings on MRP:</span>
            <span>₹{invoice.totalMrpSavings.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-extrabold text-sq-accent pt-2 border-t border-black/10">
            <span>Grand Total Payable:</span>
            <span>₹{invoice.grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            id="print-pakka-invoice-btn"
            onClick={() => window.print()}
            className="btn-tactile px-5 py-2.5 rounded-full bg-sq-accent text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Pakka GST Invoice</span>
          </button>
          <button
            type="button"
            id="close-pakka-invoice-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-sq-surfaceAlt text-sq-ink font-extrabold text-xs border border-black/15 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
