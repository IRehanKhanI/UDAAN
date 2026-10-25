import { useState } from 'react'
import { Shield, Sparkles, Compass, CheckCircle2, AlertCircle, Plus, Trash2 } from 'lucide-react'
import ConfidenceTag from '../ConfidenceTag.jsx'

const BARRIER_DEFS = [
  { id: 'tech', label: 'Technical & Proprietary IP', desc: 'Proprietary algorithms, hardware patents, unique architecture difficult to clone.' },
  { id: 'data', label: 'Data Moat & Learning Loops', desc: 'Feedback loops where usage generates training data that continuously refines accuracy.' },
  { id: 'network', label: 'Network Effects', desc: 'Product becomes more valuable to every user as new participants join the network.' },
  { id: 'switching', label: 'High Switching Costs', desc: 'Deep workflow or database integration making displacement prohibitively painful.' },
  { id: 'regulation', label: 'Regulatory & Compliance', desc: 'Certifications, government licenses, or compliance standards that bar easy entrants.' },
  { id: 'cost', label: 'Scale / Economies of Scale', desc: 'Supply-chain or distribution advantages enabling significantly lower cost-per-unit.' },
]

export default function MoatWhyNowTab({
  data = {},
  onChange = () => {},
}) {
  const moat = data.moat_why_now || {}

  const updateMoat = (key, value) => {
    onChange('moat_why_now', { ...moat, [key]: value })
  }

  const barrierRatings = moat.barrier_ratings || {
    tech: 'Strong',
    data: 'Strong',
    network: 'Weak',
    switching: 'Strong',
    regulation: 'None',
    cost: 'Weak',
  }

  const handleRatingChange = (barrierId, rating) => {
    updateMoat('barrier_ratings', {
      ...barrierRatings,
      [barrierId]: rating,
    })
  }

  // 2x2 Positioning Map Axes
  const xAxisLabel = moat.x_axis_label || 'Ease of Integration'
  const yAxisLabel = moat.y_axis_label || 'Automation & Accuracy'

  const competitors = moat.competitors || [
    { name: 'Traditional Workarounds', x: 25, y: 30, isSelf: false },
    { name: 'Legacy Enterprise Tool', x: 35, y: 75, isSelf: false },
    { name: 'Niche Point Solution', x: 70, y: 40, isSelf: false },
    { name: 'Our Project (UDAAN)', x: 82, y: 88, isSelf: true },
  ]

  // Macro drivers
  const whyNowDrivers = moat.why_now_drivers || [
    { force: 'Edge AI Sensors dropped 70% in cost, enabling real-time local inference on low-power devices.', source: 'Hardware Cost Index 2026' },
    { force: 'Government solar infrastructure mandates requiring quarterly digital compliance audits.', source: 'National Renewable Energy Policy' },
    { force: 'Widespread developer adoption of unified API standards removing integration friction.', source: 'Developer Ecosystem Census' },
  ]

  return (
    <div className="space-y-6">
      {/* ── 6 Defensibility Barriers ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            DEFENSIBILITY MATRIX
          </span>
          <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
            The 6 Moat Barriers: Why Can&apos;t a Giant Copy This?
          </h3>
          <p className="text-xs text-[#7C766F] mt-0.5">
            Investors ruthlessly evaluate defensibility. Rate each barrier honestly as Strong, Weak, or None.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BARRIER_DEFS.map((b) => {
            const currentRating = barrierRatings[b.id] || 'Weak'
            return (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#1D1B18]">
                      {b.label}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[#7C766F] mt-1 leading-snug">
                    {b.desc}
                  </p>
                </div>

                {/* Rating toggle buttons */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-[#EFEAE4]/60">
                  {['Strong', 'Weak', 'None'].map((rating) => {
                    const isSelected = currentRating === rating
                    const colorClass =
                      rating === 'Strong'
                        ? isSelected ? 'bg-[#15803D] text-white' : 'hover:bg-[#F0FDF4] text-[#15803D]'
                        : rating === 'Weak'
                        ? isSelected ? 'bg-[#D97706] text-white' : 'hover:bg-[#FEF3C7] text-[#D97706]'
                        : isSelected ? 'bg-[#6B7280] text-white' : 'hover:bg-[#F3F4F6] text-[#6B7280]'

                    return (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleRatingChange(b.id, rating)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all border border-transparent ${colorClass}`}
                      >
                        {rating}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 2x2 Positioning Map ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            MARKET RADAR
          </span>
          <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
            2x2 Competitive Positioning Map
          </h3>
          <p className="text-xs text-[#7C766F] mt-0.5">
            Visual differentiation map highlighting where your project dominates compared to incumbents and workarounds.
          </p>
        </div>

        {/* Custom Axes Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-[#534342] block mb-1">
              Horizontal (X-Axis) Dimension
            </label>
            <input
              type="text"
              value={xAxisLabel}
              onChange={(e) => updateMoat('x_axis_label', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18]"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#534342] block mb-1">
              Vertical (Y-Axis) Dimension
            </label>
            <input
              type="text"
              value={yAxisLabel}
              onChange={(e) => updateMoat('y_axis_label', e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18]"
            />
          </div>
        </div>

        {/* Interactive 2x2 Graph Canvas */}
        <div className="relative w-full aspect-16/9 max-h-[380px] bg-[#FAF8F5] rounded-2xl border border-[#EFEAE4] p-6 flex items-center justify-center overflow-hidden">
          {/* Axis Lines */}
          <div className="absolute inset-x-8 top-1/2 h-[1px] bg-[#DDD6CE]" />
          <div className="absolute inset-y-8 left-1/2 w-[1px] bg-[#DDD6CE]" />

          {/* Axis Labels */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-[#8C847E] uppercase tracking-wider">
            Low ← {yAxisLabel} → High
          </span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#8C847E] uppercase tracking-wider">
            Low ← {xAxisLabel} → High
          </span>

          {/* Quadrant Soft Tint Top-Right (Winning Zone) */}
          <div className="absolute right-8 top-8 bottom-1/2 left-1/2 bg-[#EBF7EE]/40 pointer-events-none rounded-tr-xl border border-dashed border-[#86EFAC]/40" />

          {/* Competitor Dots */}
          {competitors.map((c, i) => (
            <div
              key={i}
              style={{ left: `${c.x}%`, bottom: `${c.y}%` }}
              className={`absolute -translate-x-1/2 translate-y-1/2 flex items-center gap-1.5 z-20 cursor-default select-none ${
                c.isSelf ? 'scale-110' : ''
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shadow-sm ${
                  c.isSelf
                    ? 'bg-[#FF6B6B] ring-4 ring-[#FF6B6B]/30'
                    : 'bg-[#64748B] ring-2 ring-white'
                }`}
              >
                {c.isSelf && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-xs border ${
                  c.isSelf
                    ? 'bg-[#1D1B18] text-white border-black'
                    : 'bg-white text-[#534342] border-[#EFEAE4]'
                }`}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why Now Macro Drivers ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#F59E0B]" />
          <h3 className="text-base font-bold text-[#1D1B18]">
            &quot;Why Now?&quot; Inflection Drivers
          </h3>
        </div>
        <p className="text-xs text-[#7C766F]">
          Why wasn&apos;t this product viable 3 years ago, and why will it be inevitable in 2 years?
        </p>

        <div className="space-y-2.5">
          {whyNowDrivers.map((d, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#1D1B18]">
                  {d.force}
                </p>
                <span className="text-[10px] font-bold text-[#8C847E] block">
                  Source: {d.source}
                </span>
              </div>
              <ConfidenceTag status="verified" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
