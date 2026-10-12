'use client';

import React from 'react';
import { PieceType, PieceColor, PieceTheme } from '@/types/chess';

interface PieceIconProps {
  type: PieceType;
  color: PieceColor;
  theme?: PieceTheme;
  className?: string;
}

export const PieceIcon: React.FC<PieceIconProps> = ({
  type,
  color,
  theme = 'neo',
  className = 'w-full h-full drop-shadow-md',
}) => {
  const isWhite = color === 'w';
  
  // Custom styling tokens depending on piece color
  const fill = isWhite ? '#ffffff' : '#1e1b18';
  const stroke = isWhite ? '#1e1b18' : '#ffffff';
  const accent = isWhite ? '#e8ebed' : '#3c3732';

  // Staunton / Neo modern aesthetic vector paths
  switch (type) {
    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* King Crown & Cross */}
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8.5h5" strokeWidth="1.6" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
            <path d="M11.5 37c5.5 3.5 16.5 3.5 22 0v-4c-5.5 3-16.5 3-22 0v4z" fill={accent} />
            <path d="M12.5 30c5.5 2 14.5 2 20 0l2-8.5c-3 1.5-6.5 1-8.5-.5-1.5 2.5-5.5 2.5-7 0-2 1.5-5.5 2-8.5.5l2 8.5z" />
            <circle cx="22.5" cy="18" r="1.5" fill={isWhite ? '#f59e0b' : '#ef4444'} stroke="none" />
            <path d="M11.5 37h22v3.5h-22z" fill={accent} />
          </g>
        </svg>
      );

    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Queen Crown */}
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="12" r="2.2" />
            <circle cx="14.25" cy="9" r="2.2" />
            <circle cx="22.5" cy="8" r="2.2" />
            <circle cx="30.75" cy="9" r="2.2" />
            <circle cx="39" cy="12" r="2.2" />
            <path d="M9 26c8.5-1.5 18.5-1.5 27 0l3-12-7 6-9.5-10-9.5 10-7-6 3 12z" />
            <path d="M9 26c0 2 1.5 2 2.5 4 2.5 4 1 6.5 2 9.5 5.5 2.5 15.5 2.5 21 0 1-3-.5-5.5 2-9.5 1-2 2.5-2 2.5-4-8.5-1.5-21.5-1.5-30 0z" fill={accent} />
            <path d="M11.5 39.5h22v3h-22z" />
          </g>
        </svg>
      );

    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Rook Castle */}
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 39h27v3.5H9z" fill={accent} />
            <path d="M12 35.5h21v3.5H12z" />
            <path d="M14 29.5v6h17v-6" />
            <path d="M14 16.5l2 13h13l2-13H14z" fill={accent} />
            <path d="M11 14h23v2.5H11z" />
            <path d="M11 9h4.5v5H19V9h7v5h3.5V9H34v5H11V9z" />
          </g>
        </svg>
      );

    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Bishop Mitre */}
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="8" r="1.8" />
            <path d="M11.5 39.5h22v3h-22z" />
            <path d="M14.5 36.5c4 2 12 2 16 0v3h-16v-3z" fill={accent} />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 0-4-3-8.5-4.5-11.5-1-2-1.5-4.5-3-4.5s-2 2.5-3 4.5c-1.5 3-4.5 7.5-4.5 11.5z" />
            <path d="M25 18c-3 1.5-5 5.5-5 8.5" stroke={isWhite ? '#374151' : '#f3f4f6'} strokeWidth="1.3" />
            <path d="M17.5 26h10" stroke={stroke} strokeWidth="1.2" />
          </g>
        </svg>
      );

    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Knight Steed */}
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10c-3 0-5.5 2-6 5-.5 2.5.5 4.5-1.5 7-1.5 2-4 3.5-5 5.5-1 2.5.5 4 2 3.5 2.5-1 4.5-2 6-3 0 2 .5 4 1.5 5.5l-3 4.5h20.5c0-3.5-2.5-6.5-4-9.5-2-4-2-7 1-10.5.5-.6.5-1.5-.5-2.5-1-1-3.5-2.5-6-3.5-1.5-.5-3.5-.5-5-2z" />
            <circle cx="15.5" cy="18" r="1.5" fill={isWhite ? '#1e1b18' : '#ffffff'} stroke="none" />
            <path d="M11 39.5h23v3H11z" fill={accent} />
            <path d="M14 36c4 1.5 13 1.5 17 0v3.5H14V36z" />
          </g>
        </svg>
      );

    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Pawn */}
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="12" r="5" />
            <path d="M16 22c3-1.5 10-1.5 13 0 1.5 4 1.5 8 3 13.5H13C14.5 30 14.5 26 16 22z" fill={accent} />
            <path d="M11.5 39.5h22v3h-22z" />
            <path d="M13 35.5c4.5 2 14.5 2 19 0v4h-19v-4z" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
