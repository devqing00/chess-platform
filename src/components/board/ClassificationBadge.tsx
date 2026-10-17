'use client';

import React from 'react';
import { MoveClassification } from '@/types/chess';

interface ClassificationBadgeProps {
  classification: MoveClassification;
  size?: 'sm' | 'md' | 'lg' | 'board';
  className?: string;
}

// 1. Brilliant Icon (!!) - Custom extra-bold vector double exclamation
export const BrilliantIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-white shrink-0`}>
    {/* Left exclamation mark - thick bold stem and solid dot */}
    <path d="M5.8 5.6c0-1.2 1.0-2.1 2.2-2.1s2.2.9 2.2 2.1l-.5 7.8c0 1.0-.8 1.6-1.7 1.6s-1.7-.6-1.7-1.6l-.5-7.8z" />
    <circle cx="8.0" cy="18.6" r="2.2" />
    {/* Right exclamation mark - thick bold stem and solid dot */}
    <path d="M13.8 5.6c0-1.2 1.0-2.1 2.2-2.1s2.2.9 2.2 2.1l-.5 7.8c0 1.0-.8 1.6-1.7 1.6s-1.7-.6-1.7-1.6l-.5-7.8z" />
    <circle cx="16.0" cy="18.6" r="2.2" />
  </svg>
);

// 2. Great Icon (!) - Custom bold single exclamation
export const GreatIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-white shrink-0`}>
    <path d="M9.9 5.4c0-1.1.9-1.9 2.1-1.9s2.1.8 2.1 1.9l-.6 8c0 .9-.7 1.5-1.5 1.5s-1.5-.6-1.5-1.5l-.6-8z" />
    <circle cx="12" cy="18.6" r="2.1" />
  </svg>
);

// 3. Best Icon (★) - Bold space-filling 5-point star (Reference benchmark)
export const BestIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-white shrink-0`}>
    <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3 1.2-6.9-5-4.9 6.9-1L12 2z" />
  </svg>
);

// 4. Excellent Icon (👍) - Custom bold thumbs-up vector silhouette
export const ExcellentIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-white shrink-0`}>
    <path d="M3 13.5c0-.8.7-1.5 1.5-1.5h3.2l3-7.5c.5-1.1 1.8-1.5 2.8-.9.7.4 1.1 1.2.9 2l-.9 4.4h5.7c1.4 0 2.5 1.2 2.3 2.6l-1.3 6c-.2 1.1-1.2 1.9-2.3 1.9H7.5c-.8 0-1.5-.7-1.5-1.5v-4.5c0-.5-.5-1-1.5-1H3z" />
  </svg>
);

// 5. Good Icon (✓) - Bold crisp checkmark
export const GoodIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" className={`${className} text-white shrink-0`}>
    <polyline points="5.2 12.2 9.8 16.8 19 7.6" />
  </svg>
);

// 6. Book Icon (Open Book) - Custom Chess.com style open book silhouette
export const BookIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-white shrink-0`}>
    <path d="M11 6.5C8.5 5 5.5 5 3.5 5.5c-.3.1-.5.4-.5.8v10.4c0 .4.3.7.7.7 1.8-.4 4.5-.5 7.3 1.1V6.5zm2 0v12c2.8-1.6 5.5-1.5 7.3-1.1.4 0 .7-.3.7-.7V6.3c0-.4-.2-.7-.5-.8-2-.5-5-.5-7.5 1z" />
  </svg>
);

// 7. Inaccuracy Icon (?!) - Extra-bold white interrobang combo
export const InaccuracyIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" className={`${className} text-white shrink-0`}>
    {/* Left question mark - extra thick and bold */}
    <path d="M6.0 8.8c0-2.6 1.6-4.2 3.8-4.2s3.8 1.6 3.8 3.6c0 2.2-1.7 3.5-3.6 4.8v1.6" strokeWidth="3.6" />
    <circle cx="10.0" cy="18.6" r="2.1" fill="currentColor" stroke="none" />
    {/* Right exclamation mark - extra thick and bold */}
    <line x1="17.2" y1="4.6" x2="17.2" y2="14.4" strokeWidth="3.6" />
    <circle cx="17.2" cy="18.6" r="2.1" fill="currentColor" stroke="none" />
  </svg>
);

// 8. Mistake Icon (?) - Bold question mark
export const MistakeIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" className={`${className} text-white shrink-0`}>
    <path d="M8.2 8.6c0-2.6 1.6-4.1 3.8-4.1s3.8 1.5 3.8 3.5c0 2.2-1.7 3.6-3.8 4.8v1.6" strokeWidth="3.6" />
    <circle cx="12" cy="18.6" r="2.0" fill="currentColor" stroke="none" />
  </svg>
);

// 9. Miss Icon (✕) - Bold cross
export const MissIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" className={`${className} text-white shrink-0`}>
    <line x1="6.5" y1="6.5" x2="17.5" y2="17.5" />
    <line x1="17.5" y1="6.5" x2="6.5" y2="17.5" />
  </svg>
);

// 10. Blunder Icon (??) - Extra-bold double question marks
export const BlunderIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" className={`${className} text-white shrink-0`}>
    {/* Left question mark - extra thick and bold */}
    <path d="M4.6 8.5c0-2.4 1.4-3.8 3.0-3.8s3.0 1.4 3.0 3.0c0 2.0-1.5 3.3-2.8 4.5-.6.6-.8 1.4-.8 2.4" strokeWidth="3.5" />
    <circle cx="7.0" cy="18.6" r="2.0" fill="currentColor" stroke="none" />
    {/* Right question mark - extra thick and bold */}
    <path d="M13.6 8.5c0-2.4 1.4-3.8 3.0-3.8s3.0 1.4 3.0 3.0c0 2.0-1.5 3.3-2.8 4.5-.6.6-.8 1.4-.8 2.4" strokeWidth="3.5" />
    <circle cx="16.0" cy="18.6" r="2.0" fill="currentColor" stroke="none" />
  </svg>
);

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  {
    label: string;
    bg: string;
    text: string;
    hex: string;
    countColor: string;
    overlayRgba: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  brilliant: {
    label: '!!',
    bg: 'bg-[#1baca6]',
    text: 'text-white',
    hex: '#1baca6',
    countColor: 'text-[#1baca6]',
    overlayRgba: 'rgba(27, 172, 166, 0.42)',
    Icon: BrilliantIcon,
  },
  great: {
    label: '!',
    bg: 'bg-[#5c8bb0]',
    text: 'text-white',
    hex: '#5c8bb0',
    countColor: 'text-[#5c8bb0]',
    overlayRgba: 'rgba(92, 139, 176, 0.42)',
    Icon: GreatIcon,
  },
  best: {
    label: '★',
    bg: 'bg-[#81b64c]',
    text: 'text-white',
    hex: '#81b64c',
    countColor: 'text-[#81b64c]',
    overlayRgba: 'rgba(129, 182, 76, 0.42)',
    Icon: BestIcon,
  },
  excellent: {
    label: '👍',
    bg: 'bg-[#96bc4b]',
    text: 'text-white',
    hex: '#96bc4b',
    countColor: 'text-[#96bc4b]',
    overlayRgba: 'rgba(150, 188, 75, 0.42)',
    Icon: ExcellentIcon,
  },
  good: {
    label: '✓',
    bg: 'bg-[#85a94e]',
    text: 'text-white',
    hex: '#85a94e',
    countColor: 'text-[#85a94e]',
    overlayRgba: 'rgba(133, 169, 78, 0.38)',
    Icon: GoodIcon,
  },
  book: {
    label: 'Book',
    bg: 'bg-[#d5a47d]',
    text: 'text-white',
    hex: '#d5a47d',
    countColor: 'text-[#d5a47d]',
    overlayRgba: 'rgba(213, 164, 125, 0.45)',
    Icon: BookIcon,
  },
  inaccuracy: {
    label: '?!',
    bg: 'bg-[#f0c15c]',
    text: 'text-white',
    hex: '#f0c15c',
    countColor: 'text-[#f0c15c]',
    overlayRgba: 'rgba(240, 193, 92, 0.42)',
    Icon: InaccuracyIcon,
  },
  mistake: {
    label: '?',
    bg: 'bg-[#e58f2a]',
    text: 'text-white',
    hex: '#e58f2a',
    countColor: 'text-[#e58f2a]',
    overlayRgba: 'rgba(229, 143, 42, 0.42)',
    Icon: MistakeIcon,
  },
  blunder: {
    label: '??',
    bg: 'bg-[#ca3431]',
    text: 'text-white',
    hex: '#ca3431',
    countColor: 'text-[#ca3431]',
    overlayRgba: 'rgba(202, 52, 49, 0.45)',
    Icon: BlunderIcon,
  },
  miss: {
    label: '✕',
    bg: 'bg-[#e05244]',
    text: 'text-white',
    hex: '#e05244',
    countColor: 'text-[#e05244]',
    overlayRgba: 'rgba(224, 82, 68, 0.42)',
    Icon: MissIcon,
  },
};

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification,
  size = 'md',
  className = '',
}) => {
  const key: MoveClassification = (() => {
    if (!classification) return 'good';
    if (typeof classification === 'string') {
      const lower = classification.toLowerCase().trim();
      if (lower in CLASSIFICATION_CONFIG) return lower as MoveClassification;
      return 'good';
    }
    if (typeof classification === 'object' && classification !== null) {
      const inner = (classification as any).classification;
      if (typeof inner === 'string' && inner.toLowerCase().trim() in CLASSIFICATION_CONFIG) {
        return inner.toLowerCase().trim() as MoveClassification;
      }
    }
    return 'good';
  })();

  const config = CLASSIFICATION_CONFIG[key] || CLASSIFICATION_CONFIG.good;
  const IconComponent = config.Icon || GoodIcon;

  // Authentic Chess.com sizing - NO stroke / border, centered vector icon filling space
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    board: 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 shadow-md',
  }[size];

  const titleText = typeof key === 'string' ? key.toUpperCase() : 'MOVE';

  return (
    <div
      className={`rounded-full flex items-center justify-center select-none shrink-0 transition-transform ${sizeClasses} ${config.bg} shadow-md border-none ${className}`}
      title={titleText}
    >
      <IconComponent />
    </div>
  );
};

// 11. Checkmate / Defeated King Icon (#) - Custom bold checkmate notation symbol
export const CheckmateIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" className={`${className} text-white shrink-0`}>
    <line x1="9.5" y1="4.2" x2="8" y2="19.8" />
    <line x1="16" y1="4.2" x2="14.5" y2="19.8" />
    <line x1="4.5" y1="9.5" x2="19.5" y2="9.5" />
    <line x1="4.5" y1="14.8" x2="19.5" y2="14.8" />
  </svg>
);

// 12. Winner Crown Icon - Custom bold regal 3-peak crown
export const WinnerCrownIcon = ({ className = 'w-[72%] h-[72%]' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} text-white shrink-0`}>
    {/* 3 top jewels */}
    <circle cx="5" cy="8.2" r="1.5" />
    <circle cx="12" cy="6.2" r="1.6" />
    <circle cx="19" cy="8.2" r="1.5" />
    {/* Crown body with curved base */}
    <path d="M5 10.6l2.8 4L12 8.6l4.2 6 2.8-4-.8 7.2c-.1.9-.9 1.6-1.8 1.6H7.6c-.9 0-1.7-.7-1.8-1.6L5 10.6z" />
  </svg>
);

// Checkmated King Badge Component (Matches classification badge styling)
export const CheckmateBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'board'; className?: string }> = ({
  size = 'board',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    board: 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 shadow-md',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center select-none shrink-0 transition-transform ${sizeClasses} bg-[#ca3431] shadow-md border-none ${className}`}
      title="CHECKMATE"
    >
      <CheckmateIcon />
    </div>
  );
};

// Winning King Badge Component (Matches classification badge styling)
export const WinnerBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'board'; className?: string }> = ({
  size = 'board',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    board: 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 shadow-md',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center select-none shrink-0 transition-transform ${sizeClasses} bg-[#81b64c] shadow-md border-none ${className}`}
      title="WINNER"
    >
      <WinnerCrownIcon />
    </div>
  );
};

