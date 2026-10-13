'use client';

import React from 'react';
import { MembershipTier } from '@/types/chess';
import { X, Check, Crown, Sparkles, Shield, Star } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#262421] border-b border-[#33302b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Crown className="w-6 h-6 text-amber-400" />
            <span className="text-lg font-black text-white">
              Upgrade Your Check.mate Experience
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#383530] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tiers Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-4 gap-4">
          {tiers.map((tier) => {
            const isCurrent = currentTier === tier.id;
            return (
              <div
                key={tier.id}
                className={`p-4 rounded-xl bg-[#262421] border flex flex-col justify-between relative transition-all ${
                  tier.accentColor
                } ${tier.popular ? 'bg-gradient-to-b from-[#2d2924] to-[#211f1c]' : ''}`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-[9px] uppercase px-2 py-0.5 rounded-full shadow">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-white">{tier.name}</span>
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase">
                      {tier.badge}
                    </span>
                  </div>
                  <div className="text-xl font-black text-white mt-2 font-mono">
                    {tier.price}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#81b64c] shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    onSelectTier(tier.id);
                    onClose();
                  }}
                  className={`mt-6 w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow ${
                    isCurrent
                      ? 'bg-zinc-700 text-zinc-300 cursor-default'
                      : tier.popular
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white'
                      : 'bg-[#81b64c] hover:bg-[#72a342] text-white'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Guarantee Footer */}
        <div className="px-6 py-3 bg-[#161512] border-t border-[#33302b] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#81b64c]" />
            <span>Switch or cancel membership anytime. 100% money-back guarantee.</span>
          </div>
          <span className="text-[11px] text-zinc-500">Official Check.mate VIP Tiers</span>
        </div>
      </div>
    </div>
  );
};
