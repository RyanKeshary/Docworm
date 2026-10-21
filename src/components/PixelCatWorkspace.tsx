'use client';

import React, { useState } from 'react';

/**
 * PixelCatWorkspace
 * A 3D/three-quarter profile cute animated cat working diligently on a computer,
 * inspired by the cozy study cat aesthetic.
 *
 * Interactive Feature:
 * - When clicked, the cat becomes ANGRY with airplane ears, furious fangs/hiss,
 *   furrowed anime brows, pulsing anger vein (💢), rapid-fire rage typing,
 *   and an angry speech bubble shouting "PSSPSPSPSPSPS!! 😾💢"!
 * - Automatically calms down after 3 seconds.
 * - Responsive: hidden on mobile (<640px), visible on tablet and desktop.
 */
export function PixelCatWorkspace() {
  const [clickCount, setClickCount] = useState(0);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isAngry, setIsAngry] = useState(false);

  const angryQuotes = [
    'PSSPSPSPSPSPS!! 😾💢',
    'HISS! PSSPSPSPSPSPS!! 😾',
    'PSSPSPSPSPS! DON\'T TOUCH ME! 😾💢',
    'PSSPSPSPSPS! I\'M COMPILING! 😾⚡',
    'PSSPSPSPSPS!! DO NOT POKE THE DEV! 😾💥',
  ];

  const handleClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    const quote = angryQuotes[nextCount % angryQuotes.length];
    setBubbleText(quote);
    setIsAngry(true);

    setTimeout(() => {
      setIsAngry(false);
      setBubbleText((curr) => (curr === quote ? null : curr));
    }, 3200);
  };

  return (
    // Only visible on tablet (sm:) and desktop, hidden on mobile screens
    <div className="hidden sm:block relative w-full max-w-[340px] mx-auto select-none">
      {/* Interactive Speech Bubble (Shaking Angry Bubble when clicked) */}
      {bubbleText && (
        <div
          className={`absolute -top-8 right-4 z-30 px-3.5 py-1.5 rounded-full shadow-2xl border whitespace-nowrap flex items-center gap-1.5 pointer-events-none transition-all ${
            isAngry
              ? 'bg-rose-50 text-rose-700 border-rose-400 font-extrabold text-[12px] tracking-wide animate-[pulse_0.4s_ease-in-out_infinite]'
              : 'bg-white text-slate-900 border-blue-200 font-bold text-[11px]'
          }`}
          style={{
            animation: isAngry ? 'angryShake 0.22s ease-in-out infinite' : undefined,
          }}
        >
          <span>{bubbleText}</span>
          <div
            className={`absolute -bottom-1.5 right-8 w-2.5 h-2.5 rotate-45 border-r border-b ${
              isAngry ? 'bg-rose-50 border-rose-400' : 'bg-white border-blue-200'
            }`}
          />
        </div>
      )}

      {/* SVG Canvas for Cozy Cat Studio */}
      <div
        onClick={handleClick}
        className={`cursor-pointer group relative p-1.5 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
          isAngry ? 'ring-2 ring-rose-500/40 rounded-2xl' : ''
        }`}
        title={isAngry ? 'She is hissing! Give her space!' : 'Click the cat (she might get angry!)'}
      >
        <svg
          viewBox="0 0 350 200"
          className="w-full h-auto drop-shadow-lg overflow-visible"
          style={{ imageRendering: 'auto' }}
        >
          <defs>
            {/* Monitor screen glow */}
            <radialGradient id="monitorGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={isAngry ? '#F43F5E' : '#38BDF8'} stopOpacity={isAngry ? '0.5' : '0.4'} />
              <stop offset="100%" stopColor={isAngry ? '#BE123C' : '#0284C7'} stopOpacity="0" />
            </radialGradient>

            {/* Screen background gradient */}
            <linearGradient id="screenBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B1329" />
              <stop offset="100%" stopColor={isAngry ? '#4C0519' : '#03456C'} />
            </linearGradient>

            {/* Wood desk surface gradient */}
            <linearGradient id="deskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#9A3412" />
              <stop offset="60%" stopColor="#7C2D12" />
              <stop offset="100%" stopColor="#451A03" />
            </linearGradient>

            {/* Chair cushion gradient */}
            <linearGradient id="chairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>

            {/* Code screen clipping */}
            <clipPath id="screenContentClip">
              <rect x="74" y="66" width="46" height="56" rx="3" />
            </clipPath>

            <style>{`
              @keyframes pawTapLeft {
                0%   { transform: translateY(0px) rotate(0deg); }
                50%  { transform: translateY(6px) rotate(-4deg); }
                100% { transform: translateY(0px) rotate(0deg); }
              }
              @keyframes pawTapRight {
                0%   { transform: translateY(6px) rotate(4deg); }
                50%  { transform: translateY(0px) rotate(0deg); }
                100% { transform: translateY(6px) rotate(4deg); }
              }
              @keyframes eyeBlink {
                0%, 90%, 100% { transform: scaleY(1); }
                95%           { transform: scaleY(0.12); }
              }
              @keyframes earTwitch {
                0%, 82%, 100% { transform: rotate(0deg); }
                86%           { transform: rotate(-7deg); }
                92%           { transform: rotate(3deg); }
              }
              @keyframes tailGentleSway {
                0%   { transform: rotate(0deg); }
                50%  { transform: rotate(-10deg); }
                100% { transform: rotate(0deg); }
              }
              @keyframes tailAngrySwish {
                0%   { transform: rotate(5deg); }
                50%  { transform: rotate(-24deg); }
                100% { transform: rotate(5deg); }
              }
              @keyframes catBreathe {
                0%   { transform: translateY(0px); }
                50%  { transform: translateY(-1.5px); }
                100% { transform: translateY(0px); }
              }
              @keyframes angryVibrate {
                0%, 100% { transform: translate(0, 0); }
                25%      { transform: translate(-0.8px, 0.8px); }
                75%      { transform: translate(0.8px, -0.8px); }
              }
              @keyframes steamDrift {
                0%   { opacity: 0; transform: translateY(0px) scale(0.8); }
                50%  { opacity: 0.7; transform: translateY(-5px) scale(1); }
                100% { opacity: 0; transform: translateY(-12px) scale(1.2); }
              }
              @keyframes codeScrollFast {
                0%   { transform: translateY(0px); }
                100% { transform: translateY(-16px); }
              }
              @keyframes sparkFly {
                0%   { opacity: 0; transform: translate(0, 0) scale(0.5); }
                40%  { opacity: 1; transform: translate(-3px, -6px) scale(1); }
                100% { opacity: 0; transform: translate(-6px, -12px) scale(0.3); }
              }
              @keyframes angryShake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                25%      { transform: translate(-2px, 1px) rotate(-1deg); }
                75%      { transform: translate(2px, -1px) rotate(1deg); }
              }
              @keyframes pulseVein {
                0%, 100% { transform: scale(1); }
                50%      { transform: scale(1.3); }
              }

              .cat-left-paw {
                animation: pawTapLeft ${isAngry ? '0.07s' : '0.2s'} ease-in-out infinite;
                transform-origin: 184px 134px;
              }
              .cat-right-paw {
                animation: pawTapRight ${isAngry ? '0.07s' : '0.2s'} ease-in-out infinite;
                transform-origin: 202px 132px;
              }
              .cat-eyes {
                animation: eyeBlink 3.6s infinite;
                transform-origin: 202px 90px;
              }
              .cat-ear {
                animation: earTwitch 4.5s ease-in-out infinite;
                transform-origin: 218px 58px;
              }
              .cat-tail {
                animation: ${isAngry ? 'tailAngrySwish 0.28s' : 'tailGentleSway 3s'} ease-in-out infinite;
                transform-origin: 290px 146px;
              }
              .cat-body-group {
                animation: ${isAngry ? 'angryVibrate 0.15s' : 'catBreathe 3s'} ease-in-out infinite;
              }
              .steam-particle {
                animation: steamDrift 2.2s ease-out infinite;
              }
              .code-lines {
                animation: codeScrollFast ${isAngry ? '0.6s' : '1.6s'} linear infinite;
              }
              .typing-spark {
                animation: sparkFly ${isAngry ? '0.14s' : '0.4s'} ease-out infinite;
              }
              .anim-vein {
                animation: pulseVein 0.5s ease-in-out infinite;
                transform-origin: 242px 64px;
              }
            `}</style>
          </defs>

          {/* 1. Floor Shadow */}
          <ellipse cx="175" cy="188" rx="150" ry="10" fill="#08101E" opacity="0.4" />

          {/* 2. Office Chair (Behind the cat, on the right) */}
          <g id="chair">
            {/* Chair Backrest */}
            <path
              d="M 270 70 C 270 56, 310 56, 310 70 L 314 150 C 314 160, 276 160, 276 150 Z"
              fill="url(#chairGrad)"
              stroke="#0F172A"
              strokeWidth="2"
            />
            {/* Chair Inner Cushion Highlight */}
            <path
              d="M 276 74 C 276 64, 304 64, 304 74 L 308 142 C 308 148, 280 148, 280 142 Z"
              fill="#334155"
              opacity="0.85"
            />
          </g>

          {/* 3. Cat Tail (Extending from behind chair - angry lash or gentle sway) */}
          <g id="tail" className="cat-tail">
            <path
              d="M 288 148 C 308 152, 324 138, 318 116 C 316 108, 306 108, 308 116 C 312 130, 298 140, 284 138 Z"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="2"
            />
            <path
              d="M 314 116 C 317 126, 308 136, 294 138"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
          </g>

          {/* 4. Desk Surface & Legs */}
          <g id="desk">
            {/* Back lip of desk */}
            <rect x="22" y="146" width="306" height="5" fill="#451A03" rx="1" />
            {/* Main Desk Surface */}
            <rect x="20" y="150" width="310" height="12" fill="url(#deskGrad)" stroke="#451A03" strokeWidth="1.5" rx="2" />
            {/* Front Desk Edge bevel highlight */}
            <line x1="22" y1="151" x2="328" y2="151" stroke="#FDE68A" strokeWidth="1" opacity="0.4" />
            {/* Desk Legs */}
            <rect x="36" y="162" width="12" height="24" fill="#361502" rx="1" />
            <rect x="302" y="162" width="12" height="24" fill="#361502" rx="1" />
          </g>

          {/* 5. Desk Accessories - Left: Books Organizer */}
          <g id="organizer" transform="translate(32, 102)">
            <rect x="0" y="24" width="36" height="24" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
            <rect x="3" y="10" width="8" height="36" rx="2" fill="#0D9488" stroke="#115E59" strokeWidth="1" />
            <rect x="13" y="14" width="7" height="32" rx="2" fill="#E11D48" stroke="#9F1239" strokeWidth="1" />
            <rect x="22" y="8" width="8" height="38" rx="2" fill="#4F46E5" stroke="#3730A3" strokeWidth="1" />
            <line x1="31" y1="16" x2="31" y2="40" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="33" y1="20" x2="33" y2="40" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* 6. Desk Accessories - Succulent Plant Pot */}
          <g id="succulent" transform="translate(122, 128)">
            <polygon points="4,10 18,10 16,22 6,22" fill="#EA580C" stroke="#9A3412" strokeWidth="1" />
            <rect x="3" y="8" width="16" height="3" rx="1" fill="#C2410C" />
            <ellipse cx="11" cy="5" rx="5" ry="4" fill="#22C55E" />
            <ellipse cx="6" cy="7" rx="4" ry="3" fill="#16A34A" />
            <ellipse cx="16" cy="7" rx="4" ry="3" fill="#15803D" />
            <ellipse cx="11" cy="2" rx="3" ry="4" fill="#4ADE80" />
          </g>

          {/* 7. Computer Monitor (Left Side, Angled towards Cat) */}
          <g id="monitor" transform="translate(68, 54)">
            <ellipse cx="44" cy="95" rx="18" ry="4" fill="#0F172A" />
            <path d="M 44 95 Q 48 80 44 68" fill="none" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />

            <rect x="2" y="6" width="56" height="68" rx="5" fill="#0F172A" stroke={isAngry ? '#E11D48' : '#334155'} strokeWidth="2" />
            <rect x="6" y="10" width="48" height="60" rx="3" fill="url(#screenBg)" />
            <rect x="6" y="10" width="48" height="60" rx="3" fill="url(#monitorGlow)" />

            {/* Scrolling Code Lines on Screen */}
            <g clipPath="url(#screenContentClip)">
              <g className="code-lines">
                <line x1="78" y1="74" x2="108" y2="74" stroke={isAngry ? '#F43F5E' : '#4ADE80'} strokeWidth="2.5" strokeLinecap="round" />
                <line x1="112" y1="74" x2="116" y2="74" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />

                <line x1="78" y1="80" x2="96" y2="80" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" />
                <line x1="100" y1="80" x2="114" y2="80" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />

                <line x1="78" y1="86" x2="114" y2="86" stroke={isAngry ? '#FB7185' : '#38BDF8'} strokeWidth="2" strokeLinecap="round" />
                <line x1="78" y1="92" x2="104" y2="92" stroke={isAngry ? '#E11D48' : '#4ADE80'} strokeWidth="2" strokeLinecap="round" />

                <line x1="78" y1="98" x2="92" y2="98" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
                <line x1="96" y1="98" x2="112" y2="98" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

                <line x1="78" y1="104" x2="110" y2="104" stroke={isAngry ? '#FDA4AF' : '#4ADE80'} strokeWidth="2" strokeLinecap="round" />
                <line x1="78" y1="110" x2="102" y2="110" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" />

                <line x1="78" y1="116" x2="114" y2="116" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              </g>
            </g>

            <circle cx="30" cy="71" r="1.5" fill={isAngry ? '#F43F5E' : '#38BDF8'} />
          </g>

          {/* 8. Mechanical Keyboard (Center-Left, directly in front of Cat's paws) */}
          <g id="keyboard" transform="translate(144, 142)">
            <polygon points="0,4 52,4 56,12 -4,12" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
            <rect x="0" y="5" width="8" height="3" fill="#64748B" rx="0.5" />
            <rect x="10" y="5" width="8" height="3" fill="#64748B" rx="0.5" />
            <rect x="20" y="5" width="8" height="3" fill={isAngry ? '#F43F5E' : '#38BDF8'} rx="0.5" />
            <rect x="30" y="5" width="8" height="3" fill="#64748B" rx="0.5" />
            <rect x="40" y="5" width="8" height="3" fill="#64748B" rx="0.5" />

            <rect x="-1" y="9" width="9" height="3" fill="#94A3B8" rx="0.5" />
            <rect x="10" y="9" width="9" height="3" fill={isAngry ? '#F43F5E' : '#38BDF8'} rx="0.5" />
            <rect x="21" y="9" width="16" height="3" fill="#CBD5E1" rx="0.5" />
            <rect x="39" y="9" width="9" height="3" fill="#94A3B8" rx="0.5" />
          </g>

          {/* 9. Keystroke Impact Sparks / Rage particles popping off keyboard */}
          <g transform="translate(156, 138)" className="typing-spark">
            <rect x="0" y="0" width="2.5" height="2.5" fill={isAngry ? '#EF4444' : '#FDE047'} rx="0.5" />
          </g>
          <g transform="translate(178, 136)" className="typing-spark">
            <rect x="0" y="0" width="2.5" height="2.5" fill={isAngry ? '#F97316' : '#38BDF8'} rx="0.5" />
          </g>
          <g transform="translate(168, 134)" className="typing-spark">
            <circle cx="0" cy="0" r="1.5" fill={isAngry ? '#DC2626' : '#4ADE80'} />
          </g>
          {isAngry && (
            <>
              <g transform="translate(162, 130)" className="typing-spark">
                <text x="0" y="0" fill="#EF4444" fontSize="11" fontWeight="bold">💢</text>
              </g>
              <g transform="translate(174, 128)" className="typing-spark">
                <text x="0" y="0" fill="#F97316" fontSize="10" fontWeight="bold">💥</text>
              </g>
            </>
          )}

          {/* 10. The Cat (Seated in Chair, Facing Left towards Monitor) */}
          <g id="cat" className="cat-body-group">
            {/* Fluffy Round Cat Body */}
            <path
              d="M 204 150 C 196 136, 196 112, 214 98 C 230 84, 274 86, 284 108 C 294 130, 286 150, 268 152 Z"
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth="2"
            />
            <path
              d="M 248 94 C 278 100, 288 126, 280 150"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="2.5"
            />

            {/* Left Ear - NORMAL or ANGRY AIRPLANE EAR ✈️ */}
            {isAngry ? (
              // Airplane Ear (flattened down angrily to the side)
              <g transform="rotate(-32 196 68)">
                <polygon points="196,72 176,58 206,58" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                <polygon points="194,70 180,61 202,61" fill="#FDA4AF" />
              </g>
            ) : (
              <g className="cat-ear">
                <polygon points="196,72 188,46 214,56" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                <polygon points="196,68 192,52 210,59" fill="#FDA4AF" />
              </g>
            )}

            {/* Right Ear - NORMAL or ANGRY AIRPLANE EAR ✈️ */}
            {isAngry ? (
              // Airplane Ear (flattened back angrily)
              <g transform="rotate(28 236 64)">
                <polygon points="230,68 252,54 246,74" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                <polygon points="234,66 248,58 244,71" fill="#FDA4AF" />
              </g>
            ) : (
              <g>
                <polygon points="230,68 244,44 250,65" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
                <polygon points="234,65 243,49 247,63" fill="#FDA4AF" />
              </g>
            )}

            {/* Chubby Round Head */}
            <ellipse cx="218" cy="88" rx="28" ry="26" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />

            {/* Pulsing Anime Anger Vein (💢) on forehead/temple when Angry! */}
            {isAngry && (
              <g className="anim-vein" transform="translate(242, 64) scale(0.95)">
                <path d="M -4 -8 L -4 -2 L -8 -2" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 4 -8 L 4 -2 L 8 -2" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M -4 8 L -4 2 L -8 2" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 4 8 L 4 2 L 8 2" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {/* Spectacles / Glasses */}
            <g id="glasses">
              <circle cx="204" cy="88" r="9" fill="none" stroke="#0F172A" strokeWidth="2.5" />
              <circle cx="226" cy="88" r="9" fill="none" stroke="#0F172A" strokeWidth="2.5" />
              <line x1="213" y1="88" x2="217" y2="88" stroke="#0F172A" strokeWidth="2.5" />
              <line x1="235" y1="88" x2="244" y2="84" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
              <line x1="199" y1="83" x2="204" y2="81" stroke={isAngry ? '#F43F5E' : '#38BDF8'} strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
              <line x1="221" y1="83" x2="226" y2="81" stroke={isAngry ? '#F43F5E' : '#38BDF8'} strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
            </g>

            {/* Eyes & Eyebrows - CALM or ANGRY */}
            {isAngry ? (
              // Angry Slit Eyes & Furrowed Eyebrows (\ /)
              <g id="angry-eyes">
                {/* Furrowed Angled Angry Brows */}
                <line x1="196" y1="77" x2="210" y2="82" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="234" y1="77" x2="220" y2="82" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />

                {/* Left Angry Slit Eye */}
                <ellipse cx="204" cy="88" rx="4" ry="2" fill="#DC2626" />
                <line x1="200" y1="88" x2="208" y2="88" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

                {/* Right Angry Slit Eye */}
                <ellipse cx="226" cy="88" rx="4" ry="2" fill="#DC2626" />
                <line x1="222" y1="88" x2="230" y2="88" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
              </g>
            ) : (
              // Cute Calm Blinking Anime Eyes
              <g id="eyes" className="cat-eyes">
                <ellipse cx="204" cy="88" rx="4" ry="5" fill="#0F172A" />
                <circle cx="203" cy="86" r="1.5" fill="#FFFFFF" />
                <circle cx="205" cy="89" r="0.8" fill="#38BDF8" />

                <ellipse cx="226" cy="88" rx="4" ry="5" fill="#0F172A" />
                <circle cx="225" cy="86" r="1.5" fill="#FFFFFF" />
                <circle cx="227" cy="89" r="0.8" fill="#38BDF8" />
              </g>
            )}

            {/* Pink Nose */}
            <polygon points="214,94 212,92 216,92" fill="#F43F5E" />

            {/* Mouth - CALM (:3) or HISSING FANGS (PSSPSPSPS!) */}
            {isAngry ? (
              <g id="hissing-mouth">
                {/* Open angry hissing mouth */}
                <path d="M 210,95 Q 214,101 218,95 Z" fill="#991B1B" stroke="#0F172A" strokeWidth="1" />
                {/* Tiny White Hissing Fangs */}
                <polygon points="211,95 212.5,97.5 214,95" fill="#FFFFFF" />
                <polygon points="214.5,95 216,97.5 217.5,95" fill="#FFFFFF" />
              </g>
            ) : (
              <path
                d="M 210,95 Q 212,98 214,95 Q 216,98 218,95"
                fill="none"
                stroke="#64748B"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            )}

            {/* Cheeks */}
            <ellipse cx="196" cy="94" rx="4" ry="2.5" fill={isAngry ? '#F43F5E' : '#FDA4AF'} opacity="0.75" />
            <ellipse cx="232" cy="94" rx="4" ry="2.5" fill={isAngry ? '#F43F5E' : '#FDA4AF'} opacity="0.75" />

            {/* Whiskers (Angled down aggressively when hissing) */}
            <line x1="184" y1={isAngry ? '94' : '92'} x2="194" y2="94" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="183" y1={isAngry ? '101' : '97'} x2="194" y2="97" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="234" y1="94" x2="245" y2={isAngry ? '94' : '92'} stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="234" y1="97" x2="246" y2={isAngry ? '101' : '97'} stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* 11. VISIBLE HAND / PAW TYPING MOVEMENTS (SUPER FAST RAGE TYPING WHEN ANGRY) */}
          <g id="paws-typing">
            {/* Right Paw */}
            <g className="cat-right-paw">
              <path
                d="M 204 126 Q 186 130 174 140"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 204 126 Q 186 130 174 140"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="12"
                strokeLinecap="round"
                opacity="0.3"
              />
              <circle cx="174" cy="140" r="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
              <circle cx="172" cy="141" r="1.3" fill="#FDA4AF" />
              <circle cx="175" cy="142" r="1.3" fill="#FDA4AF" />
              <circle cx="177" cy="141" r="1.3" fill="#FDA4AF" />
            </g>

            {/* Left Paw */}
            <g className="cat-left-paw">
              <path
                d="M 198 132 Q 174 136 160 142"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <path
                d="M 198 132 Q 174 136 160 142"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="13"
                strokeLinecap="round"
                opacity="0.3"
              />
              <circle cx="160" cy="142" r="6.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              <circle cx="158" cy="143" r="1.4" fill="#FDA4AF" />
              <circle cx="161" cy="144" r="1.4" fill="#FDA4AF" />
              <circle cx="163" cy="143" r="1.4" fill="#FDA4AF" />
            </g>
          </g>

          {/* 12. Desk Accessories - Coffee Mug with Animated Steam */}
          <g id="coffee" transform="translate(204, 132)">
            <g className="steam-particle">
              <path d="M 6,-6 Q 8,-12 6,-18 Q 4,-22 7,-26" fill="none" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
              <path d="M 11,-4 Q 14,-10 11,-16 Q 9,-20 12,-24" fill="none" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            </g>
            <rect x="2" y="2" width="14" height="15" rx="3" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
            <path d="M 16 5 Q 21 9 16 13" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M 9 7 C 9 6, 7 5, 6 7 C 5 9, 9 11, 9 12 C 9 11, 13 9, 12 7 C 11 5, 9 6, 9 7 Z" fill="#F43F5E" />
          </g>

          {/* 13. Desk Accessories - Stack of Books on Right */}
          <g id="books-stack" transform="translate(228, 132)">
            <rect x="0" y="10" width="34" height="5.5" rx="1.5" fill="#1D4ED8" stroke="#1E40AF" strokeWidth="1" />
            <rect x="2" y="11" width="30" height="1" fill="#DBEAFE" />

            <rect x="2" y="5" width="31" height="5.5" rx="1.5" fill="#BE123C" stroke="#9F1239" strokeWidth="1" />
            <rect x="4" y="6" width="27" height="1" fill="#FFE4E6" />

            <rect x="4" y="0" width="28" height="5.5" rx="1.5" fill="#047857" stroke="#065F46" strokeWidth="1" />
            <rect x="6" y="1" width="24" height="1" fill="#D1FAE5" />
            <path d="M 28 3 L 33 3 L 31 10 L 29 8 L 27 10 Z" fill="#FBBF24" />
          </g>
        </svg>

        {/* Status Pill Indicator */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-[11px] font-medium shadow-inner mt-1 transition-colors duration-300 ${
            isAngry
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
              : 'bg-white/10 backdrop-blur-md border-white/15 text-white/90'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isAngry ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isAngry ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span
              className={`tracking-wide font-semibold truncate ${
                isAngry ? 'text-rose-200 animate-pulse' : 'text-blue-100'
              }`}
            >
              {isAngry ? 'Status: ANGRY CAT 😾 (HISS!)' : 'Docworm Core • Online'}
            </span>
          </div>
          <span
            className={`text-[10px] whitespace-nowrap ml-2 transition-colors ${
              isAngry ? 'text-rose-300 font-bold' : 'text-blue-200/80 group-hover:text-amber-300'
            }`}
          >
            {isAngry ? 'Psspspspsps! 💢' : 'Click to poke 🐾'}
          </span>
        </div>
      </div>
    </div>
  );
}
