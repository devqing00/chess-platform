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
 * Authentic Chess.com Neo vector chess pieces.
 * 100% faithful replication of the iconic Chess.com piece set:
 * - Pure, luminous white pieces (#ffffff) with crisp charcoal perimeter contours (#262421)
 * - Rich warm charcoal slate black pieces (#44413c) with deep dark perimeter (#1c1a18)
 * - Clean interior detail lines defining crowns, crenellations, mitres, and horses.
 */
export const PieceIcon: React.FC<PieceIconProps> = ({
  type,
  color,
  className = 'w-full h-full drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.22)]',
}) => {
  const isWhite = color === 'w';

  // White pieces: Pure, luminous white with crisp dark charcoal contour
  const whiteFill = '#ffffff';
  const whiteStroke = '#262421';

  // Black pieces: Authentic Chess.com Neo rich warm graphite/charcoal slate with deep dark perimeter
  const blackFill = '#44413c';
  const blackStroke = '#1c1a18';
  const blackInnerLine = '#252320';

  switch (type) {
    case 'k': // King
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={whiteStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Cross finial */}
            <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" strokeWidth="1.75" />
            {/* Crown arch */}
            <path
              d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
              fill={whiteFill}
              stroke={whiteStroke}
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            {/* Body */}
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23 23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
              fill={whiteFill}
              stroke={whiteStroke}
            />
            {/* Base rings */}
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke={whiteStroke} strokeWidth="1.5" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={blackStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Cross finial */}
            <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" strokeWidth="1.75" />
            {/* Crown arch */}
            <path
              d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
              fill={blackFill}
              stroke={blackStroke}
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
            {/* Body */}
            <path
              d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23 23.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z"
              fill={blackFill}
              stroke={blackStroke}
            />
            {/* Base rings with clean interior contour lines */}
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke={blackInnerLine} strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'q': // Queen
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={whiteFill} fillRule="evenodd" stroke={whiteStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Coronet Jewels */}
            <circle cx="6" cy="12" r="2.75" />
            <circle cx="14" cy="9" r="2.75" />
            <circle cx="22.5" cy="8" r="2.75" />
            <circle cx="31" cy="9" r="2.75" />
            <circle cx="39" cy="12" r="2.75" />
            {/* Crown Peaks */}
            <path
              d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"
              strokeLinecap="butt"
            />
            {/* Base & Flared Pedestal */}
            <path
              d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              strokeLinecap="butt"
            />
            {/* Waist accent rings */}
            <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" strokeWidth="1.5" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={blackFill} fillRule="evenodd" stroke={blackStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="12" r="2.75" />
            <circle cx="14" cy="9" r="2.75" />
            <circle cx="22.5" cy="8" r="2.75" />
            <circle cx="31" cy="9" r="2.75" />
            <circle cx="39" cy="12" r="2.75" />
            <path
              d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"
              strokeLinecap="butt"
            />
            <path
              d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
              strokeLinecap="butt"
            />
            <path d="M11 38.5a35 35 1 0 0 23 0" fill="none" strokeLinecap="butt" stroke={blackInnerLine} strokeWidth="1.4" />
            <path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke={blackInnerLine} strokeWidth="1.4" />
          </g>
        </svg>
      );

    case 'r': // Rook
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={whiteFill} fillRule="evenodd" stroke={whiteStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Base plinth */}
            <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12z" />
            {/* Battlement crenellations */}
            <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt" />
            {/* Cornice bevel */}
            <path d="M34 14l-3 3H14l-3-3" />
            {/* Tower shaft */}
            <path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter" />
            {/* Base bevel */}
            <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
            <path d="M11 14h23" fill="none" strokeLinejoin="miter" strokeWidth="1.5" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={blackFill} fillRule="evenodd" stroke={blackStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Base plinth */}
            <path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" strokeLinecap="butt" />
            {/* Tower shaft */}
            <path d="M14 29.5v-13h17v13H14z" strokeLinecap="butt" strokeLinejoin="miter" />
            {/* Battlements & Cornice */}
            <path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" strokeLinecap="butt" />
            {/* Contour accents */}
            <path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke={blackInnerLine} strokeWidth="1.4" strokeLinejoin="miter" />
          </g>
        </svg>
      );

    case 'b': // Bishop
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={whiteStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Top finial ball */}
            <circle cx="22.5" cy="8.5" r="2" fill={whiteFill} stroke={whiteStroke} />
            {/* Base plinth */}
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill={whiteFill}
              stroke={whiteStroke}
            />
            {/* Mitre body */}
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill={whiteFill}
              stroke={whiteStroke}
            />
            {/* Diagonal cleft & cross details */}
            <path d="M17.5 26h10M15 30h15m-7.5-14v5m-2.5-2.5h5" stroke={whiteStroke} strokeWidth="1.5" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={blackStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="8.5" r="2" fill={blackFill} stroke={blackStroke} />
            <path
              d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
              fill={blackFill}
              stroke={blackStroke}
            />
            <path
              d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
              fill={blackFill}
              stroke={blackStroke}
            />
            <path d="M17.5 26h10M15 30h15m-7.5-14v5m-2.5-2.5h5" stroke={blackInnerLine} strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'n': // Knight (Iconic Chess.com Neo Horse from Image 2)
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={whiteStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Body and arched neck */}
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill={whiteFill} stroke={whiteStroke} />
            {/* Head, snout, ears, and chest */}
            <path
              d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
              fill={whiteFill}
              stroke={whiteStroke}
            />
            {/* Nostril */}
            <circle cx="9.5" cy="25.5" r="0.75" fill={whiteStroke} stroke={whiteStroke} />
            {/* Slanted eye */}
            <path
              d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
              transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
              fill={whiteStroke}
              stroke={whiteStroke}
            />
            {/* Arched mane contour */}
            <path
              d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39"
              stroke={whiteStroke}
              strokeWidth="1.5"
              fill="none"
            />
            {/* Jaw contour line */}
            <path d="M 22,18 C 21,22 17,26 15,28" stroke={whiteStroke} strokeWidth="1.4" fill="none" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd" stroke={blackStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Body and arched neck */}
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill={blackFill} stroke={blackStroke} />
            {/* Head, snout, ears, and chest */}
            <path
              d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
              fill={blackFill}
              stroke={blackStroke}
            />
            {/* Nostril */}
            <circle cx="9.5" cy="25.5" r="0.75" fill={blackStroke} stroke={blackStroke} />
            {/* Slanted eye */}
            <path
              d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
              transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
              fill={blackStroke}
              stroke={blackStroke}
            />
            {/* Arched mane line */}
            <path
              d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39"
              stroke={blackInnerLine}
              strokeWidth="1.5"
              fill="none"
            />
            {/* Jaw contour line */}
            <path d="M 22,18 C 21,22 17,26 15,28" stroke={blackInnerLine} strokeWidth="1.4" fill="none" />
          </g>
        </svg>
      );

    case 'p': // Pawn
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={whiteFill} fillRule="evenodd" stroke={whiteStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Pawn body */}
            <path
              d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            />
            {/* Base collar line */}
            <path d="M12 37.5c5.5-2 15.5-2 21 0" fill="none" stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={blackFill} fillRule="evenodd" stroke={blackStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            {/* Pawn body */}
            <path
              d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            />
            {/* Base contour */}
            <path d="M12 37.5c5.5-2 15.5-2 21 0" fill="none" stroke={blackInnerLine} strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
