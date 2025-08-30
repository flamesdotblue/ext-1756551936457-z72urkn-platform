import React from 'react';
import Spline from '@splinetool/react-spline';

export default function HeroCover() {
  return (
    <section className="relative h-[56vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/EFlEghJH3qCmzyRi/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-[#0f0f12]" />
      <div className="relative z-10 mx-auto flex h-full max-w-[1200px] items-end px-4 pb-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">Retro Platformer 1-1</h1>
          <p className="mt-2 max-w-2xl text-white/80">Run, jump, and bop blocks in an original, nostalgic side-scroller inspired by classic platformers.</p>
        </div>
      </div>
    </section>
  );
}
