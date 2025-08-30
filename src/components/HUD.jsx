import React from 'react';

export default function HUD({ score, coins, time, world, lives, status }) {
  return (
    <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 text-[13px] font-mono">
      <div className="flex gap-6">
        <div>
          <div className="text-white/60">SCORE</div>
          <div className="tabular-nums text-lg">{String(score).padStart(6, '0')}</div>
        </div>
        <div>
          <div className="text-white/60">COINS</div>
          <div className="tabular-nums text-lg">{String(coins).padStart(2, '0')}</div>
        </div>
      </div>
      <div className="hidden md:block">
        <div className="text-white/60">WORLD</div>
        <div className="tabular-nums text-lg">{world}</div>
      </div>
      <div className="flex gap-6">
        <div>
          <div className="text-white/60">LIVES</div>
          <div className="tabular-nums text-lg">{lives}</div>
        </div>
        <div>
          <div className="text-white/60">TIME</div>
          <div className={`tabular-nums text-lg ${time <= 60 ? 'text-amber-300' : ''}`}>{String(Math.max(0, Math.floor(time))).padStart(3, '0')}</div>
        </div>
      </div>
      {status !== 'PLAY' && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center">
          <div className="rounded-xl border border-white/15 bg-zinc-900/70 px-6 py-5 backdrop-blur">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">{status === 'WIN' ? 'You reached the flag!' : status === 'DEAD' ? 'Game Over' : 'Paused'}</div>
              <div className="text-white/70 mb-4">Press R to restart, P to pause.</div>
              <div className="text-xs text-white/50">Original gameplay feel, original art. Not affiliated with Nintendo.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
