import { useState } from 'react'
import {
  ExternalLink,
  Plus,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  DollarSign,
  Users,
  Award,
  FileText,
  ArrowRight,
  Check,
  TrendingUp,
  Target,
  Zap,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'

// Curated playful, distinct color palettes & rich card images inspired by modern visual boards
const CARD_PALETTES = [
  {
    name: 'emerald',
    primary: '#059669',
    accent: '#047857',
    bg: '#F0FDF4',
    border: '#A7F3D0',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
    iconBg: '#10B981',
    lightBorder: '#D1FAE5',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80', // Financial analytics & charts
    tag: 'Academic Calendars',
    emoji: '📅',
  },
  {
    name: 'purple',
    primary: '#7C3AED',
    accent: '#6D28D9',
    bg: '#FAF5FF',
    border: '#DDD6FE',
    badgeBg: '#EDE9FE',
    badgeText: '#5B21B6',
    iconBg: '#8B5CF6',
    lightBorder: '#EDE9FE',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80', // Colorful dashboard visuals
    tag: 'Long-Term Pacing',
    emoji: '📊',
  },
  {
    name: 'coral',
    primary: '#E76F51',
    accent: '#C85A3D',
    bg: '#FFF8F6',
    border: '#FFD8CF',
    badgeBg: '#FFEAE5',
    badgeText: '#9C2A10',
    iconBg: '#E76F51',
    lightBorder: '#FFE2DB',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80', // Student collaboration
    tag: 'Cash & Frictionless',
    emoji: '💵',
  },
  {
    name: 'amber',
    primary: '#D97706',
    accent: '#B45309',
    bg: '#FFFDF5',
    border: '#FDE68A',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    iconBg: '#F59E0B',
    lightBorder: '#FEF08A',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80', // Savings & coins
    tag: 'Financial Literacy',
    emoji: '🎓',
  },
  {
    name: 'blue',
    primary: '#2563EB',
    accent: '#1D4ED8',
    bg: '#F8FAFF',
    border: '#BFDBFE',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
    iconBg: '#3B82F6',
    lightBorder: '#DBEAFE',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80', // Mobile interface & graph
    tag: 'Irregular Aid & Jobs',
    emoji: '⚡',
  },
  {
    name: 'rose',
    primary: '#E11D48',
    accent: '#BE123C',
    bg: '#FFF5F7',
    border: '#FECDD3',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
    iconBg: '#F43F5E',
    lightBorder: '#FFE4E6',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80', // Creative work session
    tag: 'Goal Milestones',
    emoji: '🎯',
  },
]

// Convert long prose into bulleted points
function formatIntoPoints(text = '', maxPoints = 3) {
  if (!text) return []
  // Split on semicolons, periods followed by space, or commas if very long
  const rawSegments = text
    .split(/;\s*|\.\s+|\n+/)
    .map((s) => s.trim().replace(/^[-–•*]\s*/, ''))
    .filter((s) => s.length > 5)

  if (rawSegments.length >= 2) {
    return rawSegments.slice(0, maxPoints)
  }

  // If single sentence with commas
  const commaSplit = text.split(/,\s+and\s+|,\s+/).filter((s) => s.length > 8)
  if (commaSplit.length >= 2) {
    return commaSplit.slice(0, maxPoints)
  }

  return [text]
}

export function formatRupeesText(text) {
  if (!text || typeof text !== 'string') return text
  return text.replace(/\$\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, (_, numStr) => {
    const num = parseFloat(numStr.replace(/,/g, ''))
    if (isNaN(num)) return _
    if (num === 0) return '₹0'
    const inr = Math.round(num * 85)
    return `₹${inr.toLocaleString('en-IN')}`
  })
}

export default function MarketRadarView({
  radarData,
  onAddExperiment,
  addingExperimentId = null,
}) {
  const [filter, setFilter] = useState('all') // 'all' | 'competitors' | 'complaints' | 'experiments'

  if (!radarData || (!radarData.competitors?.length && !radarData.customer_voice?.length)) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-[#EFEAE4] text-center space-y-3">
        <Sparkles size={28} className="mx-auto text-[#FFAAA6]" />
        <h3 className="text-base font-bold text-[#1D1B18]">Market Radar Gathering Intelligence</h3>
        <p className="text-xs text-[#534342] max-w-md mx-auto">
          Market research is currently scanning live web evidence from Tavily AI Search for competitor pricing and customer pain points.
        </p>
      </div>
    )
  }

  const {
    summary = '',
    competitors = [],
    customer_voice = [],
    citations = [],
    validation_experiments = [],
  } = radarData

  return (
    <div className="space-y-7 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#FFF5F2] via-[#FFF8F5] to-[#FFF0EC] rounded-3xl p-5 md:p-6 border border-[#FFAAA6]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E4B49] animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A3C3A]">
              Visual Market Intelligence · Live Web Grounded
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[#1D1B18] tracking-tight">
            Competitor Matrix & Customer Voice
          </h2>
          <p className="text-xs text-[#534342] max-w-2xl leading-relaxed">
            {summary || 'Visual intelligence cards breaking down competitor weaknesses, direct user friction points, and actionable validation steps.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-[#EFEAE4] text-xs font-bold text-[#1D1B18] shadow-xs shrink-0">
          <ShieldCheck size={16} className="text-[#059669]" />
          <span>{citations.length} Grounded Sources</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFEAE4] pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: `All Visual Cards (${competitors.length + customer_voice.length + validation_experiments.length})` },
          { id: 'competitors', label: `Competitor Matrix (${competitors.length})` },
          { id: 'complaints', label: `Voice of Customer (${customer_voice.length})` },
          { id: 'experiments', label: `Validation Experiments (${validation_experiments.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === tab.id
                ? 'bg-[#1D1B18] text-white shadow-sm'
                : 'bg-white text-[#534342] hover:bg-[#FAF8F5] border border-[#EFEAE4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 1. COMPETITOR COMPARISON MATRIX (COLORFUL VISUAL CARDS) ─── */}
      {(filter === 'all' || filter === 'competitors') && competitors.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center font-bold text-xs">
                ₹
              </span>
              <span>Competitor Comparison & Public Pricing</span>
            </h3>
            <span className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
              Real Market Benchmarks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {competitors.map((comp, idx) => {
              const theme = CARD_PALETTES[idx % CARD_PALETTES.length]
              const points = formatIntoPoints(comp.positioning, 3)

              return (
                <div
                  key={idx}
                  className="rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  }}
                >
                  {/* Card Image Banner */}
                  <div className="relative h-32 w-full overflow-hidden bg-black/5">
                    <img
                      src={theme.image}
                      alt={comp.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Badge Over Image */}
                    <div className="absolute top-3 left-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {theme.tag}
                      </span>
                    </div>

                    {/* Pricing Pill */}
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2.5 py-1 rounded-xl bg-white/95 text-[#1D1B18] text-xs font-black shadow-xs font-mono">
                        {formatRupeesText(comp.pricing) || 'Free / Freemium'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 text-white font-black text-base drop-shadow-sm truncate max-w-[65%]">
                      {comp.name}
                    </div>
                  </div>

                  {/* Card Body with Clean Bullet Points */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C766F] flex items-center gap-1">
                        <TrendingUp size={12} style={{ color: theme.primary }} />
                        <span>Key Points & Observations</span>
                      </div>

                      <ul className="space-y-1.5">
                        {points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2 text-xs text-[#2D2A26] leading-relaxed">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                              style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                            >
                              ✓
                            </span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Strengths / Weaknesses Badges */}
                      {Array.isArray(comp.weaknesses) && comp.weaknesses.length > 0 && (
                        <div className="pt-2 border-t border-black/5 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#991B1B] block">
                            ⚠️ What they lack (Your Opportunity):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {comp.weaknesses.map((w, wIdx) => (
                              <span
                                key={wIdx}
                                className="text-[10.5px] px-2 py-0.5 rounded-md bg-white/80 border border-[#FCA5A5] text-[#991B1B] font-medium"
                              >
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-[#7C766F]">
                      <span className="font-semibold">Presence: {comp.market_share ? `~${comp.market_share} share` : 'Standard Web'}</span>
                      <span
                        className="font-bold text-[10.5px] px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#FFFFFF', color: theme.primary, border: `1px solid ${theme.border}` }}
                      >
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── 2. VOICE OF THE CUSTOMER (COLORFUL CARDS WITH POINTS & IMAGES) ─── */}
      {(filter === 'all' || filter === 'complaints') && customer_voice.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center font-bold text-xs">
                🗣
              </span>
              <span>Voice of the Customer (Public Complaints & Unmet Needs)</span>
            </h3>
            <span className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
              {customer_voice.length} Verified Friction Points
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {customer_voice.map((item, idx) => {
              const theme = CARD_PALETTES[idx % CARD_PALETTES.length]
              const complaintPoints = formatIntoPoints(item.user_complaint || item.excerpt || '', 2)

              return (
                <div
                  key={idx}
                  className="rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  }}
                >
                  {/* Top Image & Header */}
                  <div className="relative h-28 w-full overflow-hidden bg-black/5">
                    <img
                      src={theme.image}
                      alt={item.pain_point}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {item.source || item.source_type || 'User Review'}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white font-bold text-xs sm:text-sm line-clamp-1 drop-shadow-sm">
                      {item.pain_point}
                    </div>
                  </div>

                  {/* Bulleted Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#7C766F] flex items-center gap-1">
                        <AlertCircle size={12} style={{ color: theme.primary }} />
                        <span>What Users Are Saying (Bullet Points)</span>
                      </div>

                      <ul className="space-y-1.5">
                        {complaintPoints.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2 text-xs text-[#1D1B18] leading-relaxed">
                            <span
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                              style={{ backgroundColor: theme.badgeBg, color: theme.primary }}
                            >
                              •
                            </span>
                            <span className="italic">"{pt}"</span>
                          </li>
                        ))}
                      </ul>

                      {/* Strategic Opportunity */}
                      {item.opportunity && (
                        <div
                          className="mt-2.5 p-2.5 rounded-xl border space-y-0.5"
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderColor: theme.border,
                          }}
                        >
                          <span
                            className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                            style={{ color: theme.primary }}
                          >
                            <Lightbulb size={11} /> Opportunity for your product:
                          </span>
                          <p className="text-[11px] text-[#2D2A26] font-medium leading-snug">
                            {item.opportunity}
                          </p>
                        </div>
                      )}
                    </div>

                    {item.url && (
                      <div className="pt-2 border-t border-black/5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline"
                          style={{ color: theme.accent }}
                        >
                          <span>Inspect Original Forum Post</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── 3. ACTIONABLE VALIDATION EXPERIMENTS (COLORFUL, PLAYFUL BOARD) ─── */}
      {(filter === 'all' || filter === 'experiments') && validation_experiments.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#D1FAE5] text-[#065F46] flex items-center justify-center font-bold text-xs">
                🧪
              </span>
              <span>Actionable Validation Experiments (Add to Roadmap)</span>
            </h3>
            <span className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
              De-risk before building
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {validation_experiments.map((exp, idx) => {
              const theme = CARD_PALETTES[(idx + 2) % CARD_PALETTES.length]
              const isAdding = addingExperimentId === exp.id

              return (
                <div
                  key={exp.id || idx}
                  className="rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  }}
                >
                  {/* Top Image Banner */}
                  <div className="relative h-28 w-full overflow-hidden bg-black/5">
                    <img
                      src={theme.image}
                      alt={exp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-xs"
                        style={{
                          backgroundColor: theme.badgeBg,
                          color: theme.badgeText,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        {exp.experiment_type || 'Customer Discovery'}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-lg bg-white/95 text-[10px] font-black font-mono shadow-xs text-[#1D1B18]">
                        {formatRupeesText(exp.estimated_cost) || 'Low Cost'}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-white font-bold text-xs sm:text-sm line-clamp-1 drop-shadow-sm">
                      {exp.title}
                    </div>
                  </div>

                  {/* Bulleted Points */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="bg-white/90 rounded-2xl p-3 border border-black/5 space-y-2 text-xs">
                        <div className="flex items-start gap-1.5">
                          <Target size={13} style={{ color: theme.primary }} className="shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[#1D1B18] block font-bold">Hypothesis:</strong>
                            <span className="text-[#534342]">{exp.hypothesis}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 pt-1 border-t border-black/5">
                          <CheckCircle2 size={13} className="text-[#059669] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-[#1D1B18] block font-bold">Pass Metric:</strong>
                            <span className="text-[#059669] font-bold">{exp.pass_fail_metric}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => onAddExperiment && onAddExperiment(exp)}
                      disabled={isAdding}
                      className="w-full py-2.5 px-4 rounded-2xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 hover:opacity-95"
                      style={{
                        backgroundColor: '#1D1B18',
                      }}
                    >
                      {isAdding ? (
                        <span className="animate-spin text-sm">⏳</span>
                      ) : (
                        <Plus size={15} />
                      )}
                      <span>{isAdding ? 'Adding to Milestone 1...' : '+ Add Experiment to Roadmap'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ─── 4. VERIFIED CITATIONS & WEB SOURCES ─── */}
      {citations.length > 0 && (
        <section className="bg-white rounded-3xl p-5 md:p-6 border border-[#EFEAE4] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <FileText size={15} className="text-[#7C766F]" />
              <span>Verified Web Citations & Discovery Sources</span>
            </h3>
            <span className="text-[10px] text-[#7C766F] font-mono">{citations.length} records</span>
          </div>

          <div className="divide-y divide-[#EFEAE4]">
            {citations.map((cite, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        cite.badge === 'Verified Web Evidence'
                          ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                          : 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                      }`}
                    >
                      {cite.badge || 'Verified Web Evidence'}
                    </span>
                    <a
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#1D1B18] hover:text-[#8E4B49] hover:underline flex items-center gap-1"
                    >
                      <span>{cite.title}</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <p className="text-[11px] text-[#534342] line-clamp-1">{cite.excerpt}</p>
                </div>
                <span className="text-[10px] font-mono text-[#7C766F] shrink-0">{cite.retrieval_date || 'Recent'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
