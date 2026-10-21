'use client';

import React, { useState } from 'react';

/**
 * PixelCatWorkspace
 * A 3D isometric pixel-art animated cat working diligently on a computer.
 * Features visible alternating paw typing animations, keypress impact particles,
 * blinking eyes, ear twitches, wagging tail, glowing terminal screen, and interactive meows.
 */
export function PixelCatWorkspace() {
  const [clickCount, setClickCount] = useState(0);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [turbo, setTurbo] = useState(false);

  const quotes = [
    'Deploying to production! 🚀',
    'Purr-fectly compiled! ✨',
    'Reviewing leave requests... 📋',
    '240 WPM! High productivity! ⚡',
    'Catching bugs like mice! 🐭',
    'Docworm AI online! 🐾',
  ];

  const handleClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    const quote = quotes[nextCount % quotes.length];
    setBubbleText(quote);
    setTurbo(true);
    setTimeout(() => setTurbo(false), 2200);
    setTimeout(() => {
      setBubbleText((curr) => (curr === quote ? null : curr));
    }, 2600);
  };

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[310px] mx-auto select-none mt-4">
      {/* Speech Bubble */}
      {bubbleText && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 animate-bounce bg-white text-slate-900 text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-blue-200 whitespace-nowrap flex items-center gap-1.5 pointer-events-none">
          <span>{bubbleText}</span>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-blue-200 rotate-45" />
        </div>
      )}

      {/* SVG Canvas for Isometric 3D Pixel Scene */}
      <div
        onClick={handleClick}
        className="cursor-pointer group relative p-1 rounded-2xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
        title="Click the cat to encourage her!"
      >
        <svg
          viewBox="0 0 300 220"
          className="w-full h-auto drop-shadow-md overflow-visible"
          style={{ imageRendering: 'pixelated' }}
        >
          <defs>
            {/* Screen glow gradient */}
            <radialGradient id="screenGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#0284C7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </radialGradient>

            {/* Laptop screen ambient light */}
            <linearGradient id="laptopScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>

            {/* Wood desk gradient */}
            <linearGradient id="deskTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            {/* Screen clip path */}
            <clipPath id="screenClip">
              <polygon points="102,118 178,118 173,161 107,161" />
            </clipPath>

            <style>{`
              @keyframes leftPawType {
                0%   { transform: translateY(0px) rotate(0deg); }
                50%  { transform: translateY(7px) rotate(-3deg); }
                100% { transform: translateY(0px) rotate(0deg); }
              }
              @keyframes rightPawType {
                0%   { transform: translateY(7px) rotate(3deg); }
                50%  { transform: translateY(0px) rotate(0deg); }
                100% { transform: translateY(7px) rotate(3deg); }
              }
              @keyframes catBlink {
                0%, 90%, 100% { transform: scaleY(1); }
                95%           { transform: scaleY(0.1); }
              }
              @keyframes tailSway {
                0%   { transform: rotate(0deg); }
                50%  { transform: rotate(-14deg); }
                100% { transform: rotate(0deg); }
              }
              @keyframes earTwitchLeft {
                0%, 80%, 100% { transform: rotate(0deg); }
                85%           { transform: rotate(-8deg); }
                90%           { transform: rotate(4deg); }
              }
              @keyframes earTwitchRight {
                0%, 75%, 100% { transform: rotate(0deg); }
                80%           { transform: rotate(8deg); }
                85%           { transform: rotate(-4deg); }
              }
              @keyframes headNod {
                0%   { transform: translateY(0px); }
                50%  { transform: translateY(1.5px); }
                100% { transform: translateY(0px); }
              }
              @keyframes codeScroll {
                0%   { transform: translateY(0px); }
                100% { transform: translateY(-16px); }
              }
              @keyframes sparkFly1 {
                0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
                40%  { opacity: 1; transform: translate(-4px, -8px) scale(1.1); }
                100% { opacity: 0; transform: translate(-8px, -16px) scale(0.4); }
              }
              @keyframes sparkFly2 {
                0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
                40%  { opacity: 1; transform: translate(4px, -9px) scale(1.1); }
                100% { opacity: 0; transform: translate(9px, -18px) scale(0.4); }
              }
              @keyframes steamRise {
                0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
                50%  { opacity: 0.8; transform: translateY(-6px) scale(1); }
                100% { opacity: 0; transform: translateY(-14px) scale(1.2); }
              }

              .anim-left-paw {
                animation: leftPawType ${turbo ? '0.12s' : '0.22s'} ease-in-out infinite;
                transform-origin: 122px 138px;
              }
              .anim-right-paw {
                animation: rightPawType ${turbo ? '0.12s' : '0.22s'} ease-in-out infinite;
                transform-origin: 156px 138px;
              }
              .anim-blink {
                animation: catBlink 3.6s infinite;
                transform-origin: 140px 98px;
              }
              .anim-tail {
                animation: tailSway 2.4s ease-in-out infinite;
                transform-origin: 94px 156px;
              }
              .anim-ear-left {
                animation: earTwitchLeft 4.2s ease-in-out infinite;
                transform-origin: 122px 76px;
              }
              .anim-ear-right {
                animation: earTwitchRight 3.8s ease-in-out infinite;
                transform-origin: 158px 76px;
              }
              .anim-head {
                animation: headNod ${turbo ? '0.12s' : '0.44s'} ease-in-out infinite;
              }
              .anim-code {
                animation: codeScroll 1.8s linear infinite;
              }
              .anim-spark-1 {
                animation: sparkFly1 ${turbo ? '0.25s' : '0.45s'} ease-out infinite;
              }
              .anim-spark-2 {
                animation: sparkFly2 ${turbo ? '0.22s' : '0.42s'} ease-out infinite 0.2s;
              }
              .anim-steam {
                animation: steamRise 2s ease-out infinite;
              }
            `}</style>
          </defs>

          {/* 1. Floor Shadow */}
          <ellipse cx="150" cy="198" rx="100" ry="14" fill="#0b172a" opacity="0.45" />

          {/* 2. Office Chair Behind Cat */}
          <g id="chair">
            {/* Chair Back Cushion (Isometric) */}
            <rect x="110" y="76" width="60" height="70" rx="8" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <rect x="116" y="82" width="48" height="58" rx="6" fill="#334155" />
            {/* Chair Headrest */}
            <rect x="120" y="62" width="40" height="16" rx="4" fill="#1E293B" />
          </g>

          {/* 3. Cat Tail */}
          <g id="tail" className="anim-tail">
            {/* Pixelated Tail segments curve upward */}
            <rect x="88" y="148" width="10" height="8" rx="2" fill="#D97706" />
            <rect x="82" y="142" width="10" height="8" rx="2" fill="#D97706" />
            <rect x="76" y="134" width="10" height="10" rx="2" fill="#F59E0B" />
            <rect x="74" y="124" width="10" height="12" rx="2" fill="#F59E0B" />
            <rect x="76" y="116" width="10" height="10" rx="2" fill="#FEF3C7" /> {/* White tip */}
            <rect x="82" y="112" width="8" height="8" rx="2" fill="#FEF3C7" />
          </g>

          {/* 4. Cat Body (Sitting behind desk) */}
          <g id="cat-body">
            {/* Torso */}
            <path
              d="M 112 118 C 112 110, 168 110, 168 118 L 174 158 C 174 162, 106 162, 106 158 Z"
              fill="#D97706"
              stroke="#B45309"
              strokeWidth="2"
            />
            {/* Cute Calico/Ginger Back & Shoulder Patches */}
            <path
              d="M 120 120 Q 140 126 160 120 L 164 148 Q 140 152 116 148 Z"
              fill="#F59E0B"
            />
            {/* Fluffy White Chest/Bib */}
            <ellipse cx="140" cy="138" rx="14" ry="16" fill="#FEF3C7" />
            <ellipse cx="140" cy="138" rx="10" ry="12" fill="#FFFFFF" />
          </g>

          {/* 5. Cat Head & Ears (with subtle head-nod animation) */}
          <g id="cat-head" className="anim-head">
            {/* Left Ear */}
            <g className="anim-ear-left">
              <polygon points="116,84 104,56 128,68" fill="#D97706" stroke="#B45309" strokeWidth="2" />
              <polygon points="117,80 110,63 125,72" fill="#FDA4AF" /> {/* Pink inner */}
            </g>

            {/* Right Ear */}
            <g className="anim-ear-right">
              <polygon points="164,84 176,56 152,68" fill="#D97706" stroke="#B45309" strokeWidth="2" />
              <polygon points="163,80 170,63 155,72" fill="#FDA4AF" /> {/* Pink inner */}
            </g>

            {/* Main Rounded Head */}
            <rect
              x="110"
              y="70"
              width="60"
              height="44"
              rx="14"
              fill="#F59E0B"
              stroke="#B45309"
              strokeWidth="2"
            />

            {/* Top Head Highlight / Striping */}
            <path d="M 132 70 L 148 70 L 144 80 L 136 80 Z" fill="#D97706" />
            <path d="M 124 71 L 130 71 L 128 78 L 123 78 Z" fill="#D97706" />
            <path d="M 150 71 L 156 71 L 157 78 L 152 78 Z" fill="#D97706" />

            {/* Cheeks / White Muzzle */}
            <ellipse cx="134" cy="101" rx="8" ry="6" fill="#FEF3C7" />
            <ellipse cx="146" cy="101" rx="8" ry="6" fill="#FEF3C7" />

            {/* Tiny Pink Nose */}
            <polygon points="140,97 137,94 143,94" fill="#F43F5E" />

            {/* Cute Cat Mouth (:3) */}
            <path
              d="M 135 101 Q 138 104 140 101 Q 142 104 145 101"
              fill="none"
              stroke="#B45309"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Blinking Anime / Pixel Eyes */}
            <g id="eyes" className="anim-blink">
              {/* Left Eye */}
              <rect x="122" y="86" width="8" height="9" rx="3" fill="#0F172A" />
              <rect x="123" y="87" width="3" height="3" fill="#FFFFFF" /> {/* Sparkle */}
              <rect x="126" y="91" width="2" height="2" fill="#38BDF8" /> {/* Blue Iris */}

              {/* Right Eye */}
              <rect x="150" y="86" width="8" height="9" rx="3" fill="#0F172A" />
              <rect x="151" y="87" width="3" height="3" fill="#FFFFFF" /> {/* Sparkle */}
              <rect x="154" y="91" width="2" height="2" fill="#38BDF8" /> {/* Blue Iris */}
            </g>

            {/* Whiskers */}
            <line x1="104" y1="96" x2="116" y2="98" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="103" y1="102" x2="116" y2="102" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="164" y1="98" x2="176" y2="96" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="164" y1="102" x2="177" y2="102" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />

            {/* Blush Cheeks */}
            <circle cx="118" cy="98" r="3.5" fill="#FDA4AF" opacity="0.6" />
            <circle cx="162" cy="98" r="3.5" fill="#FDA4AF" opacity="0.6" />
          </g>

          {/* 6. Isometric Desk (3D Blocks) */}
          <g id="desk">
            {/* Desk Top Surface (Isometric Rhomboid) */}
            <polygon
              points="60,154 240,154 266,182 34,182"
              fill="url(#deskTop)"
              stroke="#78350F"
              strokeWidth="2"
            />
            {/* Desk Front Edge Depth */}
            <polygon
              points="34,182 266,182 266,192 34,192"
              fill="#78350F"
            />
            {/* Desk Front Corner Highlights */}
            <line x1="34" y1="182" x2="266" y2="182" stroke="#FDE68A" strokeWidth="1.5" opacity="0.4" />

            {/* Desk Legs */}
            <rect x="42" y="192" width="10" height="18" fill="#451A03" />
            <rect x="248" y="192" width="10" height="18" fill="#451A03" />
          </g>

          {/* 7. Desk Accessories */}
          <g id="accessories">
            {/* Coffee Mug on Left */}
            <g transform="translate(68, 160)">
              {/* Animated Pixel Steam */}
              <g className="anim-steam">
                <rect x="5" y="-12" width="2" height="3" fill="#E2E8F0" opacity="0.7" />
                <rect x="9" y="-16" width="2" height="4" fill="#E2E8F0" opacity="0.8" />
                <rect x="7" y="-8" width="2" height="3" fill="#E2E8F0" opacity="0.6" />
              </g>
              {/* Mug Body */}
              <rect x="2" y="-2" width="14" height="14" rx="2" fill="#38BDF8" stroke="#0284C7" strokeWidth="1.5" />
              {/* Mug Handle */}
              <path d="M 2 1 Q -3 5 2 9" fill="none" stroke="#0284C7" strokeWidth="2" />
              {/* Little Paw Print on Mug */}
              <circle cx="9" cy="5" r="1.5" fill="#FFFFFF" />
              <circle cx="7" cy="3" r="0.8" fill="#FFFFFF" />
              <circle cx="11" cy="3" r="0.8" fill="#FFFFFF" />
            </g>

            {/* Sticky Note on Right */}
            <g transform="translate(224, 162)">
              <rect x="0" y="0" width="18" height="16" fill="#FDE047" stroke="#EAB308" strokeWidth="1" />
              <line x1="3" y1="4" x2="15" y2="4" stroke="#A16207" strokeWidth="1" />
              <line x1="3" y1="8" x2="13" y2="8" stroke="#A16207" strokeWidth="1" />
              <line x1="3" y1="12" x2="11" y2="12" stroke="#A16207" strokeWidth="1" />
            </g>
          </g>

          {/* 8. The 3D Pixel Computer / Laptop */}
          <g id="computer">
            {/* Screen Glow onto Keyboard & Desk */}
            <polygon points="106,170 174,170 196,180 84,180" fill="url(#screenGlow)" />

            {/* Laptop Base / Keyboard Deck (Isometric Slab) */}
            <polygon
              points="104,164 176,164 192,180 88,180"
              fill="#334155"
              stroke="#0F172A"
              strokeWidth="1.5"
            />
            {/* Front Edge of Laptop */}
            <polygon points="88,180 192,180 192,183 88,183" fill="#1E293B" />

            {/* Keyboard Keys Grid (Pixel Rectangles with depth) */}
            <g id="keys" opacity="0.9">
              {/* Row 1 */}
              <rect x="108" y="166" width="8" height="2" fill="#64748B" rx="0.5" />
              <rect x="118" y="166" width="8" height="2" fill="#64748B" rx="0.5" />
              <rect x="128" y="166" width="8" height="2" fill="#64748B" rx="0.5" />
              <rect x="138" y="166" width="8" height="2" fill="#64748B" rx="0.5" />
              <rect x="148" y="166" width="8" height="2" fill="#64748B" rx="0.5" />
              <rect x="158" y="166" width="8" height="2" fill="#64748B" rx="0.5" />
              <rect x="168" y="166" width="8" height="2" fill="#64748B" rx="0.5" />

              {/* Row 2 */}
              <rect x="104" y="169" width="9" height="2.5" fill="#94A3B8" rx="0.5" />
              <rect x="115" y="169" width="9" height="2.5" fill="#94A3B8" rx="0.5" />
              <rect x="126" y="169" width="9" height="2.5" fill="#38BDF8" rx="0.5" /> {/* Lit key */}
              <rect x="137" y="169" width="9" height="2.5" fill="#94A3B8" rx="0.5" />
              <rect x="148" y="169" width="9" height="2.5" fill="#94A3B8" rx="0.5" />
              <rect x="159" y="169" width="9" height="2.5" fill="#38BDF8" rx="0.5" /> {/* Lit key */}
              <rect x="170" y="169" width="9" height="2.5" fill="#94A3B8" rx="0.5" />

              {/* Spacebar */}
              <rect x="124" y="173" width="32" height="2.5" fill="#CBD5E1" rx="0.5" />
              {/* Trackpad */}
              <rect x="132" y="176.5" width="16" height="2" fill="#1E293B" rx="0.5" />
            </g>

            {/* Laptop Screen / Monitor (Facing Cat, angled forward) */}
            <g id="screen">
              {/* Outer Screen Lid Backing */}
              <polygon
                points="98,114 182,114 176,164 104,164"
                fill="#1E293B"
                stroke="#0F172A"
                strokeWidth="2"
              />
              {/* Screen Bezel */}
              <polygon
                points="102,118 178,118 173,161 107,161"
                fill="url(#laptopScreenGrad)"
              />
              {/* Glowing Code Lines on Monitor */}
              <g className="anim-code" clipPath="url(#screenClip)">
                <line x1="110" y1="124" x2="142" y2="124" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
                <line x1="146" y1="124" x2="168" y2="124" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

                <line x1="110" y1="130" x2="130" y2="130" stroke="#F472B6" strokeWidth="2" strokeLinecap="round" />
                <line x1="134" y1="130" x2="164" y2="130" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />

                <line x1="110" y1="136" x2="152" y2="136" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                <line x1="110" y1="142" x2="138" y2="142" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />

                <line x1="110" y1="148" x2="162" y2="148" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" />
                <line x1="110" y1="154" x2="148" y2="154" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Little Apple/Docworm Logo on Screen Front Top */}
              <circle cx="140" cy="116" r="1.5" fill="#38BDF8" />
            </g>
          </g>

          {/* 9. VISIBLE PAW MOVEMENTS (HIGH PRIORITY) */}
          <g id="paws-and-typing">
            {/* Left Arm and Paw */}
            <g className="anim-left-paw">
              {/* Arm extending down */}
              <path
                d="M 122 136 L 122 154 L 132 154 L 132 136 Z"
                fill="#D97706"
                stroke="#B45309"
                strokeWidth="1.5"
              />
              {/* Cute White Paw Glove */}
              <ellipse cx="127" cy="154" rx="7" ry="5.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
              <ellipse cx="127" cy="154" rx="5" ry="4" fill="#FFFFFF" />
              {/* Pink Paw Toe Pads */}
              <circle cx="124" cy="155" r="1.2" fill="#FDA4AF" />
              <circle cx="127" cy="156" r="1.2" fill="#FDA4AF" />
              <circle cx="130" cy="155" r="1.2" fill="#FDA4AF" />
            </g>

            {/* Right Arm and Paw */}
            <g className="anim-right-paw">
              {/* Arm extending down */}
              <path
                d="M 148 136 L 148 154 L 158 154 L 158 136 Z"
                fill="#D97706"
                stroke="#B45309"
                strokeWidth="1.5"
              />
              {/* Cute White Paw Glove */}
              <ellipse cx="153" cy="154" rx="7" ry="5.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
              <ellipse cx="153" cy="154" rx="5" ry="4" fill="#FFFFFF" />
              {/* Pink Paw Toe Pads */}
              <circle cx="150" cy="155" r="1.2" fill="#FDA4AF" />
              <circle cx="153" cy="156" r="1.2" fill="#FDA4AF" />
              <circle cx="156" cy="155" r="1.2" fill="#FDA4AF" />
            </g>

            {/* Keystroke Impact Sparks / Typing Code Particles */}
            <g transform="translate(122, 160)" className="anim-spark-1">
              <rect x="0" y="0" width="3" height="3" fill="#FDE047" rx="0.5" />
            </g>
            <g transform="translate(128, 156)" className="anim-spark-2">
              <rect x="0" y="0" width="2.5" height="2.5" fill="#38BDF8" rx="0.5" />
            </g>
            <g transform="translate(150, 160)" className="anim-spark-1">
              <rect x="0" y="0" width="3" height="3" fill="#4ADE80" rx="0.5" />
            </g>
            <g transform="translate(156, 156)" className="anim-spark-2">
              <rect x="0" y="0" width="2.5" height="2.5" fill="#FDE047" rx="0.5" />
            </g>

            {/* Extra sparks when Turbo is active */}
            {turbo && (
              <>
                <g transform="translate(118, 150)" className="anim-spark-1">
                  <text x="0" y="0" fill="#FDE047" fontSize="9" fontWeight="bold">⚡</text>
                </g>
                <g transform="translate(160, 150)" className="anim-spark-2">
                  <text x="0" y="0" fill="#38BDF8" fontSize="9" fontWeight="bold">✨</text>
                </g>
              </>
            )}
          </g>
        </svg>

        {/* Status Pill Indicator */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-[11px] font-medium shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="tracking-wide text-blue-100 font-semibold">
              {turbo ? 'Turbo Typing 240 WPM ⚡' : 'Docworm Core • Online'}
            </span>
          </div>
          <span className="text-[10px] text-blue-200/80 group-hover:text-amber-300 transition-colors">
            Click to purr 🐾
          </span>
        </div>
      </div>
    </div>
  );
}
