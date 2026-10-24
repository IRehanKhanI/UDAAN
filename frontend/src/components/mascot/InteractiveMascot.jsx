import { useEffect, useRef, useState } from 'react'
import { Sparkles, Heart, Lightbulb, Compass, Hammer, Users, Rocket } from 'lucide-react'

/**
 * Interactive Duolingo-style mascot companion that:
 * 1. Tracks cursor movement with pupils and head tilt
 * 2. Changes costume / mood / props based on the current launchpad phase
 * 3. Shows animated speech bubble with smart, friendly tips
 * 4. Reacts to clicks with a joyful bounce & sound/hearts!
 */

const PHASE_CONFIGS = [
  {
    phase: 0,
    title: 'Visionary Phase',
    name: 'Pillars & Purpose',
    icon: Lightbulb,
    badgeColor: '#FF6B6B',
    bgColor: '#FFF1ED',
    bubbleTip: 'Every giant startup began with one clear sentence. What are we building today?',
    quotes: [
      'Simplicity wins every time! Keep the core idea punchy.',
      'Who will love this product first? Focus on them!',
      'Define success clearly so your roadmap has a target!',
    ],
  },
  {
    phase: 1,
    title: 'Detective Phase',
    name: 'Market Discovery',
    icon: Compass,
    badgeColor: '#F59E0B',
    bgColor: '#FFFBEB',
    bubbleTip: 'I am scanning the web for real competitors & market gaps for your idea!',
    quotes: [
      'Existing tools are too bloated—your edge is simplicity!',
      'Spot the pricing complaints; that is where you win.',
      'Check the sources on the right for real citations!',
    ],
  },
  {
    phase: 2,
    title: 'Builder Phase',
    name: 'Tech Architecture',
    icon: Hammer,
    badgeColor: '#10B981',
    bgColor: '#ECFDF5',
    bubbleTip: 'Pick your stack or click "+ Custom Stack" to build your dream architecture!',
    quotes: [
      'Next.js + Supabase will save you ~20 hours of backend setup!',
      'Watched the curated YouTube tutorials below? Zero fluff!',
      'You can create the repo directly with a GitHub Secret Key!',
    ],
  },
  {
    phase: 3,
    title: 'Coach Phase',
    name: 'Team & Schedule',
    icon: Users,
    badgeColor: '#8B5CF6',
    bgColor: '#F5F3FF',
    bubbleTip: 'Let us set realistic weekly hours so nobody gets burned out!',
    quotes: [
      'Two focused hours a day is better than an all-nighter.',
      'Assign clear roles so everyone knows their focus.',
      'Set a target launch deadline to keep momentum high!',
    ],
  },
  {
    phase: 4,
    title: 'Aviator Phase',
    name: 'Flight Plan & Roadmap',
    icon: Rocket,
    badgeColor: '#EC4899',
    bgColor: '#FDF2F8',
    bubbleTip: 'Ready for takeoff! Your milestones break the journey into bite-sized wins.',
    quotes: [
      'Check off tasks to fill the milestone progress bar!',
      'Sync milestones with Google Calendar in your profile!',
      'Milestone 1 is your foundation—conquer it first!',
    ],
  },
]

export default function InteractiveMascot({ phase = 0, className = '' }) {
  const mascotRef = useRef(null)
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 })
  const [tilt, setTilt] = useState(0)
  const [isWaving, setIsWaving] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [pokes, setPokes] = useState(0)
  const [showHearts, setShowHearts] = useState(false)

  const config = PHASE_CONFIGS[phase] || PHASE_CONFIGS[0]
  const currentTip = config.quotes[tipIndex % config.quotes.length] || config.bubbleTip

  // Cursor tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!mascotRef.current) return
      const rect = mascotRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const angle = Math.atan2(dy, dx)
      const distance = Math.min(Math.hypot(dx, dy), 300) / 300

      // Max eye pupil movement 5px
      const maxR = 5
      const px = Math.cos(angle) * maxR * distance
      const py = Math.sin(angle) * maxR * distance

      // Head tilt up to 8 degrees
      const targetTilt = Math.max(-8, Math.min(8, (dx / window.innerWidth) * 16))

      setPupilOffset({ x: px, y: py })
      setTilt(targetTilt)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handlePoke = () => {
    setIsWaving(true)
    setPokes((p) => p + 1)
    setShowHearts(true)
    setTipIndex((i) => i + 1)
    setTimeout(() => setIsWaving(false), 900)
    setTimeout(() => setShowHearts(false), 1400)
  }

  return (
    <div
      ref={mascotRef}
      className={`relative select-none flex flex-col items-center transition-transform duration-200 ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {/* Duolingo-style Speech Bubble */}
      <div
        onClick={() => setTipIndex((i) => i + 1)}
        className="mb-2 max-w-[210px] p-3 rounded-2xl bg-white border-2 shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 transition-all text-left relative group"
        style={{ borderColor: config.badgeColor }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: config.badgeColor }}
          />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1D1B18]">
            UDAAN PAL · {config.name}
          </span>
        </div>
        <p className="text-[11px] font-semibold text-[#3D3A37] leading-snug">
          "{currentTip}"
        </p>
        <span className="text-[9px] text-[#A09890] block mt-1 font-medium">
          Click me for more tips 💡
        </span>

        {/* Bubble pointer triangle */}
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px]"
          style={{ borderTopColor: config.badgeColor }}
        />
      </div>

      {/* Floating hearts on click */}
      {showHearts && (
        <div className="absolute -top-6 flex items-center gap-1 animate-bounce pointer-events-none">
          <Heart size={16} fill="#FF6B6B" className="text-[#FF6B6B]" />
          <Sparkles size={14} className="text-[#FFD93D]" />
        </div>
      )}

      {/* Interactive Mascot SVG Character */}
      <div
        onClick={handlePoke}
        className={`cursor-pointer transition-transform duration-300 ${isWaving ? 'scale-110' : 'hover:scale-105'}`}
        title="I am your UDAAN launch companion! Click me!"
      >
        <svg width="130" height="130" viewBox="0 0 140 140" fill="none">
          {/* Shadow */}
          <ellipse cx="70" cy="128" rx="36" ry="7" fill="#1D1B18" opacity="0.12" />

          {/* Body Base - Friendly Rounded Blob */}
          <g className={isWaving ? 'animate-bounce' : ''}>
            {/* Main Body */}
            <path
              d="M32 80 C32 40, 108 40, 108 80 C108 115, 32 115, 32 80 Z"
              fill={
                phase === 0 ? '#FF6B6B' :
                phase === 1 ? '#3B1F5E' :
                phase === 2 ? '#10B981' :
                phase === 3 ? '#6366F1' : '#EC4899'
              }
            />

            {/* Belly highlight */}
            <ellipse
              cx="70"
              cy="86"
              rx="24"
              ry="22"
              fill={
                phase === 0 ? '#FFE0DB' :
                phase === 1 ? '#E8B4D0' :
                phase === 2 ? '#D1FAE5' :
                phase === 3 ? '#E0E7FF' : '#FCE7F3'
              }
            />

            {/* Left Arm / Hand */}
            <g transform={isWaving ? 'rotate(-25 32 75)' : 'rotate(0)'}>
              <ellipse
                cx="26"
                cy="78"
                rx="7"
                ry="13"
                fill={
                  phase === 0 ? '#E05353' :
                  phase === 1 ? '#2E154A' :
                  phase === 2 ? '#059669' :
                  phase === 3 ? '#4F46E5' : '#DB2777'
                }
                transform="rotate(-15 26 78)"
              />
            </g>

            {/* Right Arm / Hand (Waves when poked or holds props) */}
            <g transform={isWaving ? 'rotate(35 114 75)' : 'rotate(0)'}>
              <ellipse
                cx="114"
                cy="78"
                rx="7"
                ry="13"
                fill={
                  phase === 0 ? '#E05353' :
                  phase === 1 ? '#2E154A' :
                  phase === 2 ? '#059669' :
                  phase === 3 ? '#4F46E5' : '#DB2777'
                }
                transform="rotate(15 114 78)"
              />

              {/* Prop in Right Hand according to phase */}
              {phase === 0 && (
                /* Lightbulb wand */
                <g transform="translate(112, 60)">
                  <circle cx="8" cy="8" r="7" fill="#FFD93D" stroke="#E5C029" strokeWidth="1.5" />
                  <rect x="6" y="15" width="4" height="12" rx="2" fill="#A08C75" />
                  <path d="M5 8 Q8 3 11 8" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
                </g>
              )}

              {phase === 1 && (
                /* Magnifying Glass */
                <g transform="translate(112, 58)">
                  <circle cx="8" cy="8" r="9" stroke="#FFD93D" strokeWidth="3" fill="#FFFFFF" fillOpacity="0.85" />
                  <line x1="14" y1="14" x2="22" y2="22" stroke="#FFD93D" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="6" cy="6" r="2" fill="#FFFFFF" />
                </g>
              )}

              {phase === 2 && (
                /* Golden Wrench / Code Hammer */
                <g transform="translate(112, 58)">
                  <rect x="7" y="10" width="6" height="20" rx="3" fill="#D97706" />
                  <circle cx="10" cy="8" r="7" fill="#F59E0B" />
                  <circle cx="10" cy="8" r="3" fill="#10B981" />
                </g>
              )}

              {phase === 3 && (
                /* Coach Whistle */
                <g transform="translate(110, 68)">
                  <circle cx="7" cy="7" r="6" fill="#F59E0B" />
                  <rect x="7" y="4" width="8" height="6" rx="2" fill="#D97706" />
                </g>
              )}

              {phase === 4 && (
                /* Mini Rocket */
                <g transform="translate(112, 55)">
                  <path d="M5 0 Q12 0 12 14 L0 14 Q0 0 5 0 Z" fill="#EF4444" />
                  <circle cx="6" cy="6" r="2.5" fill="#FFFFFF" />
                  <polygon points="6,14 2,22 10,22" fill="#F59E0B" />
                </g>
              )}
            </g>

            {/* Headgear based on Phase */}
            {phase === 2 && (
              /* Yellow Builder Hard Hat */
              <g transform="translate(42, 28)">
                <ellipse cx="28" cy="18" rx="28" ry="9" fill="#FFD93D" />
                <rect x="6" y="10" width="44" height="12" rx="6" fill="#FFD93D" />
                <rect x="14" y="6" width="28" height="6" rx="3" fill="#F59E0B" />
              </g>
            )}

            {phase === 1 && (
              /* Detective Hat */
              <g transform="translate(40, 26)">
                <ellipse cx="30" cy="18" rx="28" ry="7" fill="#5B3A7A" />
                <rect x="12" y="10" width="36" height="10" rx="4" fill="#5B3A7A" />
                <rect x="12" y="16" width="36" height="3" fill="#FFD93D" />
              </g>
            )}

            {phase === 4 && (
              /* Aviator Goggles */
              <g transform="translate(45, 42)">
                <rect x="0" y="3" width="50" height="4" fill="#1D1B18" rx="2" />
                <circle cx="12" cy="5" r="9" fill="#3B82F6" stroke="#1D1B18" strokeWidth="2.5" />
                <circle cx="38" cy="5" r="9" fill="#3B82F6" stroke="#1D1B18" strokeWidth="2.5" />
                <circle cx="10" cy="3" r="3" fill="#FFFFFF" opacity="0.8" />
                <circle cx="36" cy="3" r="3" fill="#FFFFFF" opacity="0.8" />
              </g>
            )}

            {/* Big Expressive Eyes */}
            <g>
              {/* Eye Whites */}
              <ellipse cx="58" cy="68" rx="10" ry="12" fill="#FFFFFF" stroke="#1D1B18" strokeWidth="2" />
              <ellipse cx="82" cy="68" rx="10" ry="12" fill="#FFFFFF" stroke="#1D1B18" strokeWidth="2" />

              {/* Pupils with cursor tracking */}
              <g transform={`translate(${pupilOffset.x}, ${pupilOffset.y})`}>
                <circle cx="58" cy="69" r="5.5" fill="#1D1B18" />
                <circle cx="82" cy="69" r="5.5" fill="#1D1B18" />
                {/* Catchlight sparkle */}
                <circle cx="60" cy="67" r="2" fill="#FFFFFF" />
                <circle cx="84" cy="67" r="2" fill="#FFFFFF" />
              </g>
            </g>

            {/* Cute Cheeks */}
            <ellipse cx="46" cy="78" rx="5" ry="3" fill="#FF8E8E" opacity="0.6" />
            <ellipse cx="94" cy="78" rx="5" ry="3" fill="#FF8E8E" opacity="0.6" />

            {/* Happy Beak / Smile */}
            <path
              d="M64 77 Q70 85 76 77 Z"
              fill="#FF9F1C"
              stroke="#1D1B18"
              strokeWidth="1.5"
            />

            {/* Feet */}
            <ellipse cx="58" cy="116" rx="9" ry="5" fill="#FF9F1C" />
            <ellipse cx="82" cy="116" rx="9" ry="5" fill="#FF9F1C" />
          </g>
        </svg>
      </div>

      {/* Mood tag badge */}
      <span
        className="mt-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-xs"
        style={{
          color: config.badgeColor,
          backgroundColor: config.bgColor,
          borderColor: config.badgeColor,
        }}
      >
        {config.title}
      </span>
    </div>
  )
}
