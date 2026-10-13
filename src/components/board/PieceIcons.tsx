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
 * Authentic, pixel-perfect Staunton / Neo vector pieces used across modern chess platforms.
 * Features crisp dark contours, refined cross hatches, internal highlights, and elegant gradients.
 */
export const PieceIcon: React.FC<PieceIconProps> = ({
  type,
  color,
  className = 'w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]',
}) => {
  const isWhite = color === 'w';

  switch (type) {
    case 'k': // King
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" strokeWidth="1.5" />
            <path
              d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
              fill="#fff"
              stroke="#000"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23 23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
              fill="#fff"
            />
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
            <circle cx="22.5" cy="22.5" r="2.5" fill="#f59e0b" stroke="#000" strokeWidth="1" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" stroke="#fff" strokeLinejoin="miter" />
            <path
              d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
              fill="#22201d"
              stroke="#fff"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23 23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
              fill="#22201d"
              stroke="#fff"
            />
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff" />
            <circle cx="22.5" cy="22.5" r="2.5" fill="#ef4444" stroke="#fff" strokeWidth="1" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="#000" stroke="none" />
            <path
              d="M9 26c8.5-1.5 18.5-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14l-7-11 2 12z"
              fill="#fff"
              strokeLinecap="butt"
            />
            <path
              d="M9 26c0 2 1.5 2 2.5 4 2.5 4 1 5.5 2 8.5 4.5 1.5 13.5 1.5 18 0 1-3-.5-4.5 2-8.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              fill="#fff"
            />
            <path d="M11 38.5a35 35 0 0 0 23 0" fill="none" stroke="#000" />
            <path d="M11 29a35 35 0 0 0 23 0m-21.5 3a35 35 0 0 0 20 0m-19 3a35 35 0 0 0 18 0" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" fill="#fff" stroke="none" />
            <path
              d="M9 26c8.5-1.5 18.5-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15L14 11v14l-7-11 2 12z"
              fill="#22201d"
              stroke="#fff"
              strokeLinecap="butt"
            />
            <path
              d="M9 26c0 2 1.5 2 2.5 4 2.5 4 1 5.5 2 8.5 4.5 1.5 13.5 1.5 18 0 1-3-.5-4.5 2-8.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              fill="#22201d"
              stroke="#fff"
            />
            <path d="M11 38.5a35 35 0 0 0 23 0" fill="none" stroke="#fff" />
            <path d="M11 29a35 35 0 0 0 23 0m-21.5 3a35 35 0 0 0 20 0m-19 3a35 35 0 0 0 18 0" stroke="#fff" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14zm-3-13.5h23v-5h-3.5v2h-4v-2h-8v2h-4v-2H11v5z"
              fill="#fff"
            />
            <path d="M12 36v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14z" />
            <path d="M14 29.5a18 18 0 0 0 17 0m-16-5a18 18 0 0 0 15 0" stroke="#000" />
            <path d="M9 39h27v-3H9v3zm0-20.5h27" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14zm-3-13.5h23v-5h-3.5v2h-4v-2h-8v2h-4v-2H11v5z"
              fill="#22201d"
              stroke="#fff"
            />
            <path d="M12 36v-4h21v4H12zm2-4.5l1.5-12.5h14l1.5 12.5H14z" stroke="#fff" />
            <path d="M14 29.5a18 18 0 0 0 17 0m-16-5a18 18 0 0 0 15 0" stroke="#fff" />
            <path d="M9 39h27v-3H9v3zm0-20.5h27" stroke="#fff" />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="8.5" r="2" fill="#fff" />
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill="#fff"
            />
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill="#fff"
            />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
            <path d="M17.5 26h10M15 30h15m-7.5-14v5m-2.5-2.5h5" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="8.5" r="2" fill="#22201d" stroke="#fff" />
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill="#22201d"
              stroke="#fff"
            />
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill="#22201d"
              stroke="#fff"
            />
            <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" stroke="#fff" />
            <path d="M17.5 26h10M15 30h15m-7.5-14v5m-2.5-2.5h5" stroke="#fff" />
          </g>
        </svg>
      );

    case 'n': // Knight
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
              fill="#fff"
            />
            <path
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.163-.377-2.705.5-4 1.37-2.05 4.54-3.53 4.5-5.5-.04-1.97-4.48-1.5-5.5-4-1-2.5 1.5-4 3-5 3.5-2.5 7.5-.5 10.5 5.5z"
              fill="#fff"
            />
            <circle cx="15.5" cy="18" r="1.5" fill="#000" stroke="none" />
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill="#000" stroke="#000" />
            <path d="M24 18c1.5 1 4 0 4-2s-2.5-2-4-2" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
              fill="#22201d"
              stroke="#fff"
            />
            <path
              d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.163-.377-2.705.5-4 1.37-2.05 4.54-3.53 4.5-5.5-.04-1.97-4.48-1.5-5.5-4-1-2.5 1.5-4 3-5 3.5-2.5 7.5-.5 10.5 5.5z"
              fill="#22201d"
              stroke="#fff"
            />
            <circle cx="15.5" cy="18" r="1.5" fill="#fff" stroke="none" />
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" fill="#fff" stroke="#fff" />
            <path d="M24 18c1.5 1 4 0 4-2s-2.5-2-4-2" stroke="#fff" />
          </g>
        </svg>
      );

    case 'p': // Pawn
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
              fill="#fff"
            />
            <path d="M12 36a25 25 0 0 0 21 0" />
            <path d="M15 27a18 18 0 0 0 15 0" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M22 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38-1.95 1.12-3.28 3.21-3.28 5.62 0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
              fill="#22201d"
              stroke="#fff"
            />
            <path d="M12 36a25 25 0 0 0 21 0" stroke="#fff" />
            <path d="M15 27a18 18 0 0 0 15 0" stroke="#fff" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
