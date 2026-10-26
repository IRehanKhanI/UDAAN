import { useState, useMemo } from 'react'
import {
  GitCommit, ArrowRight, Check, X, Undo2, AlertTriangle,
  Plus, Calendar, Clock, Sparkles, CheckCircle2
} from 'lucide-react'

export default function ReplanDiffDrawer({
  isOpen,
  onClose,
  currentPlan,
  proposedPlan,
  comparison,
  onAccept,
  onReject,
  onUndo,
  canUndo = false,
}) {
  const [selectedChangeIds, setSelectedChangeIds] = useState(() => new Set())

  // Compute diff items between current and proposed plans
  const diffItems = useMemo(() => {
    if (!proposedPlan?.milestones) return []
    const currentTasksMap = new Map()
    for (const m of currentPlan?.milestones || []) {
      for (const t of m.tasks || []) {
        if (t.id) currentTasksMap.set(t.id, t)
      }
    }

    const items = []
    for (const m of proposedPlan.milestones || []) {
      for (const t of m.tasks || []) {
        const existing = currentTasksMap.get(t.id)
        if (!existing) {
          items.push({
            id: t.id,
            type: 'added',
            task: t,
            milestoneTitle: m.title,
            title: t.title,
            description: t.why_matters || 'New task added to address market constraints',
            dateChange: `${t.start_date || 'TBD'} → ${t.target_date || 'TBD'}`,
          })
        } else if (
          existing.start_date !== t.start_date ||
          existing.target_date !== t.target_date ||
          existing.title !== t.title
        ) {
          items.push({
            id: t.id,
            type: 'modified',
            task: t,
            existing,
            milestoneTitle: m.title,
            title: t.title,
            description: `Rescheduled timeline or scope refined`,
            dateChange: `${existing.target_date || 'None'} → ${t.target_date || 'None'}`,
          })
        }
      }
    }
    return items
  }, [currentPlan, proposedPlan])

  // Initialize all changes selected by default
  useState(() => {
    setSelectedChangeIds(new Set(diffItems.map(d => d.id)))
  }, [diffItems])

  if (!isOpen) return null

  const toggleSelect = (id) => {
    setSelectedChangeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAcceptAllOrSelected = () => {
    onAccept && onAccept(proposedPlan, Array.from(selectedChangeIds))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#EFEAE4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-[#FFF1ED] border-b border-[#FFAAA6]/40 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8E4B49] animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A3C3A]">
                AI Replanning Diff (Heuristic #3: User Control & Freedom)
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1D1B18]">Before vs. After Roadmap Diff</h2>
            <p className="text-xs text-[#534342]">
              Review AI-proposed schedule adjustments and task additions before applying them to your active database plan.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-white/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats & Feasibility Banner */}
        {comparison && (
          <div className="px-6 py-3 bg-[#F9F2ED] border-b border-[#EFEAE4] flex flex-wrap items-center justify-between gap-3 text-xs text-[#534342]">
            <div className="flex items-center gap-4">
              <span>Verified Tasks Preserved: <strong className="text-[#2A5D54]">{comparison.completed_tasks_preserved || 0}</strong></span>
              <span>•</span>
              <span>Tasks Rescheduled: <strong className="text-[#8E4B49]">{comparison.remaining_tasks_rescheduled || 0}</strong></span>
              <span>•</span>
              <span>Total Milestones: <strong className="text-[#1D1B18]">{comparison.total_milestones || 4}</strong></span>
            </div>
            {comparison.feasibility_status && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#9FD8CB]/30 border border-[#9FD8CB] text-[#2A5D54] font-bold text-[10px]">
                Schedule Feasible
              </span>
            )}
          </div>
        )}

        {/* Diff Changes List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {diffItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-[#2A5D54]" />
              <p className="text-sm font-bold text-[#1D1B18]">Your roadmap is already perfectly balanced!</p>
              <p className="text-xs text-[#7C766F]">No task additions or date shifts were required for this constraint.</p>
            </div>
          ) : (
            diffItems.map((item) => {
              const isSelected = selectedChangeIds.has(item.id)
              const isAdded = item.type === 'added'

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? isAdded
                        ? 'bg-[#9FD8CB]/15 border-[#9FD8CB] shadow-xs'
                        : 'bg-[#FBE191]/20 border-[#FBE191] shadow-xs'
                      : 'bg-[#FFFFFF] border-[#EFEAE4] opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 rounded accent-[#8E4B49] cursor-pointer"
                  />

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAdded
                              ? 'bg-[#9FD8CB]/40 text-[#2A5D54]'
                              : 'bg-[#FBE191]/60 text-[#705D1B]'
                          }`}
                        >
                          {isAdded ? '+ ADD TASK' : '⇄ RESCHEDULED'}
                        </span>
                        <span className="text-[11px] font-mono text-[#7C766F]">{item.milestoneTitle}</span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-[#1D1B18] flex items-center gap-1">
                        <Calendar size={12} className="text-[#8E4B49]" />
                        <span>{item.dateChange}</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#1D1B18]">{item.title}</h4>
                    <p className="text-xs text-[#534342]">{item.description}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Action Controls & Undo */}
        <div className="p-4 sm:p-6 bg-[#F9F2ED] border-t border-[#EFEAE4] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {canUndo && (
              <button
                type="button"
                onClick={() => { onUndo && onUndo(); onClose(); }}
                className="py-2.5 px-4 rounded-full bg-white hover:bg-[#EFEAE4] border border-[#EFEAE4] text-xs font-bold text-[#8E4B49] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Undo2 size={14} />
                <span>Undo Last Change</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-full bg-white hover:bg-[#EFEAE4] border border-[#EFEAE4] text-xs font-bold text-[#534342] transition-colors cursor-pointer flex-1 sm:flex-initial"
            >
              Reject / Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleAcceptAllOrSelected}
            disabled={diffItems.length === 0 || selectedChangeIds.size === 0}
            className="w-full sm:w-auto py-2.5 px-6 rounded-full bg-[#1D1B18] hover:bg-black text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check size={15} />
            <span>Accept Selected ({selectedChangeIds.size})</span>
          </button>
        </div>
      </div>
    </div>
  )
}
