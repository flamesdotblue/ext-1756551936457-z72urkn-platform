import React from 'react';

export default function ControlsHelp() {
  return (
    <div className="mx-auto max-w-[1200px] py-2 pb-8">
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-sm text-white/80">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-white">Controls:</span>
          <span>Left/Right: Arrow keys or A/D</span>
          <span>Jump: Space or Z</span>
          <span>Run: Shift</span>
          <span>Pause: P</span>
          <span>Restart: R</span>
        </div>
      </div>
    </div>
  );
}
