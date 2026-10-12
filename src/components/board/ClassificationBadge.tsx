'use client';

import React from 'react';
import { MoveClassification } from '@/types/chess';

interface ClassificationBadgeProps {
  classification: MoveClassification;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CLASSIFICATION_CONFIG: Record<
  MoveClassification,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  brilliant: {
    label: '!!',
    bg: 'bg-[#1baca6]', // iconic Chess.com cyan/turquoise
    text: 'text-white',
    border: 'border-[#148c87]',
    glow: 'shadow-[0_0_10px_rgba(27,172,166,0.7)]',
  },
  great: {
    label: '!',
    bg: 'bg-[#5c8bb0]', // Chess.com blue
    text: 'text-white',
    border: 'border-[#487192]',
    glow: 'shadow-[0_0_8px_rgba(92,139,176,0.6)]',
  },
  best: {
    label: '★',
    bg: 'bg-[#81b64c]', // bright green
    text: 'text-white',
    border: 'border-[#6c9c3e]',
    glow: 'shadow-[0_0_8px_rgba(129,182,76,0.6)]',
  },
  excellent: {
    label: '✓',
    bg: 'bg-[#96bc4b]',
    text: 'text-white',
    border: 'border-[#7fa23c]',
    glow: 'shadow-sm',
  },
  good: {
    label: '✓',
    bg: 'bg-[#90928f]',
    text: 'text-white',
    border: 'border-[#737572]',
    glow: 'shadow-sm',
  },
  book: {
    label: '📖',
    bg: 'bg-[#d5a47d]',
    text: 'text-black',
    border: 'border-[#b58763]',
    glow: 'shadow-sm',
  },
  inaccuracy: {
    label: '?!',
    bg: 'bg-[#f0c15c]',
    text: 'text-black font-extrabold',
    border: 'border-[#cfa344]',
    glow: 'shadow-[0_0_8px_rgba(240,193,92,0.6)]',
  },
  mistake: {
    label: '?',
    bg: 'bg-[#e58f2a]',
    text: 'text-white font-extrabold',
    border: 'border-[#bd721a]',
    glow: 'shadow-[0_0_8px_rgba(229,143,42,0.6)]',
  },
  blunder: {
    label: '??',
    bg: 'bg-[#ca3431]',
    text: 'text-white font-black',
    border: 'border-[#a62421]',
    glow: 'shadow-[0_0_10px_rgba(202,52,49,0.8)]',
  },
  miss: {
    label: '✕',
    bg: 'bg-[#e05244]',
    text: 'text-white font-black',
    border: 'border-[#b53a2e]',
    glow: 'shadow-[0_0_8px_rgba(224,82,68,0.7)]',
  },
};

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification,
  size = 'md',
  className = '',
}) => {
  const config = CLASSIFICATION_CONFIG[classification] || CLASSIFICATION_CONFIG.good;

  const sizeClasses = {
    sm: 'w-4 h-4 text-[9px]',
    md: 'w-5 h-5 text-[10px]',
    lg: 'w-6 h-6 text-xs',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold select-none border shrink-0 transition-transform ${sizeClasses} ${config.bg} ${config.text} ${config.border} ${config.glow} ${className}`}
      title={classification.toUpperCase()}
    >
      <span>{config.label}</span>
    </div>
  );
};
