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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="w-full max-w-4xl bg-[#211f1c] border-2 border-[#35322b] rounded-3xl shadow-[0_8px_0_0_#141311] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#262420] border-b-2 border-[#35322b] flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <span className="text-sm sm:text-lg font-black text-white truncate">
              Upgrade Your Check.mate Experience
            </span>
          </div>
          <Button
            variant="secondary"
            size="icon-sm"
            rounded="full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tiers Grid */}
        <div className="p-3.5 sm:p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.id;
            return (
              <div
                key={tier.id}
                className={`p-4 sm:p-5 rounded-3xl bg-[#282521] border-2 flex flex-col justify-between relative transition-all shadow-[0_4px_0_0_#141311] hover:-translate-y-[2px] ${
                  tier.popular ? 'border-cyan-400 shadow-[0_4px_0_0_#0891b2]' : 'border-[#383530]'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 border-2 border-cyan-300 text-black font-black text-[9px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-[0_2px_0_0_#0891b2]">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-white">{tier.name}</span>
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">
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
        <div className="px-4 sm:px-6 py-3 bg-[#181614] border-t-2 border-[#35322b] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-zinc-400 font-medium">
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
