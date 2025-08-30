import React from 'react';
import HeroCover from './components/HeroCover';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import ControlsHelp from './components/ControlsHelp';

export default function App() {
  const [hudState, setHudState] = React.useState({ score: 0, coins: 0, time: 400, world: '1-1', lives: 3, status: 'PLAY' });

  return (
    <div className="min-h-screen w-full bg-[#0f0f12] text-white">
      <HeroCover />
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-zinc-950/60 shadow-xl overflow-hidden my-8">
          <HUD {...hudState} />
          <GameCanvas onHUDChange={setHudState} />
        </div>
        <ControlsHelp />
      </div>
      <footer className="py-8 text-center text-sm text-white/60">Built with React, Canvas, and a sprinkle of retro love. All art here is original in style and not affiliated with Nintendo.</footer>
    </div>
  );
}
