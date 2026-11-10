import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Users,
  Store,
  Package,
  Database,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  Mic,
  Sparkles,
  FileJson,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  CREATOR_EMAIL,
  CREATOR_ACCESS_CODE,
  LocalDatabaseSnapshot,
  RegisteredCustomer,
  RegisteredStore,
  ShelfItem,
  OrderRecord,
  CustomerConversationProfile,
} from '../utils/suchiqoLogic';

interface CreatorBackendVaultProps {
  registeredCustomers: RegisteredCustomer[];
  registeredStores: RegisteredStore[];
  shelf: ShelfItem[];
  orders: OrderRecord[];
  customerVoiceProfiles: Record<string, CustomerConversationProfile>;
  onSyncFromBackend: (snapshot: Partial<LocalDatabaseSnapshot>) => void;
  onAddCustomer: (customer: RegisteredCustomer) => void;
  onRemoveCustomer: (customerId: string) => void;
  onAddStore: (store: RegisteredStore) => void;
  onRemoveStore: (storeId: string) => void;
  onSeedRecipeShelf: () => Promise<void>;
  notifyToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const CreatorBackendVault: React.FC<CreatorBackendVaultProps> = ({
  registeredCustomers,
  registeredStores,
  shelf,
  orders,
  customerVoiceProfiles,
  onSyncFromBackend,
  onAddCustomer,
  onRemoveCustomer,
  onAddStore,
  onRemoveStore,
  onSeedRecipeShelf,
  notifyToast,
}) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('suchiqo_creator_session_active') === 'true';
    } catch {
      return false;
    }
  });
  const [creatorEmailInput, setCreatorEmailInput] = useState<string>('');
  const [creatorCodeInput, setCreatorCodeInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [activeVaultTab, setActiveVaultTab] = useState<
    'customers' | 'shops' | 'memory' | 'rawfile'
  >('customers');

  const [dbSnapshot, setDbSnapshot] = useState<LocalDatabaseSnapshot | null>(null);
  const [dbFilePath, setDbFilePath] = useState<string>('data/suchiqo-db.json');
  const [dbFileSize, setDbFileSize] = useState<number>(0);
  const [loadingVault, setLoadingVault] = useState<boolean>(false);

  const onSyncRef = useRef(onSyncFromBackend);
  onSyncRef.current = onSyncFromBackend;

  // Add Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustFlat, setNewCustFlat] = useState('');
  const [newCustArea, setNewCustArea] = useState('');
  const [newCustLandmark, setNewCustLandmark] = useState('');
  const [newCustCity, setNewCustCity] = useState('Nagpur');
  const [newCustPincode, setNewCustPincode] = useState('440001');
  const [newCustTag, setNewCustTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Add Store Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreOwner, setNewStoreOwner] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreGstin, setNewStoreGstin] = useState('27AABCS1429B1Z5');
  const [newStoreLat, setNewStoreLat] = useState('21.1458');
  const [newStoreLng, setNewStoreLng] = useState('79.0882');

  const fetchProtectedVault = useCallback(async () => {
    const activeEmail =
      sessionStorage.getItem('suchiqo_creator_auth_email') || creatorEmailInput.trim();
    const activeCode =
      sessionStorage.getItem('suchiqo_creator_auth_code') || creatorCodeInput.trim();
    setLoadingVault(true);
    try {
      const res = await fetch('/api/creator/vault', {
        headers: {
          'x-creator-email': activeEmail,
          'x-creator-code': activeCode,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          database: LocalDatabaseSnapshot;
          filePath: string;
          fileSizeBytes: number;
        };
        setDbSnapshot(data.database);
        setDbFilePath(data.filePath || 'data/suchiqo-db.json');
        setDbFileSize(data.fileSizeBytes || 0);
        onSyncRef.current(data.database);
      }
    } catch {
      // Fallback to local state if offline
    } finally {
      setLoadingVault(false);
    }
  }, [creatorEmailInput, creatorCodeInput]);

  useEffect(() => {
    if (unlocked) {
      void fetchProtectedVault();
    }
  }, [unlocked, fetchProtectedVault]);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const cleanEmail = creatorEmailInput.trim().toLowerCase();
    const cleanCode = creatorCodeInput.trim();

    if (!cleanEmail || !cleanCode) {
      setAuthError('Both Creator Email and Secret Password must be typed to supervise the database.');
      return;
    }

    if (cleanEmail !== CREATOR_EMAIL.toLowerCase()) {
      setAuthError(
        'Access Denied: Only the authorized creator is permitted to access the database supervisor console.'
      );
      notifyToast('Unauthorized email — Creator access restricted.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/creator/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          accessCode: cleanCode,
        }),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        setAuthError(errData.error || 'Invalid password or creator authorization.');
        return;
      }
    } catch {
      // Offline fallback verification
      if (cleanCode !== CREATOR_ACCESS_CODE) {
        setAuthError('Invalid password or creator authorization.');
        return;
      }
    }

    sessionStorage.setItem('suchiqo_creator_session_active', 'true');
    sessionStorage.setItem('suchiqo_creator_auth_email', cleanEmail);
    sessionStorage.setItem('suchiqo_creator_auth_code', cleanCode);
    setUnlocked(true);
    notifyToast('Creator Backend Vault unlocked! Welcome Creator.', 'success');
  };

  const handleLockVault = () => {
    setUnlocked(false);
    setCreatorCodeInput('');
    try {
      sessionStorage.removeItem('suchiqo_creator_session_active');
      sessionStorage.removeItem('suchiqo_creator_auth_email');
      sessionStorage.removeItem('suchiqo_creator_auth_code');
    } catch {
      // Ignore
    }
    notifyToast('Creator Vault securely locked.', 'info');
  };

  const handleCreatorAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustName.trim();
    const cleanPhone = newCustPhone.replace(/\D/g, '').slice(-10);
    const cleanFlat = newCustFlat.trim();
    const cleanArea = newCustArea.trim();

    if (!cleanName || cleanPhone.length !== 10 || !cleanFlat) {
      notifyToast('Please enter Customer Name, 10-digit Mobile, and Flat/Street Address.', 'error');
      return;
    }

    const formattedAddress = [
      cleanFlat,
      cleanArea,
      newCustLandmark.trim() ? `Near ${newCustLandmark.trim()}` : '',
      newCustCity.trim(),
      newCustPincode.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const res = await fetch('/api/creator/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-creator-email': CREATOR_EMAIL,
          'x-creator-code': CREATOR_ACCESS_CODE,
        },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          email: newCustEmail.trim(),
          flatOrHouse: cleanFlat,
          areaOrStreet: cleanArea || newCustCity.trim(),
          landmark: newCustLandmark.trim(),
          city: newCustCity.trim(),
          pincode: newCustPincode.trim(),
          addressTag: newCustTag,
          formattedAddress,
          dietaryPreference: 'all',
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          customer: RegisteredCustomer;
          database: LocalDatabaseSnapshot;
        };
        onAddCustomer(data.customer);
        setDbSnapshot(data.database);
      } else {
        const fallbackCust: RegisteredCustomer = {
          id: `cust_${Date.now()}`,
          name: cleanName,
          phone: cleanPhone,
          email: newCustEmail.trim(),
          flatOrHouse: cleanFlat,
          areaOrStreet: cleanArea || newCustCity.trim(),
          landmark: newCustLandmark.trim(),
          city: newCustCity.trim(),
          pincode: newCustPincode.trim(),
          addressTag: newCustTag,
          formattedAddress,
          dietaryPreference: 'all',
          createdAt: new Date().toLocaleDateString('en-IN'),
          lastLoginAt: new Date().toLocaleDateString('en-IN'),
        };
        onAddCustomer(fallbackCust);
      }
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustFlat('');
      setNewCustArea('');
      setNewCustLandmark('');
      notifyToast(`Added customer "${cleanName}" to backend database!`, 'success');
    } catch {
      notifyToast('Failed to add customer.', 'error');
    }
  };

  const handleCreatorDeleteCustomer = async (customer: RegisteredCustomer) => {
    try {
      const res = await fetch(`/api/creator/customers/${encodeURIComponent(customer.id)}`, {
        method: 'DELETE',
        headers: {
          'x-creator-email': CREATOR_EMAIL,
          'x-creator-code': CREATOR_ACCESS_CODE,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { database: LocalDatabaseSnapshot };
        setDbSnapshot(data.database);
      }
    } catch {
      // Continue with local state update
    }
    onRemoveCustomer(customer.id);
    notifyToast(`Removed customer "${customer.name}" from backend database.`, 'info');
  };

  const handleCreatorAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStore = newStoreName.trim();
    const cleanOwner = newStoreOwner.trim();
    const cleanPhone = newStorePhone.replace(/\D/g, '').slice(-10);
    const cleanAddress = newStoreAddress.trim();

    if (!cleanStore || !cleanOwner || cleanPhone.length !== 10 || !cleanAddress) {
      notifyToast('Please enter Store Name, Owner Name, 10-digit Mobile, and Address.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/creator/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-creator-email': CREATOR_EMAIL,
          'x-creator-code': CREATOR_ACCESS_CODE,
        },
        body: JSON.stringify({
          storeName: cleanStore,
          ownerName: cleanOwner,
          phone: cleanPhone,
          address: cleanAddress,
          gstin: newStoreGstin.trim() || '27AABCS1429B1Z5',
          lat: parseFloat(newStoreLat) || 21.1458,
          lng: parseFloat(newStoreLng) || 79.0882,
          isOpenForVoice: true,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          store: RegisteredStore;
          database: LocalDatabaseSnapshot;
        };
        onAddStore(data.store);
        setDbSnapshot(data.database);
      } else {
        const fallbackStore: RegisteredStore = {
          id: `store_${Date.now()}`,
          storeName: cleanStore,
          ownerName: cleanOwner,
          phone: cleanPhone,
          address: cleanAddress,
          gstin: newStoreGstin.trim() || '27AABCS1429B1Z5',
          lat: parseFloat(newStoreLat) || 21.1458,
          lng: parseFloat(newStoreLng) || 79.0882,
          isOpenForVoice: true,
          createdAt: new Date().toLocaleDateString('en-IN'),
        };
        onAddStore(fallbackStore);
      }
      setNewStoreName('');
      setNewStoreOwner('');
      setNewStorePhone('');
      setNewStoreAddress('');
      notifyToast(`Registered shop "${cleanStore}" in backend database!`, 'success');
    } catch {
      notifyToast('Failed to add shop.', 'error');
    }
  };

  const handleCreatorDeleteStore = async (store: RegisteredStore) => {
    try {
      const res = await fetch(`/api/creator/stores/${encodeURIComponent(store.id)}`, {
        method: 'DELETE',
        headers: {
          'x-creator-email': CREATOR_EMAIL,
          'x-creator-code': CREATOR_ACCESS_CODE,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { database: LocalDatabaseSnapshot };
        setDbSnapshot(data.database);
      }
    } catch {
      // Continue with local removal
    }
    onRemoveStore(store.id);
    notifyToast(`Removed shop "${store.storeName}" from backend database.`, 'info');
  };

  const handleDownloadProtectedDbFile = () => {
    const payload: LocalDatabaseSnapshot = dbSnapshot || {
      version: '2.0.0-suchiqo-local-vault',
      creatorEmail: CREATOR_EMAIL,
      updatedAt: new Date().toISOString(),
      registeredCustomers,
      registeredStores,
      shelf,
      orders,
      khata: [],
      cashbook: [],
      customerVoiceProfiles,
      auditLogs: [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suchiqo-db.json';
    a.click();
    URL.revokeObjectURL(url);
    notifyToast('Downloaded protected backend database file (suchiqo-db.json)!', 'success');
  };

  const voiceProfilesList = Object.values(
    dbSnapshot?.customerVoiceProfiles || customerVoiceProfiles || {}
  );

  if (!unlocked) {
    return (
      <section
        id="creator-vault-gate"
        className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto"
      >
        <div className="bg-sq-surface rounded-[36px] shadow-card border-2 border-sq-accent/30 overflow-hidden">
          <div className="bg-[#121316] text-white p-8 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sq-accent/20 text-[#FF7733] font-mono text-[11px] font-extrabold">
                <Lock className="w-3.5 h-3.5" />
                CREATOR-ONLY BACKEND DATABASE VAULT
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                Protected Creator Database File (`suchiqo-db.json`)
              </h1>
              <p className="text-xs text-neutral-400">
                Strictly restricted to the authorized system creator. Enter your credentials to supervise database records.
              </p>
            </div>
            <ShieldCheck className="w-12 h-12 text-[#FF5500] shrink-0" />
          </div>

          <form onSubmit={handleUnlockVault} className="p-8 space-y-5">
            <div>
              <label
                htmlFor="creator-vault-email"
                className="block text-xs font-extrabold text-sq-ink mb-1.5"
              >
                Creator Email Identity *
              </label>
              <input
                id="creator-vault-email"
                type="email"
                required
                autoComplete="off"
                value={creatorEmailInput}
                onChange={(e) => setCreatorEmailInput(e.target.value)}
                placeholder="Enter authorized creator email"
                className="w-full px-4 py-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink"
              />
            </div>

            <div>
              <label
                htmlFor="creator-vault-code"
                className="block text-xs font-extrabold text-sq-ink mb-1.5"
              >
                Creator Vault Secret Password *
              </label>
              <input
                id="creator-vault-code"
                type="password"
                required
                autoComplete="current-password"
                value={creatorCodeInput}
                onChange={(e) => setCreatorCodeInput(e.target.value)}
                placeholder="Type secret password to unlock"
                className="w-full px-4 py-3.5 rounded-2xl bg-sq-surfaceAlt border border-black/15 text-sm font-mono font-bold text-sq-ink tracking-widest"
              />
            </div>

            {authError && (
              <p
                id="creator-vault-error"
                className="text-xs font-extrabold text-red-600 bg-red-500/10 p-3 rounded-xl border border-red-500/20"
              >
                {authError}
              </p>
            )}

            <button
              type="submit"
              id="creator-vault-unlock-btn"
              className="btn-tactile w-full py-4 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-sm shadow-tactile flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Creator Backend Database Console →</span>
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section
      id="view-creator-vault"
      className="py-6 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6"
    >
      {/* Header Banner */}
      <div className="bg-[#121316] text-white rounded-[32px] p-6 sm:p-8 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A]/20 text-[#4ADE80] font-mono text-[11px] font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              CREATOR VERIFIED: {CREATOR_EMAIL}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-neutral-300 font-mono text-[11px] font-bold">
              <Database className="w-3.5 h-3.5 text-[#FF7733]" />
              LOCAL DB FILE: {dbFilePath} ({Math.max(1, Math.round(dbFileSize / 1024))} KB)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Creator Backend Database & Network Control Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-3xl">
            Manage all registered customers, onboard or remove neighborhood kirana shops, inspect persistent per-customer Gnani AI conversation memories, and download the protected backend database file.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="creator-seed-panipuri-btn"
            onClick={() => void onSeedRecipeShelf().then(() => fetchProtectedVault())}
            className="btn-tactile px-4 py-2.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Populate Pani Puri & Recipe Shelf (18 SKUs)</span>
          </button>

          <button
            type="button"
            id="creator-download-db-btn"
            onClick={handleDownloadProtectedDbFile}
            className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download `suchiqo-db.json`</span>
          </button>

          <button
            type="button"
            id="creator-refresh-db-btn"
            onClick={() => void fetchProtectedVault()}
            className="px-3.5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingVault ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            id="creator-lock-vault-btn"
            onClick={handleLockVault}
            className="px-4 py-2.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Vault</span>
          </button>
        </div>
      </div>

      {/* 4 Live Backend Database Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              1. Customers Registered
            </span>
            <Users className="w-4 h-4 text-sq-accent" />
          </div>
          <p
            id="creator-kpi-customers"
            className="font-mono text-3xl font-extrabold text-sq-ink mt-1.5"
          >
            {registeredCustomers.length}
          </p>
          <p className="text-xs text-sq-muted mt-1">
            Verified customer accounts with delivery addresses
          </p>
        </div>

        <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              2. Shops Registered
            </span>
            <Store className="w-4 h-4 text-sq-accent" />
          </div>
          <p
            id="creator-kpi-shops"
            className="font-mono text-3xl font-extrabold text-sq-accent mt-1.5"
          >
            {registeredStores.length}
          </p>
          <p className="text-xs text-sq-muted mt-1">
            Live GPS kirana partners on map radar
          </p>
        </div>

        <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              3. Published Shelf SKUs
            </span>
            <Package className="w-4 h-4 text-[#16A34A]" />
          </div>
          <p
            id="creator-kpi-skus"
            className="font-mono text-3xl font-extrabold text-[#16A34A] mt-1.5"
          >
            {shelf.length}
          </p>
          <p className="text-xs text-sq-muted mt-1">
            Recipe-ready items & stock across stores
          </p>
        </div>

        <div className="bg-sq-surface rounded-3xl p-5 shadow-card border border-black/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-sq-muted font-extrabold">
              4. Orders & Voice Memories
            </span>
            <Mic className="w-4 h-4 text-sq-accent" />
          </div>
          <p
            id="creator-kpi-memories"
            className="font-mono text-xl sm:text-2xl font-extrabold text-sq-ink mt-1.5 whitespace-nowrap"
          >
            {orders.length} Orders • {voiceProfilesList.length} Memories
          </p>
          <p className="text-xs text-sq-muted mt-1">
            GMV ₹{orders.reduce((s, o) => s + o.total, 0)} persisted on disk
          </p>
        </div>
      </div>

      {/* Vault Section Tabs */}
      <div
        role="tablist"
        aria-label="Creator Backend Database Tabs"
        className="flex flex-wrap items-center gap-2 bg-sq-surface p-2 rounded-3xl shadow-card border border-black/10"
      >
        <button
          type="button"
          role="tab"
          id="vault-tab-customers"
          aria-selected={activeVaultTab === 'customers'}
          onClick={() => setActiveVaultTab('customers')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeVaultTab === 'customers'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Customers ({registeredCustomers.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="vault-tab-shops"
          aria-selected={activeVaultTab === 'shops'}
          onClick={() => setActiveVaultTab('shops')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeVaultTab === 'shops'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Registered Shops ({registeredStores.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="vault-tab-memory"
          aria-selected={activeVaultTab === 'memory'}
          onClick={() => setActiveVaultTab('memory')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeVaultTab === 'memory'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Customer Voice Memory Brain ({voiceProfilesList.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          id="vault-tab-rawfile"
          aria-selected={activeVaultTab === 'rawfile'}
          onClick={() => setActiveVaultTab('rawfile')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition ${
            activeVaultTab === 'rawfile'
              ? 'bg-sq-accent text-white shadow-tactile'
              : 'text-sq-muted hover:text-sq-ink'
          }`}
        >
          <FileJson className="w-4 h-4" />
          <span>Protected DB File (`suchiqo-db.json`)</span>
        </button>
      </div>

      {/* TAB 1: REGISTERED CUSTOMERS MANAGEMENT */}
      {activeVaultTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-sq-accent" />
              <h2 className="text-lg font-extrabold text-sq-ink">
                Add Customer to Backend Database
              </h2>
            </div>
            <p className="text-xs text-sq-muted">
              Directly register a customer with their verified delivery address into `suchiqo-db.json`.
            </p>

            <form
              id="creator-add-customer-form"
              onSubmit={handleCreatorAddCustomer}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="vault-cust-name"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Customer Full Name *
                  </label>
                  <input
                    id="vault-cust-name"
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Priya Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vault-cust-phone"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    10-Digit Mobile *
                  </label>
                  <input
                    id="vault-cust-phone"
                    type="tel"
                    required
                    maxLength={10}
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="9876501234"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-mono font-bold text-sq-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="vault-cust-flat"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Flat / House No. & Building *
                  </label>
                  <input
                    id="vault-cust-flat"
                    type="text"
                    required
                    value={newCustFlat}
                    onChange={(e) => setNewCustFlat(e.target.value)}
                    placeholder="Flat 302, Shanti Heights"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vault-cust-area"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Area / Locality / Street *
                  </label>
                  <input
                    id="vault-cust-area"
                    type="text"
                    required
                    value={newCustArea}
                    onChange={(e) => setNewCustArea(e.target.value)}
                    placeholder="Dharampeth, MG Road"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="vault-cust-landmark"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Landmark
                  </label>
                  <input
                    id="vault-cust-landmark"
                    type="text"
                    value={newCustLandmark}
                    onChange={(e) => setNewCustLandmark(e.target.value)}
                    placeholder="Metro Gate 2"
                    className="w-full px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vault-cust-city"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    City
                  </label>
                  <input
                    id="vault-cust-city"
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vault-cust-tag"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Address Tag
                  </label>
                  <select
                    id="vault-cust-tag"
                    value={newCustTag}
                    onChange={(e) =>
                      setNewCustTag(e.target.value as 'Home' | 'Work' | 'Other')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-extrabold text-sq-ink"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                id="vault-add-customer-btn"
                className="btn-tactile w-full py-3.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile cursor-pointer"
              >
                + Add Customer to Database
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-sq-ink">
                  Applied & Registered Customers ({registeredCustomers.length})
                </h2>
                <p className="text-xs text-sq-muted">
                  All customers who registered their profile and delivery address for ordering.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-xs font-extrabold">
                {registeredCustomers.length} Active
              </span>
            </div>

            {registeredCustomers.length === 0 ? (
              <div className="bg-sq-surfaceAlt rounded-2xl p-8 text-center border border-black/10 space-y-2">
                <p className="text-sm font-extrabold text-sq-ink">
                  0 Customers Registered Yet
                </p>
                <p className="text-xs text-sq-muted">
                  New customers who register via `#/login` or the form on the left will appear here in real time.
                </p>
              </div>
            ) : (
              <ul
                id="vault-customers-list"
                data-testid="vault-customers-list"
                className="space-y-3 max-h-[500px] overflow-y-auto pr-1"
              >
                {registeredCustomers.map((cust) => (
                  <li
                    key={cust.id}
                    data-testid="vault-customer-row"
                    className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-sq-ink">
                          {cust.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-[11px] font-extrabold">
                          +91 {cust.phone}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/5 text-sq-muted font-mono text-[10px] font-bold">
                          {cust.addressTag}
                        </span>
                      </div>
                      <p className="text-xs text-sq-muted font-semibold">
                        📍 {cust.formattedAddress || cust.address}
                      </p>
                      <p className="text-[11px] font-mono text-sq-muted">
                        Registered: {cust.createdAt || cust.registeredAt} • Last Active:{' '}
                        {cust.lastLoginAt || cust.createdAt || cust.registeredAt}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="vault-remove-customer-btn"
                      onClick={() => void handleCreatorDeleteCustomer(cust)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Customer</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED SHOPS MANAGEMENT */}
      {activeVaultTab === 'shops' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-sq-accent" />
              <h2 className="text-lg font-extrabold text-sq-ink">
                Add New Kirana Shop to Network
              </h2>
            </div>
            <p className="text-xs text-sq-muted">
              Onboard a neighborhood kirana shop directly into the backend database and live GPS radar.
            </p>

            <form
              id="creator-add-store-form"
              onSubmit={handleCreatorAddStore}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="vault-store-name"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Kirana Store Name *
                  </label>
                  <input
                    id="vault-store-name"
                    type="text"
                    required
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder="e.g. Sharma Super Kirana"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vault-store-owner"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    Shopkeeper / Owner Name *
                  </label>
                  <input
                    id="vault-store-owner"
                    type="text"
                    required
                    value={newStoreOwner}
                    onChange={(e) => setNewStoreOwner(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="vault-store-phone"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    10-Digit Merchant Mobile *
                  </label>
                  <input
                    id="vault-store-phone"
                    type="tel"
                    required
                    maxLength={10}
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    placeholder="9823012345"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-mono font-bold text-sq-ink"
                  />
                </div>
                <div>
                  <label
                    htmlFor="vault-store-gstin"
                    className="block text-[11px] font-extrabold text-sq-ink mb-1"
                  >
                    GSTIN / UDYAM No.
                  </label>
                  <input
                    id="vault-store-gstin"
                    type="text"
                    value={newStoreGstin}
                    onChange={(e) => setNewStoreGstin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-mono font-bold text-sq-ink"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="vault-store-address"
                  className="block text-[11px] font-extrabold text-sq-ink mb-1"
                >
                  Shop Street Address *
                </label>
                <input
                  id="vault-store-address"
                  type="text"
                  required
                  value={newStoreAddress}
                  onChange={(e) => setNewStoreAddress(e.target.value)}
                  placeholder="Shop 12, Main Market, Sitabuldi, Nagpur"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sq-surfaceAlt border border-black/15 text-xs font-bold text-sq-ink"
                />
              </div>

              <button
                type="submit"
                id="vault-add-store-btn"
                className="btn-tactile w-full py-3.5 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs shadow-tactile cursor-pointer"
              >
                + Register Shop in Database
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-sq-surface rounded-[32px] p-6 shadow-card border border-black/10 space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-sq-ink">
                  Registered Kirana Shops ({registeredStores.length})
                </h2>
                <p className="text-xs text-sq-muted">
                  All verified shops published on the SuchiQO GPS map & voice ordering network.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-xs font-extrabold">
                {registeredStores.length} Shops
              </span>
            </div>

            {registeredStores.length === 0 ? (
              <div className="bg-sq-surfaceAlt rounded-2xl p-8 text-center border border-black/10 space-y-2">
                <p className="text-sm font-extrabold text-sq-ink">
                  0 Shops Registered Yet
                </p>
                <p className="text-xs text-sq-muted">
                  Add a shop using the form on the left or register as a Shopkeeper in `#/login`.
                </p>
              </div>
            ) : (
              <ul
                id="vault-stores-list"
                data-testid="vault-stores-list"
                className="space-y-3 max-h-[500px] overflow-y-auto pr-1"
              >
                {registeredStores.map((st) => (
                  <li
                    key={st.id}
                    data-testid="vault-store-row"
                    className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-sq-ink">
                          🏪 {st.storeName}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-[11px] font-extrabold">
                          Owner: {st.ownerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/15 text-[#16A34A] font-mono text-[10px] font-bold">
                          +91 {st.phone}
                        </span>
                      </div>
                      <p className="text-xs text-sq-muted font-semibold">
                        📍 {st.address} • GPS ({(st.lat || 21.1458).toFixed(4)}, {(st.lng || 79.0882).toFixed(4)})
                      </p>
                      <p className="text-[11px] font-mono text-sq-muted">
                        GSTIN: {st.gstin || '27AABCS1429B1Z5'} • UPI: {st.upiVpa || `${st.phone}@upi`}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="vault-remove-store-btn"
                      onClick={() => void handleCreatorDeleteStore(st)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white font-extrabold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Shop</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PERSISTENT CUSTOMER VOICE MEMORY BRAIN */}
      {activeVaultTab === 'memory' && (
        <div className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 space-y-5">
          <div className="flex items-center justify-between border-b border-black/10 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-sq-ink">
                Persistent Customer Conversational Memory Profiles ({voiceProfilesList.length})
              </h2>
              <p className="text-xs text-sq-muted">
                Every customer’s past voice conversations, favorite items, and recommended recipes stored in `suchiqo-db.json` so the Gnani Voice Brain remembers them across sessions.
              </p>
            </div>
          </div>

          {voiceProfilesList.length === 0 ? (
            <div className="bg-sq-surfaceAlt rounded-2xl p-8 text-center border border-black/10">
              <p className="text-sm font-extrabold text-sq-ink">
                0 Customer Voice Memory Profiles Yet
              </p>
              <p className="text-xs text-sq-muted mt-1">
                Speak to the Gnani AI Voice Concierge to automatically build persistent per-customer conversational memory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceProfilesList.map((prof) => {
                const favList = prof.favoriteItemNames || prof.favoriteItems || [];
                const lastDish =
                  prof.lastRecommendedRecipe ||
                  (prof.lastRecommendedRecipes && prof.lastRecommendedRecipes[0]) ||
                  null;
                const displayPhone = prof.customerPhone || prof.phone || '';
                return (
                  <div
                    key={prof.customerKey}
                    className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-sq-ink">
                        🎙️ {prof.customerName} {displayPhone ? `(+91 ${displayPhone})` : ''}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-sq-accentSoft text-sq-accent font-mono text-[11px] font-extrabold">
                        {(prof.turns || []).length} Saved Turn(s)
                      </span>
                    </div>
                    {lastDish && (
                      <p className="text-xs font-bold text-[#16A34A]">
                        🍲 Last Recommended Dish: {lastDish}
                      </p>
                    )}
                    {favList.length > 0 && (
                      <p className="text-xs text-sq-muted font-semibold">
                        ⭐ Favorite Items: {favList.join(', ')}
                      </p>
                    )}
                    <div className="space-y-1.5 pt-2 border-t border-black/10 max-h-40 overflow-y-auto">
                      {(prof.turns || []).slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] bg-sq-surface p-2.5 rounded-xl border border-black/5"
                        >
                          <span className="font-mono text-sq-muted">[{t.timestamp}]</span>{' '}
                          <span className="font-extrabold text-sq-ink">"{t.userText}"</span>
                          <p className="text-sq-muted mt-0.5">{t.agentReply}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROTECTED RAW BACKEND FILE (`data/suchiqo-db.json`) */}
      {activeVaultTab === 'rawfile' && (
        <div className="bg-sq-surface rounded-[32px] p-6 sm:p-8 shadow-card border border-black/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-sq-accent" />
                <h2 className="text-lg font-extrabold text-sq-ink">
                  Protected Backend Database File (`data/suchiqo-db.json`)
                </h2>
              </div>
              <p className="text-xs text-sq-muted">
                Live JSON snapshot stored on the backend server disk — strictly visible only to Creator ({CREATOR_EMAIL}).
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadProtectedDbFile}
              className="btn-tactile px-4 py-2 rounded-full bg-sq-accent hover:bg-sq-accentHover text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON File</span>
            </button>
          </div>

          <pre
            id="creator-raw-db-json"
            className="bg-[#121316] text-emerald-300 font-mono text-xs p-5 rounded-2xl overflow-x-auto max-h-[520px] overflow-y-auto border border-white/10"
          >
            {JSON.stringify(
              dbSnapshot || {
                creatorEmail: CREATOR_EMAIL,
                registeredCustomers,
                registeredStores,
                shelf,
                orders,
                customerVoiceProfiles,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </section>
  );
};
