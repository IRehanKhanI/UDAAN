import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, BriefcaseBusiness, GraduationCap, Lightbulb,
  Paperclip, Rocket, Sparkles, X, Compass, ChevronRight, CheckCircle2,
  Cpu, Code2, Zap, Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import InteractiveMascot from '../components/mascot/InteractiveMascot.jsx'
import { classifyProjectDomain } from '../services/hardwareService.js'

const QUICK_IDEAS = [
  { label: '💼 Freelance Escrow', text: 'WorkCraft: A peer-to-peer freelance and task marketplace platform with milestone escrow and verified portfolios.' },
  { label: '🍞 Artisan Micro-Bakery', text: 'Crust & Crumb: A weekly micro-bakery drop where local food lovers reserve seasonal sourdough loaves & morning cardamom buns.' },
  { label: '⚡ DevTools CLI & AI', text: 'CodePilot CLI: An intelligent command-line tool that auto-detects flaky tests, suggests git diff fixes, and automates audits.' },
  { label: '🤖 Autonomous Sub-Agents', text: 'Nexus Studio: A multi-agent coordination platform orchestrating autonomous research, coding, and verification sub-agents.' },
  { label: '🌱 IoT Soil Monitor', text: 'FarmPulse: A soil moisture and temperature monitoring system using Arduino sensors that sends alerts to a mobile dashboard via WiFi.' },
  { label: '🚁 Drone Delivery Bot', text: 'SwiftDrop: An autonomous GPS-guided delivery drone with embedded Raspberry Pi control, obstacle detection, and a Flutter delivery tracker app.' },
]

const CATEGORIES = [
  { label: 'Startup', Icon: BriefcaseBusiness },
  { label: 'Hackathon', Icon: Rocket },
  { label: 'College Project', Icon: GraduationCap },
  { label: 'Personal Project', Icon: Lightbulb },
]

const FLOW_STEPS = [
  { emoji: '💡', title: 'Idea & Purpose' },
  { emoji: '🔍', title: 'Competitor Intelligence' },
  { emoji: '💰', title: 'Budget & Pricing' },
  { emoji: '🏗️', title: 'Architecture & Stacks' },
  { emoji: '🚀', title: 'Flight Plan & Tasks' },
  { emoji: '📈', title: 'Business Model' },
]

const DOMAIN_OPTIONS = [
  { key: 'software', label: 'Software', icon: <Code2 size={13} />, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', desc: 'Web, mobile, SaaS, APIs' },
  { key: 'hardware', label: 'Hardware', icon: <Cpu size={13} />, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', desc: 'Circuits, Arduino, IoT devices' },
  { key: 'hybrid', label: 'Software + Hardware', icon: <Zap size={13} />, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', desc: 'IoT app, robot + dashboard' },
]

export default function LaunchIdea() {
  const navigate = useNavigate()
  const fileInput = useRef(null)

  const [idea, setIdea] = useState('')
  const [intent, setIntent] = useState('Startup')
  const [attachment, setAttachment] = useState(null)
  const [attachmentNotice, setAttachmentNotice] = useState('')
  const [error, setError] = useState('')
  const [domain, setDomain] = useState('software')
  const [domainClassifying, setDomainClassifying] = useState(false)
  const [domainReasoning, setDomainReasoning] = useState('')
  const [userOverrodeDomain, setUserOverrodeDomain] = useState(false)
  const classifyTimer = useRef(null)

  // Auto-classify domain via AI as user types (debounced 900ms)
  useEffect(() => {
    if (userOverrodeDomain) return
    if (idea.trim().length < 25) return
    clearTimeout(classifyTimer.current)
    classifyTimer.current = setTimeout(async () => {
      setDomainClassifying(true)
      try {
        const result = await classifyProjectDomain(idea.trim(), intent)
        setDomain(result.domain)
        setDomainReasoning(result.reasoning || '')
      } catch { /* use current domain */ }
      finally { setDomainClassifying(false) }
    }, 900)
    return () => clearTimeout(classifyTimer.current)
  }, [idea, intent, userOverrodeDomain])

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
      domain,
      attachment: attachment ?? null,
      currentStage: 0,
      completedStages: [],
    }
    sessionStorage.setItem('udaan:idea-draft', JSON.stringify(draft))
    localStorage.setItem('udaan:idea-draft', JSON.stringify(draft))
    navigate('/projects/new/analysis')
  }


  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#FFF8F3] font-['Plus_Jakarta_Sans'] flex flex-col">

      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#EFEAE4] bg-white z-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#534342] hover:text-[#1D1B18] transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Dashboard</span>
        </button>
        <span className="flex items-center gap-2 text-xs sm:text-sm font-black text-[#1D1B18]">
          <span className="w-7 h-7 rounded-xl bg-[#FFAAA6] flex items-center justify-center shadow-xs">
            <Sparkles size={14} className="text-[#7A3C3A]" />
          </span>
          Launch New Idea
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#7C766F] bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#EFEAE4]">
            Phase 0: Vision
          </span>
        </div>
      </header>

      {/* ── Main Body: Left Big Mascot + Right Shifted Studio Form ──── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden relative">

        {/* LEFT: Big Mascot Companion Stage ────────────────────────── */}
        <div className="w-full lg:w-[44%] shrink-0 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 bg-gradient-to-br from-[#FFF8F3] via-[#FFF2EE]/70 to-[#FFE9E4]/40 border-b lg:border-b-0 lg:border-r border-[#EFEAE4] relative overflow-hidden select-none">
          {/* Subtle Background Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-80 h-72 sm:h-80 bg-[#FFAAA6]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-44 sm:w-48 h-44 sm:h-48 bg-[#FDE68A]/25 rounded-full blur-2xl pointer-events-none" />

          {/* Big Interactive Mascot */}
          <div className="relative z-10 flex flex-col items-center justify-center transform scale-95 sm:scale-110 lg:scale-135 py-2 sm:py-4 transition-transform duration-300">
            <InteractiveMascot phase={0} />
          </div>

          {/* Companion Info Strip */}
          <div className="mt-4 sm:mt-6 relative z-10 text-center max-w-sm space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#EFEAE4] shadow-xs text-xs font-bold text-[#1D1B18]">
              <span className="w-2 h-2 rounded-full bg-[#8E4B49]" />
              Phase 0 · Dream & Vision
            </span>
          </div>
        </div>

        {/* RIGHT: Shifted against right wall ───────────────────────── */}
        <div className="flex-1 flex flex-col justify-start lg:justify-center items-center lg:items-end px-4 sm:px-8 lg:px-12 py-5 sm:py-6 overflow-y-auto">
          <div className="w-full max-w-xl mr-0 space-y-4 bg-white rounded-3xl p-5 sm:p-8 border border-[#EFEAE4] shadow-sm">

            {/* Heading & Subtitle */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8E4B49]">STEP 1 OF 5 · LAUNCHPAD</span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1D1B18] tracking-tight leading-tight">
                What do you want to build?
              </h1>
              <p className="text-xs text-[#534342]">
                Describe your dream in plain words. UDAAN handles market research, tech stacks, and step-by-step milestones.
              </p>
            </div>

            {/* Quick Ideas Presets */}


            {/* Form */}
            <form onSubmit={launch} noValidate className="space-y-4 pt-1">
              <div className="space-y-1">
                <label htmlFor="launch-idea-input" className="sr-only">Describe your idea</label>
                <textarea
                  id="launch-idea-input"
                  rows={7}
                  value={idea}
                  onChange={e => { setIdea(e.target.value); setError('') }}
                  placeholder="e.g. I want to build a platform where freelancers can post their work and get hired by clients directly with milestone escrow..."
                  className="w-full p-4 rounded-2xl bg-[#FFF8F3] border border-[#EFEAE4] focus:border-[#8E4B49] focus:bg-white focus:ring-3 focus:ring-[#FFAAA6]/30 text-sm text-[#1D1B18] placeholder-[#9C948D] outline-none resize-none leading-relaxed transition-all shadow-inner"
                />
                {error && <p className="text-xs font-semibold text-[#C0392B] pl-1">{error}</p>}
              </div>

              {/* Category Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#7C766F] uppercase tracking-wider block">Project Type</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(({ label, Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setIntent(label)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${intent === label
                        ? 'bg-[#1D1B18] border-[#1D1B18] text-white shadow-xs'
                        : 'bg-white border-[#EFEAE4] text-[#534342] hover:bg-[#FAF8F5]'
                        }`}
                    >
                      <Icon size={13} className={intent === label ? 'text-[#FFAAA6]' : 'text-[#7C766F]'} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attach File + Launch Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#EFEAE4]">
                <div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    onChange={addAttachment}
                    className="sr-only"
                  />
                  {attachment ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF0EB] border border-[#FFCDB8] text-[#8E4B49] text-xs font-semibold">
                      <Paperclip size={12} />
                      <span className="truncate max-w-[130px]">{attachment.name}</span>
                      <button type="button" onClick={() => setAttachment(null)} className="ml-1 cursor-pointer"><X size={12} /></button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EDE7] border border-[#EFEAE4] text-xs text-[#534342] font-semibold transition-colors cursor-pointer w-full sm:w-auto"
                    >
                      <Paperclip size={13} className="text-[#8E4B49]" />
                      Attach Brief (.md / .txt)
                    </button>
                  )}
                  {attachmentNotice && <p className="text-[11px] text-[#C0392B] mt-1 pl-1">{attachmentNotice}</p>}
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[#8E4B49] hover:bg-[#723B39] text-white text-sm font-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
                >
                  <span>Start Launch</span>
                  <Sparkles size={14} className="text-[#FBE191]" />
                </button>
              </div>
            </form>

            {/* Journey Roadmap Dots */}
            <div className="pt-3 border-t border-[#EFEAE4] flex items-center justify-between gap-1 overflow-x-auto">
              {FLOW_STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[11px] font-bold text-[#7C766F] shrink-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${idx === 0 ? 'bg-[#FFAAA6] text-[#7A3C3A] font-black' : 'bg-[#EFEAE4] text-[#7C766F]'}`}>
                    {idx + 1}
                  </span>
                  <span className={idx === 0 ? 'text-[#1D1B18]' : ''}>{step.title}</span>
                  {idx < FLOW_STEPS.length - 1 && <span className="text-[#D5CFC7] mx-0.5">›</span>}
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
