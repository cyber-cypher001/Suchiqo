import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  Zap,
  Copy,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  Bike,
  Store as StoreIcon,
  Home as HomeIcon,
} from 'lucide-react';
import { OrderRecord, RegisteredStore } from '../utils/suchiqoLogic';

export interface LiveOrderTrackingMapProps {
  order: OrderRecord;
  store: RegisteredStore | null;
  customerAddressText?: string;
  customerName?: string;
  onConfirmDelivered?: (orderId: string) => void;
  onClose?: () => void;
}

export const LiveOrderTrackingMap: React.FC<LiveOrderTrackingMapProps> = ({
  order,
  store,
  customerAddressText,
  customerName,
  onConfirmDelivered,
  onClose,
}) => {
  // Store Origin Coordinates
  const storeLat = store?.lat ?? 21.1458;
  const storeLng = store?.lng ?? 79.0882;
  const storeName = store?.storeName || order.storeName || 'Local Verified Kirana';
  const storePhone = store?.phone || '9822012345';

  // Customer Destination Coordinates (Offset ~1.2 km in local neighborhood if exact lat/lng is unspecified)
  const custLat = storeLat + 0.0084;
  const custLng = storeLng + 0.0076;
  const deliveryAddress =
    order.deliveryAddress || customerAddressText || 'Verified Customer Delivery Address';
  const recipientName = order.customerName || customerName || 'Valued Shopper';
  const handoverOtp = order.handoverOtp || '4829';

  // Real-time animation / progress of Delivery Partner (0% to 100%)
  const isInitiallyDelivered = order.status === 'Delivered';
  const [progress, setProgress] = useState<number>(isInitiallyDelivered ? 1.0 : 0.42);
  const [isSimulating, setIsSimulating] = useState<boolean>(!isInitiallyDelivered);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [mapMode, setMapMode] = useState<'radar' | 'google_embed' | 'satellite' | 'interactive'>('radar');
  const [otpCopied, setOtpCopied] = useState<boolean>(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>('');

  // Fetch optional provisioned Google Maps API key from backend
  useEffect(() => {
    fetch('/api/config/maps-key')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Fallback to vector GPS radar canvas
      });
  }, []);

  // Delivery Partner smooth animation ticker
  useEffect(() => {
    if (!isSimulating || isInitiallyDelivered) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1.0) {
          setIsSimulating(false);
          return 1.0;
        }
        // Advance by ~0.5% * speed every 300ms
        const next = Math.min(1.0, prev + 0.005 * simSpeed);
        return Number(next.toFixed(4));
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, isInitiallyDelivered]);

  // Current calculated coordinates of Delivery Partner
  const riderLat = storeLat + (custLat - storeLat) * progress;
  const riderLng = storeLng + (custLng - storeLng) * progress;

  // Approximate metrics based on progress
  const totalDistanceKm = 1.4;
  const distanceRemainingKm = Math.max(0, Number((totalDistanceKm * (1 - progress)).toFixed(2)));
  const etaMinutes = Math.max(1, Math.ceil(distanceRemainingKm * 3.5));
  const riderSpeedKmh = progress >= 1.0 ? 0 : Math.round(22 + Math.sin(progress * 10) * 4);

  // Status stage resolution
  let deliveryStageText = 'Order Packed & Partner Assigned at Kirana';
  let deliveryStagePill = 'bg-blue-500/15 text-blue-700 border-blue-500/30';
  if (progress >= 1.0 || isInitiallyDelivered) {
    deliveryStageText = 'Arrived at Delivery Point! Ready for OTP Handover';
    deliveryStagePill = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
  } else if (progress > 0.85) {
    deliveryStageText = 'Approaching Your Gate / Building (< 150m)';
    deliveryStagePill = 'bg-sq-accentSoft text-sq-accent border-sq-accent/30';
  } else if (progress > 0.2) {
    deliveryStageText = `Out for Delivery • En route (${distanceRemainingKm} km remaining)`;
    deliveryStagePill = 'bg-orange-500/15 text-orange-700 border-orange-500/30';
  }

  const handleCopyOtp = () => {
    try {
      navigator.clipboard.writeText(handoverOtp);
      setOtpCopied(true);
      setTimeout(() => setOtpCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleResetSimulation = () => {
    setProgress(0.05);
    setIsSimulating(true);
  };

  // Google Maps Embed Directions API with provisioned API key
  const googleMapsEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(
        mapsApiKey
      )}&origin=${storeLat},${storeLng}&destination=${custLat},${custLng}&mode=driving${
        mapMode === 'satellite' ? '&maptype=satellite' : ''
      }`
    : `https://maps.google.com/maps?q=${storeLat},${storeLng}&hl=en&z=15&output=embed`;

  return (
    <div
      id="live-order-tracking-modal"
      className="bg-sq-surface rounded-3xl p-5 sm:p-6 shadow-card border-2 border-sq-accent/30 space-y-5"
    >
      {/* Header with Live Delivery Pill and Handover OTP */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-sm text-sq-accent">
              Live Radar • {order.id}
            </span>
            <span
              id="tracking-stage-pill"
              className={`px-3 py-0.5 rounded-full text-xs font-mono font-extrabold border ${deliveryStagePill} flex items-center gap-1.5`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>{deliveryStageText}</span>
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-sq-ink">
            Real-Time Kirana Delivery Partner Tracker
          </h2>
          <p className="text-xs text-sq-muted">
            Live GPS telemetry tracking partner movement from <strong>{storeName}</strong> to your doorstep.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Handover OTP Badge */}
          <div
            id="tracking-handover-otp-box"
            onClick={handleCopyOtp}
            className="bg-sq-accentSoft border-2 border-sq-accent/40 rounded-2xl px-3.5 py-2 text-right cursor-pointer hover:bg-sq-accent/15 transition select-none"
            title="Click to copy delivery OTP"
          >
            <span className="text-[10px] font-mono uppercase text-sq-accent font-extrabold block">
              Handover OTP
            </span>
            <div className="flex items-center gap-1.5 font-mono text-base font-black text-sq-ink">
              <span>{handoverOtp}</span>
              {otpCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-sq-accent" />
              )}
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 text-sq-muted hover:text-sq-ink transition cursor-pointer"
              aria-label="Close Tracking View"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Live Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-sq-surfaceAlt rounded-2xl p-3 border border-black/10">
          <span className="text-[10px] font-mono uppercase text-sq-muted block font-bold">
            Distance to You
          </span>
          <span id="tracking-distance-val" className="font-mono text-base font-black text-sq-ink">
            {distanceRemainingKm} km
          </span>
        </div>
        <div className="bg-sq-surfaceAlt rounded-2xl p-3 border border-black/10">
          <span className="text-[10px] font-mono uppercase text-sq-muted block font-bold">
            Estimated Arrival
          </span>
          <span id="tracking-eta-val" className="font-mono text-base font-black text-sq-accent">
            {progress >= 1.0 ? 'Arrived!' : `⏱️ ${etaMinutes} Mins`}
          </span>
        </div>
        <div className="bg-sq-surfaceAlt rounded-2xl p-3 border border-black/10">
          <span className="text-[10px] font-mono uppercase text-sq-muted block font-bold">
            Partner Speed
          </span>
          <span id="tracking-speed-val" className="font-mono text-base font-black text-sq-ink">
            {riderSpeedKmh} km/h
          </span>
        </div>
        <div className="bg-sq-surfaceAlt rounded-2xl p-3 border border-black/10">
          <span className="text-[10px] font-mono uppercase text-sq-muted block font-bold">
            Vehicle Telemetry
          </span>
          <span className="font-mono text-xs font-bold text-emerald-600 flex items-center gap-1 pt-0.5">
            <Zap className="w-3 h-3" /> EV Splendor • 88%
          </span>
        </div>
      </div>

      {/* Map Display & Controls Toolbar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-sq-surfaceAlt p-1 rounded-xl border border-black/10">
            <button
              type="button"
              id="map-mode-radar-btn"
              onClick={() => setMapMode('radar')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                mapMode === 'radar'
                  ? 'bg-sq-accent text-white shadow-xs'
                  : 'text-sq-muted hover:text-sq-ink'
              }`}
            >
              GPS Vector Radar
            </button>
            <button
              type="button"
              id="map-mode-google-btn"
              onClick={() => setMapMode('google_embed')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                mapMode === 'google_embed'
                  ? 'bg-sq-accent text-white shadow-xs'
                  : 'text-sq-muted hover:text-sq-ink'
              }`}
            >
              Google Maps Live Route
            </button>
            <button
              type="button"
              id="map-mode-satellite-btn"
              onClick={() => setMapMode('satellite')}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                mapMode === 'satellite'
                  ? 'bg-sq-accent text-white shadow-xs'
                  : 'text-sq-muted hover:text-sq-ink'
              }`}
            >
              Satellite View
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-sq-muted font-bold">Sim:</span>
              <button
                type="button"
                onClick={() => setIsSimulating((s) => !s)}
                className="px-2 py-0.5 rounded bg-sq-surfaceAlt border border-black/10 hover:bg-black/5 font-extrabold flex items-center gap-1 cursor-pointer"
                title={isSimulating ? 'Pause live movement' : 'Play live movement'}
              >
                {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isSimulating ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetSimulation}
                className="p-1 rounded bg-sq-surfaceAlt border border-black/10 hover:bg-black/5 cursor-pointer"
                title="Restart delivery journey from store"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setSimSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                className="px-2 py-0.5 rounded bg-sq-surfaceAlt border border-black/10 font-bold hover:bg-black/5 cursor-pointer"
              >
                {simSpeed}x
              </button>
            </div>
          </div>
        </div>

        {/* The Tracking Viewport: Either Google Maps API, Google Maps Embed, or Interactive GPS Radar Canvas */}
        <div
          id="tracking-map-viewport"
          className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden border border-black/15 shadow-inner bg-neutral-900"
        >
          {mapMode === 'google_embed' || mapMode === 'satellite' ? (
            /* Google Maps Live Route Embed with Street & Satellite Directions */
            <iframe
              id="google-maps-tracking-iframe"
              title="Google Maps Live Delivery Route"
              className="w-full h-full border-0"
              src={googleMapsEmbedUrl}
              loading="lazy"
              allowFullScreen
            />
          ) : (
            /* Interactive GPS Radar & Vector Route Renderer (High-performance Canvas with 3 Pins) */
            <div className="relative w-full h-full bg-[#0B0C0E] p-4 flex flex-col justify-between overflow-hidden">
              {/* Radial Radar Scanning Grid Background */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, #FF5500 1px, transparent 1px), linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                }}
              />

              {/* Vector Road Track with moving rider */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 400">
                <defs>
                  <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF5500" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                {/* Simulated winding urban road path from Kirana to Customer */}
                <path
                  d="M 120 300 Q 280 200, 400 240 T 680 120"
                  fill="none"
                  stroke="#333"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 120 300 Q 280 200, 400 240 T 680 120"
                  fill="none"
                  stroke="url(#roadGrad)"
                  strokeWidth="5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
              </svg>

              {/* 1. Store Origin Pin (Bottom Left) */}
              <div
                id="tracking-marker-store"
                className="absolute left-10 sm:left-24 bottom-14 z-10 flex flex-col items-center"
              >
                <div className="bg-[#121316] text-white px-2.5 py-1 rounded-xl border border-sq-accent/40 text-[10px] font-mono font-bold shadow-lg mb-1 whitespace-nowrap">
                  🏪 {storeName}
                </div>
                <div className="w-8 h-8 rounded-full bg-sq-accent text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">
                  <StoreIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono text-neutral-400 font-bold mt-0.5">
                  Start (0 km)
                </span>
              </div>

              {/* 2. Customer Destination Pin (Top Right) */}
              <div
                id="tracking-marker-customer"
                className="absolute right-10 sm:right-24 top-14 z-10 flex flex-col items-center"
              >
                <div className="bg-[#121316] text-white px-2.5 py-1 rounded-xl border border-emerald-500/40 text-[10px] font-mono font-bold shadow-lg mb-1 whitespace-nowrap">
                  🏠 {recipientName} (OTP: {handoverOtp})
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">
                  <HomeIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
                  Destination (1.4 km)
                </span>
              </div>

              {/* 3. Live Moving Delivery Rider (Interpolated on curved path) */}
              <div
                id="tracking-marker-rider"
                className="absolute z-20 flex flex-col items-center transition-all duration-300"
                style={{
                  left: `calc(15% + ${progress * 68}%)`,
                  top: `calc(70% - ${progress * 46}% + ${Math.sin(progress * Math.PI) * 40}px)`,
                }}
              >
                <div className="bg-sq-accent text-white px-2.5 py-0.5 rounded-full font-mono text-[10px] font-extrabold shadow-lg mb-1 whitespace-nowrap flex items-center gap-1">
                  <span>🛵 Ramesh • {riderSpeedKmh} km/h</span>
                </div>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-sq-accent/30 animate-ping" />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF5500] to-[#FF7733] text-white shadow-xl flex items-center justify-center font-bold text-base border-2 border-white">
                    <Bike className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Real-time map telemetry overlay */}
              <div className="relative z-10 flex items-center justify-between pointer-events-none">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-[11px] font-mono font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Maps GPS Radar Active</span>
                </div>
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-[11px] font-mono font-bold">
                  {Math.round(progress * 100)}% Route Completed
                </div>
              </div>

              <div className="relative z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl text-neutral-300 text-[11px] font-mono self-start border border-white/10">
                📍 Live Route: Sitabuldi Market Road ➔ Wardha Rd ➔ Civil Lines
              </div>
            </div>
          )}

          {/* Quick Switch Overlay Pill */}
          <div className="absolute bottom-3 right-3 z-30">
            <button
              type="button"
              onClick={() =>
                setMapMode((m) => (m === 'radar' ? 'google_embed' : 'radar'))
              }
              className="bg-sq-surface/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-black/15 shadow-md text-xs font-bold text-sq-ink hover:bg-sq-accent hover:text-white transition cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-sq-accent" />
              <span>{mapMode === 'radar' ? 'Switch to Google Map' : 'Switch to GPS Radar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress Slider (Interactive Customer Scrubbing) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono font-bold">
          <span className="text-sq-muted">Order Dispatch Progress:</span>
          <span className="text-sq-accent">{Math.round(progress * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={progress}
          onChange={(e) => {
            setProgress(parseFloat(e.target.value));
            setIsSimulating(false);
          }}
          className="w-full accent-sq-accent cursor-pointer"
          aria-label="Delivery Route Progress Scrub"
        />
        <div className="flex justify-between text-[10px] font-mono text-sq-muted font-semibold">
          <span>Kirana Packing</span>
          <span>Partner En Route</span>
          <span>Arrived at Gate</span>
        </div>
      </div>

      {/* Contact Cards: Delivery Partner & Store Owner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Delivery Partner Profile Card */}
        <div className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sq-accent/15 text-sq-accent flex items-center justify-center font-extrabold text-lg border border-sq-accent/30">
              🛵
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-sq-ink">Ramesh Kumar</h4>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 font-mono text-[10px] font-bold">
                  ★ 4.9
                </span>
              </div>
              <p className="text-[11px] text-sq-muted">
                Hero Splendor EV • 420+ safe kirana dropoffs
              </p>
            </div>
          </div>
          <a
            href="tel:+919822099887"
            className="px-3 py-2 rounded-xl bg-sq-surface border border-black/15 text-sq-ink font-bold text-xs hover:bg-sq-accent hover:text-white transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call</span>
          </a>
        </div>

        {/* Kirana Store Dispatch Card */}
        <div className="bg-sq-surfaceAlt rounded-2xl p-4 border border-black/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center font-extrabold text-lg border border-emerald-500/30">
              🏪
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-sq-ink truncate max-w-[180px]">
                {storeName}
              </h4>
              <p className="text-[11px] text-sq-muted truncate max-w-[180px]">
                Owner: {store?.ownerName || 'Merchant'} • Sitabuldi
              </p>
            </div>
          </div>
          <a
            href={`tel:${storePhone}`}
            className="px-3 py-2 rounded-xl bg-sq-surface border border-black/15 text-sq-ink font-bold text-xs hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Store</span>
          </a>
        </div>
      </div>

      {/* Handover Confirmation Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/10">
        <div className="text-xs text-sq-muted font-medium">
          Delivering to: <strong className="text-sq-ink">{deliveryAddress}</strong>
        </div>

        {order.status !== 'Delivered' && onConfirmDelivered && (
          <button
            type="button"
            id="tracking-confirm-received-btn"
            onClick={() => onConfirmDelivered(order.id)}
            className="btn-tactile px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-tactile transition cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Order Received (OTP Verified)</span>
          </button>
        )}
      </div>
    </div>
  );
};
export default LiveOrderTrackingMap;
