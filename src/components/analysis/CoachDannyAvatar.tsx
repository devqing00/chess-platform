'use client';

import React from 'react';

export const CoachDannyAvatar: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-2xl overflow-hidden bg-[#242b38] border-2 border-[#3a4454] shadow-md flex items-center justify-center relative select-none ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id="coachGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#323c4d" />
            <stop offset="100%" stopColor="#1e242f" />
          </linearGradient>
          <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8c39e" />
            <stop offset="100%" stopColor="#e5a982" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#coachGrad)" />

        {/* Navy Sweater & Shoulders */}
        <path d="M10 100 C15 75, 30 70, 50 70 C70 70, 85 75, 90 100 Z" fill="#2d3748" />

        {/* White Inner Shirt Collar */}
        <polygon points="43,68 50,80 57,68" fill="#ffffff" />
        <polygon points="40,68 47,82 50,68" fill="#e2e8f0" />
        <polygon points="60,68 53,82 50,68" fill="#cbd5e1" />

        {/* Neck */}
        <rect x="42" y="56" width="16" height="16" rx="4" fill="url(#skinGrad)" />

        {/* Face */}
        <ellipse cx="50" cy="46" rx="20" ry="24" fill="url(#skinGrad)" />

        {/* Brown Hair */}
        <path
          d="M28 40 C28 20, 36 14, 50 14 C64 14, 72 20, 72 40 C72 30, 68 22, 50 22 C32 22, 28 30, 28 40 Z"
          fill="#5a3825"
        />

        {/* Neat Brown Beard & Stubble */}
        <path
          d="M33 46 C33 65, 40 70, 50 70 C60 70, 67 65, 67 46 C67 58, 60 65, 50 65 C40 65, 33 58, 33 46 Z"
          fill="#4a2c1b"
        />
        {/* Moustache */}
        <path
          d="M40 54 Q50 56 60 54 Q50 58 40 54 Z"
          fill="#4a2c1b"
        />

        {/* Smile */}
        <path d="M44 57 Q50 62 56 57" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Nose */}
        <path d="M49 44 L51 47 L48 49 Z" fill="#d99b75" />

        {/* Eyes & Eyebrows */}
        <ellipse cx="42" cy="40" rx="2.5" ry="3" fill="#2d1d12" />
        <ellipse cx="58" cy="40" rx="2.5" ry="3" fill="#2d1d12" />
        <path d="M38 34 Q43 32 47 35" stroke="#3d2314" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M62 34 Q57 32 53 35" stroke="#3d2314" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Modern Coach Glasses */}
        <rect x="35" y="35" width="14" height="11" rx="3" stroke="#1a202c" strokeWidth="2" fill="none" />
        <rect x="51" y="35" width="14" height="11" rx="3" stroke="#1a202c" strokeWidth="2" fill="none" />
        <line x1="49" y1="40" x2="51" y2="40" stroke="#1a202c" strokeWidth="2" />
      </svg>
    </div>
  );
};
