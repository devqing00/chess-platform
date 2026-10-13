'use client';

import React from 'react';
import { PieceType, PieceColor, PieceTheme } from '@/types/chess';

interface PieceIconProps {
  type: PieceType;
  color: PieceColor;
  theme?: PieceTheme;
  className?: string;
}

/**
 * Authentic, pixel-perfect Staunton / Neo vector chess pieces.
 * Clean, standard proportions matching modern chess platforms:
 * - White pieces: Pristine white fills (#ffffff) with crisp dark outlines (#1b1917) and subtle interior accent strokes.
 * - Black pieces: Rich obsidian fills (#2b2724) with refined interior contour lines (#eceae6) and zero halo distortion.
 */
export const PieceIcon: React.FC<PieceIconProps> = ({
  type,
  color,
  className = 'w-full h-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]',
}) => {
  const isWhite = color === 'w';

  switch (type) {
    case 'k': // King
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#1b1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Cross finial */}
            <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" strokeWidth="1.5" />
            {/* Crown arch */}
            <path
              d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
              fill="#ffffff"
              stroke="#1b1917"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            {/* Body */}
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23 23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
              fill="#ffffff"
            />
            {/* Base rings */}
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#eceae6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Cross finial */}
            <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
            {/* Crown arch */}
            <path
              d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
              fill="#262421"
              stroke="#eceae6"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            {/* Body */}
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23 23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
              fill="#262421"
              stroke="#eceae6"
            />
            {/* Base rings */}
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#eceae6" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#1b1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Coronet Jewels */}
            <circle cx="6" cy="12" r="2" fill="#1b1917" stroke="none" />
            <circle cx="14" cy="9" r="2" fill="#1b1917" stroke="none" />
            <circle cx="22.5" cy="7.5" r="2" fill="#1b1917" stroke="none" />
            <circle cx="31" cy="9" r="2" fill="#1b1917" stroke="none" />
            <circle cx="39" cy="12" r="2" fill="#1b1917" stroke="none" />
            {/* Crown Body */}
            <path
              d="M9 26c8.5-1.5 18.5-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14l-7-11 2 12z"
              fill="#ffffff"
              strokeLinecap="butt"
            />
            {/* Base */}
            <path
              d="M9 26c0 2 1.5 2 2.5 4 2.5 4 1 5.5 2 8.5 4.5 1.5 13.5 1.5 18 0 1-3-.5-4.5 2-8.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              fill="#ffffff"
            />
            <path d="M11 38.5a35 35 0 0 0 23 0" fill="none" stroke="#1b1917" />
            <path d="M11 29a35 35 0 0 0 23 0m-21.5 3a35 35 0 0 0 20 0m-19 3a35 35 0 0 0 18 0" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#eceae6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Coronet Jewels */}
            <circle cx="6" cy="12" r="2" fill="#eceae6" stroke="none" />
            <circle cx="14" cy="9" r="2" fill="#eceae6" stroke="none" />
            <circle cx="22.5" cy="7.5" r="2" fill="#eceae6" stroke="none" />
            <circle cx="31" cy="9" r="2" fill="#eceae6" stroke="none" />
            <circle cx="39" cy="12" r="2" fill="#eceae6" stroke="none" />
            {/* Crown Body */}
            <path
              d="M9 26c8.5-1.5 18.5-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14l-7-11 2 12z"
              fill="#262421"
              strokeLinecap="butt"
            />
            {/* Base */}
            <path
              d="M9 26c0 2 1.5 2 2.5 4 2.5 4 1 5.5 2 8.5 4.5 1.5 13.5 1.5 18 0 1-3-.5-4.5 2-8.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              fill="#262421"
            />
            <path d="M11 38.5a35 35 0 0 0 23 0" fill="none" stroke="#eceae6" />
            <path d="M11 29a35 35 0 0 0 23 0m-21.5 3a35 35 0 0 0 20 0m-19 3a35 35 0 0 0 18 0" stroke="#eceae6" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#1b1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Crenellations & Tower */}
            <path
              d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14zm-3-13.5h23v-5h-3.5v2h-4v-2h-8v2h-4v-2H11v5z"
              fill="#ffffff"
            />
            <path d="M12 36v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14z" />
            <path d="M14 29.5a18 18 0 0 0 17 0m-16-5a18 18 0 0 0 15 0" stroke="#1b1917" />
            <path d="M9 39h27v-3H9v3zm0-20.5h27" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#eceae6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14zm-3-13.5h23v-5h-3.5v2h-4v-2h-8v2h-4v-2H11v5z"
              fill="#262421"
              stroke="#eceae6"
            />
            <path d="M12 36v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14z" stroke="#eceae6" />
            <path d="M14 29.5a18 18 0 0 0 17 0m-16-5a18 18 0 0 0 15 0" stroke="#eceae6" />
            <path d="M9 39h27v-3H9v3zm0-20.5h27" stroke="#eceae6" />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#1b1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Top finial ball */}
            <circle cx="22.5" cy="8.5" r="2" fill="#ffffff" stroke="#1b1917" />
            {/* Base plinth */}
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill="#ffffff"
            />
            {/* Mitre body */}
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill="#ffffff"
            />
            {/* Slit & cross details */}
            <path d="M17.5 26h10M15 30h15m-7.5-14v5m-2.5-2.5h5" stroke="#1b1917" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#eceae6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="8.5" r="2" fill="#262421" stroke="#eceae6" />
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill="#262421"
              stroke="#eceae6"
            />
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill="#262421"
              stroke="#eceae6"
            />
            <path d="M17.5 26h10M15 30h15m-7.5-14v5m-2.5-2.5h5" stroke="#eceae6" />
          </g>
        </svg>
      );

    case 'n': // Knight (Standard Staunton Vector Shape)
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#1b1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Knight Silhouette */}
            <path
              d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
              fill="#ffffff"
            />
            {/* Mane & Snout Curve */}
            <path
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.163-.377-2.705.5-4 1.37-2.05 4.54-3.53 4.5-5.5-.04-1.97-4.48-1.5-5.5-4-1-2.5 1.5-4 3-5 3.5-2.5 7.5-.5 10.5 5.5z"
              fill="#ffffff"
            />
            {/* Eye */}
            <circle cx="15.5" cy="18" r="1.5" fill="#1b1917" stroke="none" />
            {/* Nostril */}
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill="#1b1917" stroke="#1b1917" />
            {/* Mane Accent */}
            <path d="M24.5 14c2.5.5 4 2 4 4m-3.5-7c3 1 5 3.5 5 7" stroke="#1b1917" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#eceae6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {/* Knight Silhouette */}
            <path
              d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
              fill="#262421"
              stroke="#eceae6"
            />
            {/* Mane & Snout Curve */}
            <path
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.163-.377-2.705.5-4 1.37-2.05 4.54-3.53 4.5-5.5-.04-1.97-4.48-1.5-5.5-4-1-2.5 1.5-4 3-5 3.5-2.5 7.5-.5 10.5 5.5z"
              fill="#262421"
              stroke="#eceae6"
            />
            {/* Eye */}
            <circle cx="15.5" cy="18" r="1.5" fill="#eceae6" stroke="none" />
            {/* Nostril */}
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill="#eceae6" stroke="#eceae6" />
            {/* Mane Accent */}
            <path d="M24.5 14c2.5.5 4 2 4 4m-3.5-7c3 1 5 3.5 5 7" stroke="#eceae6" />
          </g>
        </svg>
      );

    case 'p': // Pawn
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#1b1917" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
              fill="#ffffff"
            />
            <path d="M12 36a25 25 0 0 0 21 0" stroke="#1b1917" />
            <path d="M15 27a18 18 0 0 0 15 0" stroke="#1b1917" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#eceae6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
              fill="#262421"
              stroke="#eceae6"
            />
            <path d="M12 36a25 25 0 0 0 21 0" stroke="#eceae6" />
            <path d="M15 27a18 18 0 0 0 15 0" stroke="#eceae6" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
