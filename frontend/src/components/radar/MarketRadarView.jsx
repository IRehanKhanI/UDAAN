import { useState } from 'react'
import {
  ExternalLink, Plus, Sparkles, CheckCircle2, ShieldCheck,
  AlertCircle, DollarSign, Users, Award, FileText, ArrowRight
} from 'lucide-react'

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
    <div className="space-y-6 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#FFF1ED] rounded-3xl p-5 md:p-6 border border-[#FFAAA6]/50 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8E4B49] animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A3C3A]">
              Live Market Radar · Tavily AI Web Grounding
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#1D1B18]">Competitor Matrix & Customer Voice</h2>
          <p className="text-xs text-[#534342] max-w-2xl leading-relaxed">
            {summary || 'Grounded competitive intelligence, verified pricing tiers, and public user complaints extracted from web forums and review sites.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18] shadow-xs">
          <ShieldCheck size={16} className="text-[#2A5D54]" />
          <span>{citations.length} Verified Citations</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EFEAE4] pb-3 overflow-x-auto">
        {[
          { id: 'all', label: `All Intelligence (${competitors.length + customer_voice.length + validation_experiments.length})` },
          { id: 'competitors', label: `Competitor Matrix (${competitors.length})` },
          { id: 'complaints', label: `Voice of Customer (${customer_voice.length})` },
          { id: 'experiments', label: `Validation Experiments (${validation_experiments.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filter === tab.id
                ? 'bg-[#1D1B18] text-white shadow-xs'
                : 'bg-white text-[#534342] hover:bg-[#F9F2ED] border border-[#EFEAE4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Competitor Comparison Matrix */}
      {(filter === 'all' || filter === 'competitors') && competitors.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={16} className="text-[#705D1B]" />
              <span>Competitor Comparison & Public Pricing</span>
            </h3>
            <span className="text-[11px] text-[#7C766F] font-mono">Real Market Benchmarks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((comp, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-bold text-[#1D1B18] group-hover:text-[#8E4B49] transition-colors">
                      {comp.name}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FBE191]/40 border border-[#FBE191] text-[#705D1B] text-[10px] font-bold font-mono">
                      {comp.pricing || 'Custom / Contact'}
                    </span>
                  </div>

                  <p className="text-xs text-[#534342] font-medium leading-relaxed">
                    {comp.positioning}
                  </p>

                  {comp.core_features && comp.core_features.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold text-[#7C766F] uppercase">Features</span>
                      <ul className="space-y-1">
                        {comp.core_features.map((feat, fIdx) => (
                          <li key={fIdx} className="text-[11px] text-[#534342] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFAAA6]"></span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#EFEAE4] flex items-center justify-between text-[11px] text-[#7C766F]">
                  <span>Presence: {comp.market_presence || 'Standard Web'}</span>
                  <span className="font-mono text-[10px] text-[#8E4B49] font-semibold">Grounded</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Voice of the Customer (Public Complaints & Pain Points) */}
      {(filter === 'all' || filter === 'complaints') && customer_voice.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#8E4B49]" />
              <span>Voice of the Customer (Public Complaints & Unmet Needs)</span>
            </h3>
            <span className="text-[11px] text-[#7C766F]">Extracted from user forums & reviews</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customer_voice.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs hover:border-[#FFAAA6] transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFAAA6]/30 border border-[#FFAAA6]/80 text-[#7A3C3A] text-[10px] font-bold">
                    {item.source_type || 'User Review'}
                  </span>
                  <span className="text-[10px] text-[#7C766F] font-mono">Unmet Need</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#1D1B18]">{item.pain_point}</h4>
                  <p className="text-xs text-[#534342] mt-1 italic leading-relaxed">
                    "{item.user_complaint || item.excerpt}"
                  </p>
                </div>

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8E4B49] hover:underline"
                  >
                    <span>View Public Source</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Actionable Validation Experiments with 1-Click Add to Roadmap */}
      {(filter === 'all' || filter === 'experiments') && validation_experiments.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-2">
              <Award size={16} className="text-[#2A5D54]" />
              <span>Actionable Validation Experiments</span>
            </h3>
            <span className="text-[11px] text-[#7C766F]">De-risk before building</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validation_experiments.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#9FD8CB]/30 border border-[#9FD8CB] text-[#2A5D54] text-[10px] font-bold">
                      {exp.experiment_type || 'Smoke Test'}
                    </span>
                    <span className="text-[10px] font-mono text-[#7C766F] font-semibold">
                      {exp.estimated_cost || 'Low Cost'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#1D1B18] leading-snug">
                    {exp.title}
                  </h4>

                  <div className="bg-[#F9F2ED] rounded-2xl p-3 space-y-1.5 text-xs text-[#534342]">
                    <div>
                      <strong className="text-[#1D1B18]">Hypothesis:</strong> {exp.hypothesis}
                    </div>
                    <div>
                      <strong className="text-[#1D1B18]">Pass Metric:</strong> {exp.pass_fail_metric}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddExperiment && onAddExperiment(exp)}
                  disabled={addingExperimentId === exp.id}
                  className="w-full py-2.5 px-3 rounded-full bg-[#1D1B18] hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Plus size={14} />
                  <span>{addingExperimentId === exp.id ? 'Adding to M1...' : 'Add Experiment to Roadmap'}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Verified Citations Grid */}
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        cite.badge === 'Verified Web Evidence'
                          ? 'bg-[#9FD8CB]/30 text-[#2A5D54] border border-[#9FD8CB]'
                          : 'bg-[#FBE191]/30 text-[#705D1B] border border-[#FBE191]'
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
