import { CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowRight, Wrench } from 'lucide-react'
import { runBusinessConsistencyChecks } from '../businessConsistencyChecker.js'

export default function ConsistencyChecksTab({
  data = {},
  onSelectTab = () => {},
  onFixValue = () => {},
}) {
  const issues = runBusinessConsistencyChecks(data)

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const infos = issues.filter(i => i.severity === 'info')

  return (
    <div className="space-y-6">
      {/* ── Overview Status Banner ── */}
      <div className="bg-white rounded-2xl p-6 border border-[#EFEAE4] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8C847E] uppercase">
              AUDIT ENGINE
            </span>
            <h3 className="text-base font-bold text-[#1D1B18] mt-0.5">
              Deterministic Financial Consistency Checker
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {errors.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626] text-xs font-bold flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{errors.length} Critical</span>
              </span>
            )}
            {warnings.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>{warnings.length} Warnings</span>
              </span>
            )}
            {issues.length === 0 && (
              <span className="px-3 py-1 rounded-full bg-[#EBF7EE] text-[#1E824C] text-xs font-bold flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>100% Consistent</span>
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-[#7C766F] leading-relaxed">
          Investors check pitch decks for simple math errors (e.g. stated revenue larger than SOM, or burn rates conflicting with runway).
          This automated checker audits every tab deterministically without AI hallucination.
        </p>
      </div>

      {/* ── Zero Errors Banner ── */}
      {issues.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#EBF7EE] border border-[#CDEBD4] text-center space-y-2">
          <CheckCircle2 size={36} className="text-[#1E824C] mx-auto" />
          <h4 className="text-base font-black text-[#1D1B18]">
            Perfect Number Consistency
          </h4>
          <p className="text-xs text-[#4E775B] max-w-md mx-auto">
            All bottom-up market sizing equations, unit economics health thresholds, and runway formulas are mathematically synchronized.
          </p>
        </div>
      ) : (
        /* ── Issues List ── */
        <div className="space-y-3">
          {issues.map((issue) => {
            const isError = issue.severity === 'error'
            const isWarning = issue.severity === 'warning'
            const borderCol = isError ? 'border-[#FECACA]' : isWarning ? 'border-[#FDE68A]' : 'border-[#BAE6FD]'
            const bgCol = isError ? 'bg-[#FFF5F5]' : isWarning ? 'bg-[#FFFDF5]' : 'bg-[#F0F9FF]'
            const textCol = isError ? 'text-[#DC2626]' : isWarning ? 'text-[#D97706]' : 'text-[#0284C7]'
            const Icon = isError ? AlertCircle : isWarning ? AlertTriangle : Info

            return (
              <div
                key={issue.id}
                className={`p-4 sm:p-5 rounded-2xl border ${borderCol} ${bgCol} shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all`}
              >
                <div className="flex items-start gap-3">
                  <Icon size={18} className={`${textCol} mt-0.5 shrink-0`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[#1D1B18]">
                        {issue.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${textCol}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#555] leading-relaxed">
                      {issue.description}
                    </p>
                    <p className="text-[11px] text-[#1D1B18] font-medium">
                      <strong>Recommendation:</strong> {issue.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {issue.fixValue !== undefined && (
                    <button
                      type="button"
                      onClick={() => onFixValue(issue.tab, issue.fixValue)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1D1B18] hover:bg-black text-white text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      <Wrench size={12} />
                      <span>Fix Value</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectTab(issue.tab)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#DDD] bg-white hover:bg-[#F3EDE7] text-[#1D1B18] text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <span>Jump to Field</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
