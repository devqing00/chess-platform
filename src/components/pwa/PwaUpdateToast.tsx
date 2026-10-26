'use client';

import React from 'react';
import { RotateCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface PwaUpdateToastProps {
  isUpdating: boolean;
  updateAvailable: boolean;
  onApplyUpdate: () => void;
}

export const PwaUpdateToast: React.FC<PwaUpdateToastProps> = ({
  isUpdating,
  updateAvailable,
  onApplyUpdate,
}) => {
  if (!isUpdating && !updateAvailable) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[calc(100vw-32px)] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#1c1a17]/95 backdrop-blur-md border border-emerald-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-zinc-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            {isUpdating ? (
              <RotateCw className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-white flex items-center gap-1.5 truncate">
              <span>{isUpdating ? 'Updating Check·mate...' : 'New Update Ready'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              {isUpdating
                ? 'Reloading with latest improvements...'
                : 'Auto-refreshing to apply changes...'}
            </span>
          </div>
        </div>

        {updateAvailable && !isUpdating && (
          <button
            type="button"
            onClick={onApplyUpdate}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#8fd649] to-[#699c30] text-zinc-950 font-black text-xs hover:brightness-105 active:scale-95 shadow-[0_2px_0_0_#385a16] transition cursor-pointer shrink-0"
          >
            Update Now
          </button>
        )}
      </div>
    </div>
  );
};
