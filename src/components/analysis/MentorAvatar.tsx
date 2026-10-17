'use client';

import React from 'react';
import { getMentorById } from '@/lib/mentorsData';

export const MentorAvatar: React.FC<{
  mentorId?: string;
  size?: number;
  className?: string;
}> = ({ mentorId = 'coach-danny', size = 56, className = '' }) => {
  const mentor = getMentorById(mentorId);

  if (mentorId === 'gm-magnus') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl overflow-hidden bg-[#1e293b] border-2 border-amber-500/50 shadow-lg flex items-center justify-center relative select-none shrink-0 ${className}`}
        title={`${mentor.name} - ${mentor.title}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="magnusBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="magnusSkin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#magnusBg)" />
          {/* Dark Charcoal Suit & White Shirt */}
          <path d="M12 100 C18 75, 32 72, 50 72 C68 72, 82 75, 88 100 Z" fill="#18181b" />
          <polygon points="42,70 50,86 58,70" fill="#ffffff" />
          <polygon points="46,72 50,92 54,72" fill="#0284c7" /> {/* Blue tie */}
          {/* Neck */}
          <rect x="42" y="58" width="16" height="14" rx="3" fill="url(#magnusSkin)" />
          {/* Square Strong Jaw Face */}
          <rect x="32" y="32" width="36" height="38" rx="14" fill="url(#magnusSkin)" />
          {/* Messy Sandy Blonde Hair */}
          <path d="M28 36 C28 16, 40 12, 50 12 C62 12, 72 16, 72 36 C68 22, 58 18, 50 18 C38 18, 32 22, 28 36 Z" fill="#b45309" />
          <path d="M30 24 C34 18, 42 16, 50 16 C58 16, 66 18, 70 24" stroke="#d97706" strokeWidth="3" fill="none" />
          {/* Intense Eyes & Eyebrows */}
          <path d="M36 40 L45 39" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M55 39 L64 40" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="41" cy="44" r="2.5" fill="#0369a1" />
          <circle cx="59" cy="44" r="2.5" fill="#0369a1" />
          {/* Smirk */}
          <path d="M44 58 Q50 62 58 57" stroke="#9a3412" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Gold Mini Crown Badge */}
          <polygon points="44,14 47,8 50,13 53,8 56,14" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
        </svg>
      </div>
    );
  }

  if (mentorId === 'mikhail-tal') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl overflow-hidden bg-[#2a131a] border-2 border-rose-500/50 shadow-lg flex items-center justify-center relative select-none shrink-0 ${className}`}
        title={`${mentor.name} - ${mentor.title}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="talBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4c0519" />
              <stop offset="100%" stopColor="#1c070c" />
            </linearGradient>
            <linearGradient id="talSkin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fecdd3" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#talBg)" />
          {/* Black Vintage Wool Coat */}
          <path d="M12 100 C16 74, 30 70, 50 70 C70 70, 84 74, 88 100 Z" fill="#0f172a" />
          <polygon points="40,68 50,84 60,68" fill="#e2e8f0" />
          <polygon points="46,70 50,96 54,70" fill="#e11d48" />
          {/* Neck */}
          <rect x="42" y="56" width="16" height="15" rx="3" fill="#fecdd3" />
          {/* Angular Expressive Face */}
          <polygon points="32,34 68,34 62,68 50,72 38,68" fill="#ffe4e6" />
          {/* Thick Wild Dark Hair */}
          <path d="M26 38 C24 14, 38 8, 50 8 C64 8, 76 14, 74 38 C74 24, 62 14, 50 14 C38 14, 26 24, 26 38 Z" fill="#18181b" />
          <path d="M28 28 Q36 12 50 12 Q64 12 72 28" fill="#27272a" />
          {/* Piercing Hypnotic Eyes */}
          <ellipse cx="40" cy="44" rx="4" ry="5" fill="#18181b" />
          <circle cx="41" cy="43" r="1.5" fill="#f43f5e" />
          <ellipse cx="60" cy="44" rx="4" ry="5" fill="#18181b" />
          <circle cx="61" cy="43" r="1.5" fill="#f43f5e" />
          {/* Burning tactical gaze reflection */}
          <path d="M43 60 Q50 63 57 60" stroke="#881337" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (mentorId === 'master-fischer') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl overflow-hidden bg-[#18181b] border-2 border-indigo-500/50 shadow-lg flex items-center justify-center relative select-none shrink-0 ${className}`}
        title={`${mentor.name} - ${mentor.title}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fischerBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#fischerBg)" />
          {/* Classic 1970s Suit */}
          <path d="M12 100 C18 76, 32 72, 50 72 C68 72, 82 76, 88 100 Z" fill="#312e81" />
          <polygon points="42,70 50,86 58,70" fill="#ffffff" />
          <polygon points="47,72 50,94 53,72" fill="#4338ca" />
          {/* Neck */}
          <rect x="42" y="56" width="16" height="15" rx="3" fill="#fed7aa" />
          {/* Strong Chiselled Profile */}
          <rect x="33" y="32" width="34" height="36" rx="10" fill="#ffedd5" />
          {/* Neat Brown Combed Hair */}
          <path d="M30 34 C30 16, 40 14, 50 14 C62 14, 70 18, 70 34 C68 20, 58 16, 50 16 C40 16, 32 20, 30 34 Z" fill="#78350f" />
          {/* Focused intense eyebrows */}
          <path d="M36 38 L45 37" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M55 37 L64 38" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="41" cy="42" r="2.2" fill="#1e293b" />
          <circle cx="59" cy="42" r="2.2" fill="#1e293b" />
          {/* Determined mouth */}
          <line x1="43" y1="56" x2="57" y2="56" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (mentorId === 'coach-anna') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-2xl overflow-hidden bg-[#082f49] border-2 border-cyan-500/50 shadow-lg flex items-center justify-center relative select-none shrink-0 ${className}`}
        title={`${mentor.name} - ${mentor.title}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="annaBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e7490" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#annaBg)" />
          {/* Modern Cyan Blazer */}
          <path d="M12 100 C16 75, 30 72, 50 72 C70 72, 84 75, 88 100 Z" fill="#0891b2" />
          <polygon points="42,70 50,86 58,70" fill="#ffffff" />
          {/* Neck */}
          <rect x="43" y="56" width="14" height="15" rx="3" fill="#fde047" />
          {/* Face */}
          <ellipse cx="50" cy="46" rx="18" ry="21" fill="#fef08a" />
          {/* Dark Blonde Ponytail / Hair */}
          <path d="M26 40 C26 18, 36 12, 50 12 C64 12, 74 18, 74 40 C74 26, 66 18, 50 18 C34 18, 26 26, 26 40 Z" fill="#ca8a04" />
          {/* Gamer/Commentator Headset */}
          <path d="M28 42 Q50 18 72 42" stroke="#0f172a" strokeWidth="3.5" fill="none" />
          <rect x="24" y="38" width="6" height="12" rx="3" fill="#38bdf8" />
          <rect x="70" y="38" width="6" height="12" rx="3" fill="#38bdf8" />
          {/* Headset Mic */}
          <path d="M26 48 Q32 58 42 56" stroke="#0f172a" strokeWidth="2" fill="none" />
          <circle cx="43" cy="56" r="2.5" fill="#38bdf8" />
          {/* Warm confident smile */}
          <path d="M43 56 Q50 63 57 56" stroke="#854d0e" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="42" cy="43" r="2" fill="#0284c7" />
          <circle cx="58" cy="43" r="2" fill="#0284c7" />
        </svg>
      </div>
    );
  }

  // Default: Coach Danny
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-2xl overflow-hidden bg-[#242b38] border-2 border-[#3a4454] shadow-md flex items-center justify-center relative select-none shrink-0 ${className}`}
      title={`${mentor.name} - ${mentor.title}`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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
        <path d="M40 54 Q50 56 60 54 Q50 58 40 54 Z" fill="#4a2c1b" />
        {/* Smile */}
        <path d="M43 56 Q50 62 57 56" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Classic Thick Dark Glasses Frames */}
        <rect x="34" y="38" width="13" height="10" rx="3" stroke="#1a202c" strokeWidth="2.5" fill="#ffffff" fillOpacity="0.15" />
        <rect x="53" y="38" width="13" height="10" rx="3" stroke="#1a202c" strokeWidth="2.5" fill="#ffffff" fillOpacity="0.15" />
        <line x1="47" y1="42" x2="53" y2="42" stroke="#1a202c" strokeWidth="2.5" />
        {/* Eyes Behind Glasses */}
        <circle cx="40.5" cy="43" r="2" fill="#2d3748" />
        <circle cx="59.5" cy="43" r="2" fill="#2d3748" />
      </svg>
    </div>
  );
};
