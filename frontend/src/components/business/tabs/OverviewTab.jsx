import { useState, useMemo } from 'react'
import {
  HelpCircle, Sparkles, CheckCircle2, AlertCircle, ArrowRight,
  DollarSign, Users, Briefcase, FileText, Check
} from 'lucide-react'
import ConfidenceTag from '../ConfidenceTag.jsx'
import { formatCurrency } from '../FormatCurrency.js'

export default function OverviewTab({
  data = {},
  onChange = () => {},
  currency = 'INR',
  project = {},
}) {
  const overview = data.overview || {}
  const [clarityTested, setClarityTested] = useState(false)

  const updateField = (key, value) => {
    onChange('overview', { ...overview, [key]: value })
  }

  // 15-word purpose validation
  const purpose = overview.one_line_purpose || project.description || ''
  const words = useMemo(() => purpose.trim().split(/\s+/).filter(Boolean), [purpose])
  const wordCount = words.length
  const isWordCountValid = wordCount > 0 && wordCount <= 15

  // Stranger clarity score calculation
  const clarityScore = useMemo(() => {
    if (wordCount === 0) return 0
    let score = 70
    if (wordCount <= 15) score += 15
    else score -= Math.min(30, (wordCount - 15) * 5)

    // Jargon penalty
    const jargon = ['synergistic', 'paradigm', 'blockchain-powered', 'revolutionary', 'best-of-breed', 'disrupt']
    const hasJargon = jargon.some(j => purpose.toLowerCase().includes(j))
    if (hasJargon) score -= 15

    // Concrete problem/audience bonus
    if (/for\s+[a-z]+/i.test(purpose) || /helps\s+[a-z]+/i.test(purpose)) score += 15
    return Math.max(20, Math.min(98, score))
  }, [purpose, wordCount])

  const clarityFeedback = useMemo(() => {
    if (clarityScore >= 85) return 'Super clear. A stranger on the street can easily understand and repeat this back.'
    if (clarityScore >= 65) return 'Good clarity. Consider making who benefits even more explicit.'
    return 'Too complex or lengthy. Aim for under 15 words explaining who benefits and what problem is solved.'
  }, [clarityScore])

  return (
    <div className="space-y-6">
      {/* ── Card 1: One-Line Purpose & Clarity Test ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
              Core Value Proposition
            </span>
            <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
              One-Line Purpose (Max 15 words)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isWordCountValid
                  ? 'bg-[#EBF7EE] text-[#1E824C]'
                  : 'bg-[#FEE2E2] text-[#DC2626]'
              }`}
            >
              {wordCount} / 15 words
            </span>
          </div>
        </div>

        <div>
          <textarea
            rows="2"
            value={purpose}
            onChange={(e) => updateField('one_line_purpose', e.target.value)}
            placeholder="e.g. Autonomous drone inspecting solar farms in 15 minutes, cutting maintenance costs by 60%."
            className="w-full p-3 rounded-xl border border-[#EFEAE4] text-xs font-medium text-[#1D1B18] focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent outline-none transition-all placeholder:text-[#A09890]"
          />
          <p className="text-[11px] text-[#7C766F] mt-1">
            Investors evaluate if a stranger at an airport could repeat your concept accurately after 10 seconds.
          </p>
        </div>

        {/* Clarity Test Widget */}
        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EFEAE4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-[#EFEAE4] flex flex-col items-center justify-center shrink-0 shadow-xs">
              <span className="text-sm font-black text-[#1D1B18] leading-none">
                {clarityScore}%
              </span>
              <span className="text-[9px] font-bold text-[#8C847E] mt-0.5">CLARITY</span>
            </div>
            <div>
              <span className="text-xs font-bold text-[#1D1B18] block">
                Stranger Repeatability Score
              </span>
              <p className="text-[11px] text-[#666] leading-relaxed">
                {clarityFeedback}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setClarityTested(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#1D1B18] hover:bg-black text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
          >
            <Sparkles size={13} />
            <span>AI Clarity Check</span>
          </button>
        </div>
      </div>

      {/* ── Card 2: Who Pays, How Much, To Whom (Transaction Architecture) ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-5">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            Exchange Dynamics
          </span>
          <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
            Transaction Architecture: Who Pays, How Much, To Whom
          </h3>
          <p className="text-xs text-[#7C766F] mt-0.5">
            Specify the exact buyer, economic price point, and legal billing entity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Who Pays */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#534342] flex items-center gap-1.5">
                <Users size={14} className="text-[#0284C7]" />
                Who Pays?
              </span>
              <ConfidenceTag
                status={overview.who_pays_confidence || 'verified'}
                onChange={(st) => updateField('who_pays_confidence', st)}
                editable
              />
            </div>
            <input
              type="text"
              value={overview.who_pays || ''}
              onChange={(e) => updateField('who_pays', e.target.value)}
              placeholder="e.g. Solar Plant Operations Heads"
              className="w-full px-3 py-2 rounded-lg border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Specific decision maker holding the corporate budget.
            </p>
          </div>

          {/* How Much */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#534342] flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#10B981]" />
                How Much?
              </span>
              <ConfidenceTag
                status={overview.how_much_confidence || 'single_source'}
                onChange={(st) => updateField('how_much_confidence', st)}
                editable
              />
            </div>
            <input
              type="text"
              value={overview.how_much || ''}
              onChange={(e) => updateField('how_much', e.target.value)}
              placeholder="e.g. ₹45,000 / month / site"
              className="w-full px-3 py-2 rounded-lg border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Pricing model (subscription, one-time checkout, or commission).
            </p>
          </div>

          {/* To Whom */}
          <div className="p-4 rounded-xl bg-[#FFFDFB] border border-[#EFEAE4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#534342] flex items-center gap-1.5">
                <Briefcase size={14} className="text-[#8B5CF6]" />
                To Whom?
              </span>
              <ConfidenceTag
                status={overview.to_whom_confidence || 'verified'}
                onChange={(st) => updateField('to_whom_confidence', st)}
                editable
              />
            </div>
            <input
              type="text"
              value={overview.to_whom || ''}
              onChange={(e) => updateField('to_whom', e.target.value)}
              placeholder="e.g. Direct SaaS Subscription Entity"
              className="w-full px-3 py-2 rounded-lg border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
            <p className="text-[10px] text-[#8C847E]">
              Direct to startup entity or merchant payout mechanism.
            </p>
          </div>
        </div>
      </div>

      {/* ── Card 3: Quantified Customer Pain ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
            Problem Quantification
          </span>
          <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
            Customer Pain Quantifier (in ₹ or hrs/week)
          </h3>
          <p className="text-xs text-[#7C766F] mt-0.5">
            Investors require quantified monetary or operational pain before believing customer willingness-to-pay.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              Quantified Pain Metric
            </label>
            <input
              type="text"
              value={overview.quantified_pain || ''}
              onChange={(e) => updateField('quantified_pain', e.target.value)}
              placeholder="e.g. ₹1.2 Lakh/year lost per MW due to undetected dust hotspots"
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-medium text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#534342]">
              How They Solve It Today (Current Workaround)
            </label>
            <input
              type="text"
              value={overview.current_workaround || ''}
              onChange={(e) => updateField('current_workaround', e.target.value)}
              placeholder="e.g. Manual thermal gun walks taking 4 engineers 3 days each month"
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs font-medium text-[#1D1B18] focus:ring-1 focus:ring-[#FF6B6B] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
