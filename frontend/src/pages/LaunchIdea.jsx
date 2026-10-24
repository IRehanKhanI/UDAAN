import { useRef, useState } from 'react'
import {
  ArrowLeft, BriefcaseBusiness, GraduationCap, Lightbulb,
  Paperclip, Rocket, Sparkles, X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const QUICK_IDEAS = [
  { label: '💼 Freelance Marketplace', text: 'WorkCraft: A peer-to-peer freelance and task marketplace platform with milestone escrow and verified portfolios.' },
  { label: '🍞 Artisan Bakery', text: 'Crust & Crumb: A weekly micro-bakery drop where local food lovers reserve seasonal sourdough loaves & morning cardamom buns.' },
  { label: '⚡ DevTools CLI', text: 'CodePilot CLI: An intelligent command-line tool that auto-detects flaky tests, suggests git diff fixes, and automates audits.' },
  { label: '🤖 AI Sub-Agents', text: 'Nexus Studio: A multi-agent coordination platform orchestrating autonomous research, coding, and verification sub-agents.' },
]

const CATEGORIES = [
  { label: 'Startup', Icon: BriefcaseBusiness },
  { label: 'Hackathon', Icon: Rocket },
  { label: 'College Project', Icon: GraduationCap },
  { label: 'Personal Project', Icon: Lightbulb },
]

const FLOW_STEPS = [
  { emoji: '💡', title: 'Idea Input' },
  { emoji: '🔍', title: 'Research' },
  { emoji: '💰', title: 'Budget' },
  { emoji: '🏗️', title: 'Architecture' },
  { emoji: '🚀', title: 'Flight Plan' },
]

const WHAT_YOU_GET = [
  { emoji: '🔍', title: 'Competitor Research', body: 'AI scans real websites to find who solves this today and where they fall short.' },
  { emoji: '💰', title: 'Budget & Revenue', body: 'Real cost estimates, revenue model & break-even with live market data.' },
  { emoji: '🗺️', title: 'Sprint Roadmap', body: '5-phase flight plan with milestones, task checklists & assignable roles.' },
]

export default function LaunchIdea() {
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [idea, setIdea] = useState('')
  const [intent, setIntent] = useState('Startup')
  const [attachment, setAttachment] = useState(null)
  const [attachmentNotice, setAttachmentNotice] = useState('')
  const [error, setError] = useState('')

  async function addAttachment(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 256 * 1024) {
      setAttachmentNotice('Attach a .txt or .md file under 256 KB.')
      return
    }
    const text = await file.text()
    setAttachment({ name: file.name, text: text.slice(0, 20000) })
    setAttachmentNotice('')
  }

  function launch(e) {
    e.preventDefault()
    if (!idea.trim()) {
      setError('Add a few words about your idea first.')
      document.getElementById('launch-idea-input')?.focus()
      return
    }
    setError('')
    const draft = {
      projectId: globalThis.crypto?.randomUUID?.() || 'proj_' + Date.now(),
      idea: idea.trim(),
      projectType: intent,
      attachment: attachment ?? null,
      currentStage: 0,
      completedStages: [],
    }
    sessionStorage.setItem('udaan:idea-draft', JSON.stringify(draft))
    localStorage.setItem('udaan:idea-draft', JSON.stringify(draft))
    navigate('/projects/new/analysis')
  }

  return (
    <div className="h-screen bg-[#FFF8F3] font-['Plus_Jakarta_Sans'] flex flex-col overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#EFEAE4] bg-white">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm font-bold text-[#534342] hover:text-[#1D1B18] transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <span className="flex items-center gap-2 text-sm font-black text-[#1D1B18]">
          <span className="w-6 h-6 rounded-lg bg-[#FFAAA6] flex items-center justify-center">
            <Sparkles size={13} className="text-[#7A3C3A]" />
          </span>
          Launch New Idea
        </span>
        <div className="w-16" />
      </header>

      {/* ── Body: left form + right panel ─────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — form ──────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-14 py-6 overflow-y-auto">
          <div className="max-w-xl w-full mx-auto space-y-5">

            {/* Heading */}
            <div>
              <h1 className="text-2xl font-black text-[#1D1B18] tracking-tight leading-tight">
                What do you want to build?
              </h1>

            </div>



            {/* Form */}
            <form onSubmit={launch} noValidate className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="launch-idea-input" className="sr-only">Describe your idea</label>
                <textarea
                  id="launch-idea-input"
                  rows={4}
                  value={idea}
                  onChange={e => { setIdea(e.target.value); setError('') }}
                  placeholder="e.g. I want to build a platform where freelancers can post their work and get hired by clients directly..."
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#EFEAE4] focus:border-[#FFAAA6] focus:ring-2 focus:ring-[#FFAAA6]/30 text-sm text-[#1D1B18] placeholder-[#AAA29B] outline-none resize-none leading-relaxed transition-all"
                />
                {error && <p className="text-xs font-semibold text-[#C0392B] pl-1">{error}</p>}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#7C766F] uppercase tracking-wider">Category</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(({ label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setIntent(label)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${intent === label
                        ? 'bg-[#FFAAA6]/30 border-[#FFAAA6] text-[#7A3C3A]'
                        : 'bg-white border-[#EFEAE4] text-[#534342] hover:bg-[#F3EDE7]'
                        }`}
                    >
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attach + Submit */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#EFEAE4]">
                <div>
                  <input ref={fileInput} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={addAttachment} className="sr-only" />
                  {attachment ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF0EB] border border-[#FFCDB8] text-[#8E4B49] text-xs font-semibold">
                      <Paperclip size={12} />
                      <span className="truncate max-w-[120px]">{attachment.name}</span>
                      <button type="button" onClick={() => setAttachment(null)} className="ml-1 cursor-pointer"><X size={12} /></button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3EDE7] border border-[#EFEAE4] text-xs text-[#534342] font-semibold transition-colors cursor-pointer"
                    >
                      <Paperclip size={12} />
                      Attach .txt or .md
                    </button>
                  )}
                  {attachmentNotice && <p className="text-[11px] text-[#C0392B] mt-1 pl-1">{attachmentNotice}</p>}
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1D1B18] hover:bg-black text-white text-sm font-black transition-all shadow hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
                >
                  Start Launch
                  <Sparkles size={14} className="text-[#FBE191]" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT — info panel ────────────────────────────────────── */}
        <div className="hidden lg:flex w-80 xl:w-96 shrink-0 bg-white border-l border-[#EFEAE4] flex-col justify-center px-8 py-8 gap-8">

          {/* Flow steps */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#7C766F] uppercase tracking-widest">What happens next</p>
            <div className="space-y-1.5">
              {FLOW_STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${i === 0 ? 'bg-[#FFF0EB] border border-[#FFCDB8]' : 'bg-[#F9F9F7]'
                  }`}>
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${i === 0 ? 'bg-white shadow-sm' : 'bg-white/60'
                    }`}>{step.emoji}</span>
                  <div>
                    <span className={`text-xs font-bold ${i === 0 ? 'text-[#7A3C3A]' : 'text-[#534342]'}`}>
                      {i === 0 && <span className="text-[#E76F51] mr-1">→</span>}
                      {step.title}
                    </span>
                  </div>
                  {i === 0 && <span className="ml-auto text-[10px] font-bold text-[#E76F51] shrink-0">Now</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#EFEAE4]" />

          {/* What you'll get */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#7C766F] uppercase tracking-widest">What you'll get</p>
            <div className="space-y-2.5">
              {WHAT_YOU_GET.map((card, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{card.emoji}</span>
                  <div>
                    <span className="text-xs font-bold text-[#1D1B18] block">{card.title}</span>
                    <span className="text-[11px] text-[#7C766F] leading-snug">{card.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
