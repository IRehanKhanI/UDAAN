import { useEffect, useState } from 'react'

/**
 * UdaanLoader — animated 2D cartoon character loaders.
 *
 * Usage:
 *   <UdaanLoader character="researcher" message="Scanning the web…" />
 *   <UdaanLoader character="builder"    message="Building roadmap…" size="sm" />
 *
 * character: 'researcher' | 'builder' | 'thinker' | 'tester' | 'rocket'
 * size:      'sm' | 'md' (default) | 'lg'
 * message:   optional string or string[]  (if array, cycles through them)
 * sub:       optional subtitle string
 */

const SIZES = { sm: 120, md: 160, lg: 220 }

// ── 1. RESEARCHER  (purple blob + magnifying glass) ──────────────────
function CharResearcher({ px }) {
  const s = px / 160
  return (
    <g transform={`scale(${s}) translate(${(160 - 160) / 2}, 0)`}>
      {/* shadow */}
      <ellipse cx="80" cy="148" rx="34" ry="7" fill="#1D1B18" opacity="0.18" className="udl-shadow" />
      <g className="udl-bounce">
        {/* body */}
        <ellipse cx="80" cy="96" rx="40" ry="44" fill="#3B1F5E" />
        {/* belly */}
        <ellipse cx="80" cy="108" rx="26" ry="30" fill="#E8B4D0" />
        {/* spikes */}
        <polygon points="55,62 48,38 62,58" fill="#6BCB77" />
        <polygon points="70,50 67,26 77,48" fill="#6BCB77" />
        <polygon points="80,46 80,22 86,45" fill="#6BCB77" />
        <polygon points="90,50 93,26 83,48" fill="#6BCB77" />
        <polygon points="105,62 112,38 98,58" fill="#6BCB77" />
        {/* left arm */}
        <g className="udl-arm-l" style={{ transformOrigin: '46px 90px' }}>
          <ellipse cx="46" cy="90" rx="8" ry="14" fill="#3B1F5E" transform="rotate(-15 46 90)" />
          <circle cx="42" cy="102" r="6" fill="#3B1F5E" />
        </g>
        {/* right arm + magnifying glass */}
        <g className="udl-arm-r" style={{ transformOrigin: '114px 90px' }}>
          <ellipse cx="114" cy="90" rx="8" ry="14" fill="#3B1F5E" transform="rotate(15 114 90)" />
          <g className="udl-mag" style={{ transformOrigin: '122px 80px' }}>
            <circle cx="122" cy="76" r="11" stroke="#FFD93D" strokeWidth="3.5" fill="white" fillOpacity="0.9" />
            <line x1="130" y1="84" x2="138" y2="92" stroke="#FFD93D" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="118" cy="72" r="2.5" fill="white" opacity="0.6" />
          </g>
        </g>
        {/* eyes */}
        <g className="udl-blink" style={{ transformOrigin: '80px 82px' }}>
          <ellipse cx="69" cy="82" rx="8" ry="9" fill="white" />
          <ellipse cx="91" cy="82" rx="8" ry="9" fill="white" />
        </g>
        <circle cx="71" cy="83" r="4" fill="#1D1B18" />
        <circle cx="93" cy="83" r="4" fill="#1D1B18" />
        <circle cx="72.5" cy="81.5" r="1.5" fill="white" />
        <circle cx="94.5" cy="81.5" r="1.5" fill="white" />
        {/* mouth */}
        <path d="M73 100 Q80 107 87 100" stroke="#1D1B18" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* feet */}
        <ellipse cx="67" cy="137" rx="12" ry="6" fill="#5B3A7A" />
        <ellipse cx="93" cy="137" rx="12" ry="6" fill="#5B3A7A" />
      </g>
      {/* search particles */}
      <rect x="30" y="38" width="4" height="10" rx="2" fill="#FF6B6B" className="udl-dot1" />
      <rect x="42" y="24" width="4" height="10" rx="2" fill="#FFD93D" className="udl-dot2" />
      <rect x="20" y="24" width="4" height="10" rx="2" fill="#6BCB77" className="udl-dot3" />
    </g>
  )
}

// ── 2. BUILDER  (orange round guy + wrench) ──────────────────────────
function CharBuilder({ px }) {
  const s = px / 160
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="80" cy="148" rx="34" ry="7" fill="#1D1B18" opacity="0.18" className="udl-shadow" />
      <g className="udl-bounce">
        <ellipse cx="80" cy="96" rx="42" ry="46" fill="#C25B1A" />
        <ellipse cx="80" cy="110" rx="28" ry="32" fill="#FDDCBC" />
        {/* hard hat */}
        <ellipse cx="80" cy="54" rx="34" ry="10" fill="#FFD93D" />
        <rect x="50" y="48" width="60" height="14" rx="7" fill="#FFD93D" />
        <rect x="56" y="46" width="48" height="8" rx="4" fill="#FFC107" />
        {/* left arm */}
        <g className="udl-arm-l" style={{ transformOrigin: '44px 92px' }}>
          <ellipse cx="44" cy="92" rx="8" ry="15" fill="#C25B1A" transform="rotate(-10 44 92)" />
          <circle cx="40" cy="106" r="6" fill="#C25B1A" />
        </g>
        {/* right arm + wrench */}
        <g className="udl-arm-r" style={{ transformOrigin: '116px 92px' }}>
          <ellipse cx="116" cy="92" rx="8" ry="15" fill="#C25B1A" transform="rotate(10 116 92)" />
          <g className="udl-mag" style={{ transformOrigin: '126px 80px' }}>
            {/* wrench */}
            <rect x="120" y="64" width="8" height="28" rx="3" fill="#8A7560" />
            <circle cx="124" cy="64" r="7" fill="#8A7560" />
            <circle cx="124" cy="64" r="3.5" fill="#FDDCBC" />
            <circle cx="124" cy="92" r="5" fill="#8A7560" />
          </g>
        </g>
        {/* eyes */}
        <g className="udl-blink" style={{ transformOrigin: '80px 83px' }}>
          <ellipse cx="69" cy="83" rx="8" ry="9" fill="white" />
          <ellipse cx="91" cy="83" rx="8" ry="9" fill="white" />
        </g>
        <circle cx="71" cy="84" r="4" fill="#1D1B18" />
        <circle cx="93" cy="84" r="4" fill="#1D1B18" />
        <circle cx="72.5" cy="82" r="1.5" fill="white" />
        <circle cx="94.5" cy="82" r="1.5" fill="white" />
        <path d="M73 101 Q80 108 87 101" stroke="#1D1B18" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="67" cy="138" rx="12" ry="6" fill="#A3480F" />
        <ellipse cx="93" cy="138" rx="12" ry="6" fill="#A3480F" />
      </g>
      {/* sparks */}
      <rect x="116" y="30" width="4" height="10" rx="2" fill="#FFD93D" className="udl-dot1" />
      <rect x="126" y="18" width="4" height="10" rx="2" fill="#FF6B6B" className="udl-dot2" />
      <rect x="136" y="30" width="4" height="10" rx="2" fill="#6BCB77" className="udl-dot3" />
    </g>
  )
}

// ── 3. THINKER  (blue round cloud head + lightbulb) ──────────────────
function CharThinker({ px }) {
  const s = px / 160
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="80" cy="148" rx="34" ry="7" fill="#1D1B18" opacity="0.18" className="udl-shadow" />
      <g className="udl-bounce">
        <ellipse cx="80" cy="98" rx="40" ry="44" fill="#1A4480" />
        <ellipse cx="80" cy="112" rx="26" ry="30" fill="#B8D4F0" />
        {/* cloud bumps on head */}
        <circle cx="58" cy="58" r="14" fill="#1A4480" />
        <circle cx="80" cy="50" r="18" fill="#1A4480" />
        <circle cx="102" cy="58" r="14" fill="#1A4480" />
        {/* lightbulb */}
        <g className="udl-mag" style={{ transformOrigin: '80px 36px' }}>
          <circle cx="80" cy="30" r="10" fill="#FFD93D" opacity="0.9" />
          <rect x="76" y="38" width="8" height="5" rx="1" fill="#FFD93D" opacity="0.7" />
          <path d="M74 26 Q80 20 86 26" stroke="#FFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
        {/* left arm */}
        <g className="udl-arm-l" style={{ transformOrigin: '46px 94px' }}>
          <ellipse cx="46" cy="94" rx="8" ry="14" fill="#1A4480" transform="rotate(-12 46 94)" />
          <circle cx="42" cy="106" r="6" fill="#1A4480" />
        </g>
        {/* right arm */}
        <g className="udl-arm-r" style={{ transformOrigin: '114px 94px' }}>
          <ellipse cx="114" cy="94" rx="8" ry="14" fill="#1A4480" transform="rotate(12 114 94)" />
          <circle cx="118" cy="106" r="6" fill="#1A4480" />
        </g>
        {/* eyes */}
        <g className="udl-blink" style={{ transformOrigin: '80px 84px' }}>
          <ellipse cx="69" cy="84" rx="8" ry="9" fill="white" />
          <ellipse cx="91" cy="84" rx="8" ry="9" fill="white" />
        </g>
        <circle cx="71" cy="85" r="4" fill="#1D1B18" />
        <circle cx="93" cy="85" r="4" fill="#1D1B18" />
        <circle cx="72.5" cy="83" r="1.5" fill="white" />
        <circle cx="94.5" cy="83" r="1.5" fill="white" />
        <path d="M73 102 Q80 109 87 102" stroke="#1D1B18" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="67" cy="138" rx="12" ry="6" fill="#12305E" />
        <ellipse cx="93" cy="138" rx="12" ry="6" fill="#12305E" />
      </g>
      {/* thought bubbles */}
      <circle cx="110" cy="28" r="4" fill="#1A4480" opacity="0.35" className="udl-dot1" />
      <circle cx="122" cy="18" r="6" fill="#1A4480" opacity="0.25" className="udl-dot2" />
      <circle cx="134" cy="10" r="8" fill="#1A4480" opacity="0.15" className="udl-dot3" />
    </g>
  )
}

// ── 4. TESTER  (green round + shield) ────────────────────────────────
function CharTester({ px }) {
  const s = px / 160
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="80" cy="148" rx="34" ry="7" fill="#1D1B18" opacity="0.18" className="udl-shadow" />
      <g className="udl-bounce">
        <ellipse cx="80" cy="96" rx="40" ry="44" fill="#1A6B52" />
        <ellipse cx="80" cy="110" rx="26" ry="30" fill="#A8E6CF" />
        {/* antenna */}
        <line x1="80" y1="52" x2="80" y2="34" stroke="#1A6B52" strokeWidth="3" strokeLinecap="round" />
        <g className="udl-mag" style={{ transformOrigin: '80px 32px' }}>
          <circle cx="80" cy="30" r="6" fill="#6BCB77" />
          <circle cx="80" cy="30" r="3" fill="#fff" opacity="0.7" />
        </g>
        {/* left arm */}
        <g className="udl-arm-l" style={{ transformOrigin: '46px 92px' }}>
          <ellipse cx="46" cy="92" rx="8" ry="14" fill="#1A6B52" transform="rotate(-12 46 92)" />
          <circle cx="42" cy="104" r="6" fill="#1A6B52" />
        </g>
        {/* right arm + shield */}
        <g className="udl-arm-r" style={{ transformOrigin: '114px 92px' }}>
          <ellipse cx="114" cy="92" rx="8" ry="14" fill="#1A6B52" transform="rotate(12 114 92)" />
          <g className="udl-mag" style={{ transformOrigin: '124px 80px' }}>
            <path d="M124 66 L136 72 L136 84 Q136 92 124 96 Q112 92 112 84 L112 72 Z" fill="#6BCB77" />
            <path d="M119 80 L123 84 L130 76" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        </g>
        {/* eyes */}
        <g className="udl-blink" style={{ transformOrigin: '80px 82px' }}>
          <ellipse cx="69" cy="82" rx="8" ry="9" fill="white" />
          <ellipse cx="91" cy="82" rx="8" ry="9" fill="white" />
        </g>
        <circle cx="71" cy="83" r="4" fill="#1D1B18" />
        <circle cx="93" cy="83" r="4" fill="#1D1B18" />
        <circle cx="72.5" cy="81" r="1.5" fill="white" />
        <circle cx="94.5" cy="81" r="1.5" fill="white" />
        <path d="M73 100 Q80 107 87 100" stroke="#1D1B18" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="67" cy="137" rx="12" ry="6" fill="#104D3A" />
        <ellipse cx="93" cy="137" rx="12" ry="6" fill="#104D3A" />
      </g>
      <rect x="24" y="36" width="4" height="10" rx="2" fill="#6BCB77" className="udl-dot1" />
      <rect x="14" y="22" width="4" height="10" rx="2" fill="#FFD93D" className="udl-dot2" />
      <rect x="34" y="22" width="4" height="10" rx="2" fill="#FF6B6B" className="udl-dot3" />
    </g>
  )
}

// ── 5. ROCKET  (red round + mini rocket pack) ─────────────────────────
function CharRocket({ px }) {
  const s = px / 160
  return (
    <g transform={`scale(${s})`}>
      <ellipse cx="80" cy="148" rx="34" ry="7" fill="#1D1B18" opacity="0.18" className="udl-shadow" />
      <g className="udl-bounce">
        <ellipse cx="80" cy="96" rx="40" ry="44" fill="#8B1A1A" />
        <ellipse cx="80" cy="110" rx="26" ry="30" fill="#F5C6C6" />
        {/* jetpack */}
        <rect x="56" y="72" width="48" height="30" rx="8" fill="#C0392B" />
        <rect x="62" y="78" width="14" height="18" rx="4" fill="#E74C3C" />
        <rect x="84" y="78" width="14" height="18" rx="4" fill="#E74C3C" />
        {/* flames */}
        <ellipse cx="69" cy="100" rx="4" ry="8" fill="#FFD93D" className="udl-dot1" />
        <ellipse cx="91" cy="100" rx="4" ry="8" fill="#FF6B6B" className="udl-dot2" />
        {/* left arm */}
        <g className="udl-arm-l" style={{ transformOrigin: '46px 90px' }}>
          <ellipse cx="46" cy="90" rx="8" ry="14" fill="#8B1A1A" transform="rotate(-12 46 90)" />
          <circle cx="42" cy="102" r="6" fill="#8B1A1A" />
        </g>
        {/* right arm */}
        <g className="udl-arm-r" style={{ transformOrigin: '114px 90px' }}>
          <ellipse cx="114" cy="90" rx="8" ry="14" fill="#8B1A1A" transform="rotate(12 114 90)" />
          <circle cx="118" cy="102" r="6" fill="#8B1A1A" />
        </g>
        {/* eyes */}
        <g className="udl-blink" style={{ transformOrigin: '80px 82px' }}>
          <ellipse cx="69" cy="82" rx="8" ry="9" fill="white" />
          <ellipse cx="91" cy="82" rx="8" ry="9" fill="white" />
        </g>
        <circle cx="71" cy="83" r="4" fill="#1D1B18" />
        <circle cx="93" cy="83" r="4" fill="#1D1B18" />
        <circle cx="72.5" cy="81" r="1.5" fill="white" />
        <circle cx="94.5" cy="81" r="1.5" fill="white" />
        <path d="M73 100 Q80 107 87 100" stroke="#1D1B18" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="67" cy="137" rx="12" ry="6" fill="#6B1212" />
        <ellipse cx="93" cy="137" rx="12" ry="6" fill="#6B1212" />
      </g>
      {/* speed stars */}
      <circle cx="26" cy="68" r="3" fill="#FFD93D" className="udl-dot1" />
      <circle cx="18" cy="82" r="2" fill="#FFD93D" className="udl-dot2" />
      <circle cx="22" cy="96" r="3" fill="#FFD93D" className="udl-dot3" />
    </g>
  )
}

const CHARS = {
  researcher: CharResearcher,
  builder:    CharBuilder,
  thinker:    CharThinker,
  tester:     CharTester,
  rocket:     CharRocket,
}

const STYLES = `
  @keyframes udl-bounce {
    0%,100% { transform: translateY(0) scaleY(1); }
    45%,55% { transform: translateY(-16px) scaleY(0.96); }
    80%      { transform: translateY(0) scaleY(1.05) scaleX(0.97); }
  }
  @keyframes udl-blink {
    0%,88%,100% { transform: scaleY(1); }
    94%         { transform: scaleY(0.07); }
  }
  @keyframes udl-arm-l {
    0%,100% { transform: rotate(-10deg); }
    50%     { transform: rotate(28deg); }
  }
  @keyframes udl-arm-r {
    0%,100% { transform: rotate(10deg); }
    50%     { transform: rotate(-28deg); }
  }
  @keyframes udl-mag {
    0%,100% { transform: rotate(-14deg) translateY(0); }
    50%     { transform: rotate(14deg) translateY(-4px); }
  }
  @keyframes udl-shadow {
    0%,100% { transform: scaleX(1); opacity:.18; }
    45%,55% { transform: scaleX(.55); opacity:.07; }
    80%     { transform: scaleX(1.1); opacity:.28; }
  }
  @keyframes udl-dot1 { 0%,80%,100%{transform:scaleY(.35);opacity:.35} 40%{transform:scaleY(1);opacity:1} }
  @keyframes udl-dot2 { 0%,80%,100%{transform:scaleY(.35);opacity:.35} 40%{transform:scaleY(1);opacity:1} }
  @keyframes udl-dot3 { 0%,80%,100%{transform:scaleY(.35);opacity:.35} 40%{transform:scaleY(1);opacity:1} }
  @keyframes udl-msg  { 0%{opacity:0;transform:translateY(5px)} 15%,85%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-3px)} }
  .udl-bounce { animation: udl-bounce .9s cubic-bezier(.36,.07,.19,.97) infinite; }
  .udl-blink  { animation: udl-blink 3.2s ease-in-out infinite; }
  .udl-arm-l  { animation: udl-arm-l .9s ease-in-out infinite; }
  .udl-arm-r  { animation: udl-arm-r .9s ease-in-out infinite .45s; }
  .udl-mag    { animation: udl-mag 1.8s ease-in-out infinite; }
  .udl-shadow { animation: udl-shadow .9s ease-in-out infinite; }
  .udl-dot1   { animation: udl-dot1 1.3s ease-in-out infinite; }
  .udl-dot2   { animation: udl-dot2 1.3s ease-in-out infinite .22s; }
  .udl-dot3   { animation: udl-dot3 1.3s ease-in-out infinite .44s; }
  .udl-msg    { animation: udl-msg 2.4s ease-in-out; }
`

export default function UdaanLoader({
  character = 'researcher',
  message,
  sub,
  size = 'md',
  className = '',
}) {
  const Char = CHARS[character] || CHARS.researcher
  const px = SIZES[size] || SIZES.md
  const messages = Array.isArray(message) ? message : message ? [message] : []
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2400)
    return () => clearInterval(t)
  }, [messages.length])

  return (
    <div className={`flex flex-col items-center justify-center gap-4 select-none ${className}`}>
      <style>{STYLES}</style>
      <svg
        width={px}
        height={px}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <Char px={px} />
      </svg>
      {messages.length > 0 && (
        <div className="text-center space-y-1 min-h-[40px]">
          <p key={idx} className="udl-msg text-sm font-bold text-[#1D1B18]">
            {messages[idx]}
          </p>
          {sub && <p className="text-xs text-[#9B9590]">{sub}</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Inline small loader for buttons / inside-card spinners.
 * Renders a tiny bouncing dot trio instead of the full character.
 */
export function MiniLoader({ color = '#8E4B49', className = '' }) {
  return (
    <span className={`inline-flex items-end gap-0.5 ${className}`} aria-hidden="true">
      <style>{`
        @keyframes udl-mini { 0%,80%,100%{transform:scaleY(.4);opacity:.4} 40%{transform:scaleY(1);opacity:1} }
        .udl-mini1{animation:udl-mini .9s ease-in-out infinite}
        .udl-mini2{animation:udl-mini .9s ease-in-out infinite .15s}
        .udl-mini3{animation:udl-mini .9s ease-in-out infinite .3s}
      `}</style>
      <span className="udl-mini1 inline-block w-1 h-3 rounded-full" style={{ background: color }} />
      <span className="udl-mini2 inline-block w-1 h-3 rounded-full" style={{ background: color }} />
      <span className="udl-mini3 inline-block w-1 h-3 rounded-full" style={{ background: color }} />
    </span>
  )
}
