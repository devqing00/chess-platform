'use client';

import React from 'react';
import { MembershipTier } from '@/types/chess';
import { X, Check, Crown, Sparkles, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: MembershipTier;
  onSelectTier: (tier: MembershipTier) => void;
}

export const MembershipModal: React.FC<MembershipModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectTier,
}) => {
  if (!isOpen) return null;

  const tiers: {
    id: MembershipTier;
    name: string;
    badge: string;
    price: string;
    popular?: boolean;
    features: string[];
    accentColor: string;
  }[] = [
    {
      id: 'free',
      name: 'Basic',
      badge: 'Free Tier',
      price: '$0 / mo',
      features: [
        'Unlimited live & daily games',
        '3 Tactical Puzzles per day',
        '1 Game Review per day',
        '20+ Beginner computer bots',
        'Introductory chess lessons',
      ],
      accentColor: 'border-[#383530]',
    },
    {
      id: 'gold',
      name: 'Gold',
      badge: 'Casual Player',
      price: '$4.99 / mo',
      features: [
        'Completely Ad-Free interface',
        'Unlimited Puzzles & Puzzle Rush',
        'Full Video & Lesson library',
        'Full Opening Explorer database',
        '100+ Computer Bot personalities',
      ],
      accentColor: 'border-amber-500/50',
    },
    {
      id: 'platinum',
      name: 'Platinum',
      badge: 'Club Competitor',
      price: '$7.99 / mo',
      features: [
        'All features in Gold tier',
        'Unlimited Game Review & deep engine analysis',
        'Multi-tournament management (up to 100 concurrent)',
        '30 Days Vacation Protection',
        'Exclusive Platinum profile flair badge',
      ],
      accentColor: 'border-slate-400/60',
    },
    {
      id: 'diamond',
      name: 'Diamond',
      badge: 'Master Suite',
      price: '$12.99 / mo',
      popular: true,
      features: [
        'All features in Platinum tier',
        'AI Coach Explanations (Every move natural language commentary)',
        'Full Insights Engine & performance telemetry',
        'Advanced Analysis: Brilliant (!!) & Great (!) classification',
        'Full access to all Grandmaster bots',
      ],
      accentColor: 'border-cyan-400/80 shadow-cyan-500/20 shadow-xl',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 pt-safe pb-safe select-none">
      <div className="w-full max-w-4xl bg-[#1c1a17] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh] my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-[#161512] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <span className="text-sm sm:text-base font-black text-white truncate">
              Upgrade Your Check.mate Experience
            </span>
          </div>
          <Button
            variant="secondary"
            size="icon-sm"
            rounded="full"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tiers Grid */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.id;
            return (
              <div
                key={tier.id}
                className={`p-4 sm:p-5 rounded-xl border flex flex-col justify-between relative transition-all active:scale-[0.98] ${
                  tier.popular
                    ? 'bg-[#212427] border-cyan-500/40 shadow-sm'
                    : 'bg-[#24221f] border-white/10 hover:border-white/20'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-zinc-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-white">{tier.name}</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      {tier.badge}
                    </span>
                  </div>
                  <div className="text-xl font-black text-white mt-2 font-mono">
                    {tier.price}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight font-medium">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 sm:mt-6">
                  <Button
                    variant={isCurrent ? 'secondary' : tier.popular ? 'blue' : 'primary'}
                    size="md"
                    rounded="full"
                    fullWidth
                    disabled={isCurrent}
                    onClick={() => {
                      onSelectTier(tier.id);
                      onClose();
                    }}
                  >
                    <span>{isCurrent ? 'Current Plan' : 'Select Plan'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guarantee Footer */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#161512] border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-zinc-400 font-medium shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Switch or cancel membership anytime. 100% money-back guarantee.</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Official Check.mate VIP Tiers</span>
        </div>
      </div>
    </div>
  );
};
