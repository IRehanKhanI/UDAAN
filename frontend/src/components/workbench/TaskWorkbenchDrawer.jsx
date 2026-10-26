import { useState } from 'react'
import {
  CheckCircle2, Circle, Clock, Code2, ExternalLink, FileCode2,
  Lock, Sparkles, ShieldCheck, X, AlertTriangle, ArrowRight, Check
} from 'lucide-react'

export default function TaskWorkbenchDrawer({
  isOpen,
  onClose,
  task,
  milestoneTitle = '',
  onToggleStep,
  onVerifyTask,
  isVerifying = false,
  allTasks = [],
  repoAnalysis = null,
}) {
  const [proofType, setProofType] = useState('manual_check')
  const [proofNotes, setProofNotes] = useState('')

  if (!isOpen || !task) return null

  // Check if prerequisite tasks are completed
  const dependencies = task.dependencies || []
  const isPrerequisiteMet = dependencies.every((depId) => {
    const depTask = allTasks.find(t => t.id === depId)
    return !depTask || depTask.isVerified || depTask.done
  })

  // Check repository evidence matching against connected repo
  const expectedEvidence = task.expected_evidence || []
  const repoFiles = repoAnalysis?.files || repoAnalysis?.allPaths || []
  const evidenceMatches = expectedEvidence.map((path) => {
    const isMatched = repoFiles.some((f) => typeof f === 'string' && f.includes(path))
    return { path, isMatched }
  })

  const steps = task.steps || []
  const completedSteps = steps.filter(s => s.done).length

  const handleVerify = () => {
    onVerifyTask && onVerifyTask({
      taskKey: task.id,
      taskTitle: task.title,
      proofType,
      proofDetails: { notes: proofNotes },
      xpAwarded: task.xp_reward || 150,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="w-full max-w-xl h-full bg-[#FFF8F3] border-l border-[#EFEAE4] shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 bg-white border-b border-[#EFEAE4] flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A3C3A] bg-[#FFAAA6]/30 border border-[#FFAAA6]/80 px-2.5 py-0.5 rounded-full">
                Task Workbench
              </span>
              <span className="text-xs text-[#7C766F] font-mono">{milestoneTitle}</span>
            </div>
            <h2 className="text-lg font-bold text-[#1D1B18] leading-snug">{task.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#534342] hover:text-[#1D1B18] rounded-full hover:bg-[#F3EDE7] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body with Progressive Disclosure */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Lock Alert if dependencies not satisfied */}
          {!isPrerequisiteMet && (
            <div className="bg-[#FFAAA6]/20 border border-[#FFAAA6] rounded-2xl p-4 flex items-center gap-3 text-xs text-[#7A3C3A]">
              <Lock size={18} className="shrink-0 text-[#8E4B49]" />
              <div>
                <strong className="font-bold">Task Dependency Locked:</strong> Complete prerequisite tasks (
                {dependencies.join(', ')}) before advancing this task.
              </div>
            </div>
          )}

          {/* 1. WHY THIS MATTERS (Linked to Market Radar) */}
          <div className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#8E4B49]" />
                <span>Why This Matters (Market Radar Grounding)</span>
              </span>
              {task.radar_chip && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBE191]/50 border border-[#FBE191] text-[#705D1B]">
                  {task.radar_chip}
                </span>
              )}
            </div>
            <p className="text-xs text-[#534342] leading-relaxed">
              {task.why_matters || 'Directly addresses the primary competitor gap or user complaint identified during Market Radar discovery.'}
            </p>
          </div>

          {/* 2. STEPS TO COMPLETE (Subtask Builder Checklist) */}
          <div className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-[#2A5D54]" />
                <span>Steps to Complete ({completedSteps} / {steps.length})</span>
              </span>
              <span className="text-[10px] text-[#7C766F] font-mono">Updates User Completion %</span>
            </div>

            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  onClick={() => onToggleStep && onToggleStep(task.id, idx)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                    step.done
                      ? 'bg-[#9FD8CB]/15 border-[#9FD8CB] text-[#1D1B18]'
                      : 'bg-[#F9F2ED] border-[#EFEAE4] text-[#534342] hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={step.done}
                    onChange={() => {}}
                    className="rounded accent-[#8E4B49] cursor-pointer"
                  />
                  <span className={`text-xs ${step.done ? 'line-through text-[#7C766F]' : 'font-medium'}`}>
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. EXPECTED REPOSITORY EVIDENCE */}
          <div className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-1.5">
                <Code2 size={14} className="text-[#8E4B49]" />
                <span>Expected Repository Evidence</span>
              </span>
              <span className="text-[10px] text-[#7C766F] font-mono">Deterministic Inspection</span>
            </div>

            <div className="space-y-2">
              {evidenceMatches.map(({ path, isMatched }, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#F9F2ED] border border-[#EFEAE4] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 font-mono text-xs text-[#1D1B18] truncate">
                    <FileCode2 size={14} className="text-[#7C766F] shrink-0" />
                    <span className="truncate">{path}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${
                      isMatched
                        ? 'bg-[#9FD8CB]/40 border border-[#9FD8CB] text-[#2A5D54]'
                        : 'bg-[#FFAAA6]/30 border border-[#FFAAA6] text-[#7A3C3A]'
                    }`}
                  >
                    {isMatched ? 'MATCHED' : 'UNCHECKED / MISSING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. VERIFICATION CRITERIA & PROOF CHECKER */}
          <div className="bg-white rounded-3xl p-5 border border-[#EFEAE4] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1D1B18] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#2A5D54]" />
                <span>Verification Criteria</span>
              </span>
              <span className="text-xs font-bold text-[#8E4B49] bg-[#FFAAA6]/20 px-2 py-0.5 rounded-full font-mono">
                +{task.xp_reward || 150} XP
              </span>
            </div>

            <p className="text-xs text-[#534342] bg-[#F9F2ED] p-3 rounded-2xl border border-[#EFEAE4]">
              {task.verification_criteria || 'Run unit tests, verify proof deliverable, or conduct acceptance review.'}
            </p>

            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold text-[#7C766F] uppercase">Verification Proof Notes</label>
              <textarea
                rows={2}
                placeholder="Optional proof details (e.g. Test report passed, deliverable commit SHA)..."
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                className="w-full bg-[#F9F2ED] text-xs text-[#1D1B18] p-3 rounded-2xl border border-[#EFEAE4] focus:outline-none focus:border-[#FFAAA6]"
              />
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 bg-white border-t border-[#EFEAE4] flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#7C766F] uppercase font-bold">XP Award</span>
            <span className="text-sm font-bold text-[#1D1B18]">+{task.xp_reward || 150} XP on Verify</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-full bg-[#F9F2ED] hover:bg-[#EFEAE4] text-xs font-bold text-[#534342] transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying}
              className="py-2.5 px-5 rounded-full bg-[#1D1B18] hover:bg-black text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={15} />
              <span>{isVerifying ? 'Verifying...' : 'Pass Verification & Earn XP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
