import { useState, useMemo } from 'react'
import {
  HelpCircle, Sparkles, CheckCircle2, AlertCircle, ArrowRight,
  DollarSign, Users, Briefcase, FileText, Check, ExternalLink, RefreshCw
} from 'lucide-react'
import ConfidenceTag from '../ConfidenceTag.jsx'
import { formatCurrency } from '../FormatCurrency.js'

export default function OverviewTab({
  data = {},
  onChange = () => {},
  currency = 'INR',
  project = {},
  market = 'India',
  onMarketChange = () => {},
  onResearch = () => {},
  researching = false,
  researchError = '',
}) {
  const overview = data.overview || {}
  const [clarityTested, setClarityTested] = useState(false)

  const updateField = (key, value) => {
    onChange('overview', { ...overview, [key]: value })
  }

  // 15-word purpose validation
  const purpose = overview.one_line_purpose || project?.description || ''
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 shrink-0">
            <label className="grid gap-1 text-[10px] font-bold text-[#7C766F]">
              Research market
              <input
                type="text"
                value={market}
                onChange={event => onMarketChange(event.target.value)}
                maxLength={120}
                placeholder="e.g. India"
                className="w-full sm:w-36 px-2.5 py-2 rounded-lg border border-[#EFEAE4] bg-white text-xs font-semibold text-[#1D1B18] outline-none focus:ring-1 focus:ring-[#FF6B6B]"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                setClarityTested(true)
                await onResearch()
              }}
              disabled={researching || !market.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1D1B18] hover:bg-black text-white text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {researching ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{researching ? 'Researching market…' : 'AI Clarity & Market Research'}</span>
            </button>
          </div>
        </div>
        {researchError && <p className="text-xs font-semibold text-[#B42318]" role="alert">{researchError}</p>}
        {clarityTested && !researching && !researchError && (
          <p className="text-[10px] text-[#7C766F]" role="status">
            AI suggestions are estimates. Review the research and sources below before relying on them.
          </p>
        )}
      </div>

      {data.market_research && (
        <section className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">AI-assisted market research · {data.market_research.market || market}</span>
              <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">Customer and pricing hypotheses</h3>
              <p className="text-xs text-[#7C766F] mt-1">{data.market_research.summary}</p>
            </div>
            <span className="rounded-full bg-[#FAF5FF] px-2.5 py-1 text-[10px] font-bold text-[#7E22CE]">Unverified estimates</span>
          </div>
          {data.market_research.key_findings?.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.market_research.key_findings.map((finding, index) => (
                <li key={`${index}-${finding}`} className="rounded-xl bg-[#FAF8F5] p-3 text-xs leading-relaxed text-[#534342]">{finding}</li>
              ))}
            </ul>
          )}
          {data.market_research.assumptions?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-[#534342]">Assumptions to verify</h4>
              <ul className="mt-1 list-disc pl-5 text-[11px] leading-relaxed text-[#7C766F]">
                {data.market_research.assumptions.map((assumption, index) => <li key={`${index}-${assumption}`}>{assumption}</li>)}
              </ul>
            </div>
          )}
          {data.market_research.validation_questions?.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-[#534342]">Questions for customer interviews</h4>
              <ul className="mt-1 list-disc pl-5 text-[11px] leading-relaxed text-[#7C766F]">
                {data.market_research.validation_questions.map((question, index) => <li key={`${index}-${question}`}>{question}</li>)}
              </ul>
            </div>
          )}
          {data.market_research.sources?.length > 0 ? (
            <div>
              <h4 className="text-[11px] font-bold text-[#534342]">Research sources</h4>
              <ul className="mt-1 grid gap-1.5 sm:grid-cols-2">
                {data.market_research.sources.map(source => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 text-[11px] font-semibold text-[#2563EB] hover:underline">
                      <ExternalLink size={12} className="mt-0.5 shrink-0" />
                      <span>{source.title}{source.snippet && <span className="mt-0.5 block font-normal text-[#7C766F]">{source.snippet}</span>}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg bg-[#FFFBEB] p-3 text-[11px] leading-relaxed text-[#92400E]">
              {data.market_research.evidence_note || 'Live sources were unavailable; treat these as unverified estimates.'}
            </p>
          )}
          {data.market_research.sources?.length > 0 && (
            <p className="text-[10px] leading-relaxed text-[#7C766F]">{data.market_research.evidence_note}</p>
          )}
        </section>
      )}

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
