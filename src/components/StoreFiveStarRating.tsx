import React, { useState } from 'react';
import { Star, ShieldCheck, Check } from 'lucide-react';
import { RegisteredStore } from '../utils/suchiqoLogic';

interface StoreFiveStarRatingProps {
  store: RegisteredStore;
  onRate?: (storeId: string, rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showTrustBadge?: boolean;
  currentUserId?: string;
  className?: string;
}

export const StoreFiveStarRating: React.FC<StoreFiveStarRatingProps> = ({
  store,
  onRate,
  interactive = true,
  size = 'md',
  showCount = true,
  showTrustBadge = true,
  currentUserId = 'shopper',
  className = '',
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [recentRated, setRecentRated] = useState<number | null>(null);

  const displayRating = store.rating !== undefined ? store.rating : 4.9;
  const reviewCount = store.reviewCount !== undefined ? store.reviewCount : 124;
  const userExistingRating =
    currentUserId && store.userRatings && store.userRatings[currentUserId]
      ? store.userRatings[currentUserId]
      : recentRated;

  const starSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleStarClick = (e: React.MouseEvent, star: number) => {
    e.stopPropagation();
    if (!interactive) return;
    setRecentRated(star);
    if (onRate) {
      onRate(store.id, star);
    }
  };

  const roundedScore = Math.round(displayRating);

  return (
    <div
      data-testid={`store-star-rating-${store.id}`}
      className={`store-rating-component flex flex-wrap items-center gap-2 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 5-Star Row */}
      <div
        className="flex items-center gap-0.5"
        role="group"
        aria-label={`Rating for ${store.storeName}: ${displayRating} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled =
            hoverRating !== null ? star <= hoverRating : star <= roundedScore;
          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              data-testid={`rate-star-${store.id}-${star}`}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''} for ${store.storeName}`}
              onMouseEnter={() => interactive && setHoverRating(star)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              onClick={(e) => handleStarClick(e, star)}
              className={`p-0.5 rounded transition ${
                interactive
                  ? 'hover:scale-125 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500'
                  : 'cursor-default'
              }`}
            >
              <Star
                className={`${starSizeClasses[size]} transition-colors ${
                  isFilled
                    ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                    : 'text-neutral-300 fill-neutral-100'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Numerical Rating Badge */}
      <div className="flex items-center gap-1.5">
        <span
          data-testid={`store-rating-score-${store.id}`}
          className="font-mono text-xs font-extrabold text-sq-ink bg-amber-500/15 text-amber-700 px-1.5 py-0.5 rounded-md"
        >
          {displayRating.toFixed(1)} ★
        </span>

        {showCount && (
          <span className="text-[11px] font-mono text-sq-muted font-bold whitespace-nowrap">
            ({reviewCount} reviews)
          </span>
        )}
      </div>

      {/* Customer Feedback / Trust Badge */}
      {userExistingRating ? (
        <span
          data-testid={`user-rated-pill-${store.id}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-mono text-[10px] font-extrabold"
        >
          <Check className="w-3 h-3" />
          <span>You rated {userExistingRating}★</span>
        </span>
      ) : (
        showTrustBadge && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sq-surfaceAlt text-sq-muted border border-black/10 font-mono text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
            <span>Verified Kirana</span>
          </span>
        )
      )}
    </div>
  );
};
