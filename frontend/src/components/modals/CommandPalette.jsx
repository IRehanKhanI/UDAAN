import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const JARGON_TERMS = [
  {
    id: 'api',
    term: 'API',
    category: 'Core',
    plainEnglishSummary: 'A menu for computers: a friendly way for one app to ask another app for information politely.',
    analogy: "Just like you point at an item on a cafe menu instead of barging into the kitchen, your app uses the Stripe API to say: 'Please collect $45 and let me know when done.'",
  },
  {
    id: 'webhook',
    term: 'Webhook',
    category: 'Payments',
    plainEnglishSummary: 'A digital doorbell: when someone pays, the doorbell rings to automatically trigger your order printer.',
    analogy: 'Instead of manually refreshing Stripe 500 times a day, Stripe rings your webhook doorbell the split second an order clears.',
  },
  {
    id: 'env-var',
    term: 'Environment Variable / Key',
    category: 'Security',
    plainEnglishSummary: "A secret master key stored in a locked drawer so you don't paste it directly on the public storefront window.",
    analogy: 'Keeping passwords in public code is like taping your house key to the front door. Environment keys keep secrets locked on the secure server.',
  },
  {
    id: 'ssl-https',
    term: 'SSL / HTTPS',
    category: 'Security',
    plainEnglishSummary: 'A tamper-proof sealed envelope ensuring nobody peeks at customer credit cards while in transit.',
    analogy: 'HTTP is like sending a postcard anyone can read. HTTPS wraps every interaction in cryptographic wax that only you and the bank can open.',
  },
  {
    id: 'dns',
    term: 'DNS & Custom Domains',
    category: 'Cloud',
    plainEnglishSummary: 'The street sign in the city directory so customers can find your front door.',
    analogy: 'A-Record is the GPS coordinate of your workshop. CNAME is a forwarding nickname that points www.yourstudio.com to your main building.',
  },
  {
    id: 'smtp',
    term: 'SMTP & Sender Identity',
    category: 'Payments',
    plainEnglishSummary: 'The wax seal that proves your confirmation emails actually came from you, not an imposter.',
    analogy: 'Sending order updates from a random Gmail often lands in spam. A verified sender address acts like official letterhead.',
  },
]

const SCREENS = [
  { label: 'Studio Dashboard & Overview', path: '/', icon: 'home' },
  { label: 'My Projects & Workspaces', path: '/projects', icon: 'folder_open' },
  { label: 'Flight Plan & Visual Roadmap', path: '/flight-plan', icon: 'map' },
  { label: 'Repository & Architecture', path: '/repository', icon: 'code_blocks' },
  { label: 'Team Workspace & Allocations', path: '/team', icon: 'group' },
  { label: 'Project Docs', path: '/docs', icon: 'menu_book' },
  { label: 'Marketing Studio', path: '/marketing-studio', icon: 'campaign' },
  { label: 'Developer Profile & GitHub', path: '/profile', icon: 'account_circle' },
  { label: 'New Project Setup', path: '/projects/new/setup', icon: 'add_circle' },
]

export default function CommandPalette({ isOpen, onClose, tasks = [] }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const filteredScreens = SCREENS.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  )

  const filteredTasks = tasks.filter((t) =>
    (t.title || t.name || '').toLowerCase().includes(query.toLowerCase())
  )

  const filteredJargon = JARGON_TERMS.filter((j) =>
    j.term.toLowerCase().includes(query.toLowerCase()) ||
    j.plainEnglishSummary.toLowerCase().includes(query.toLowerCase())
  )

  const jump = (path) => {
    navigate(path)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#FFF8F3] rounded-3xl shadow-2xl border border-[#EFEAE4] overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 border-b border-[#EFEAE4] flex items-center gap-3 bg-white">
          <span className="material-symbols-outlined text-[#7C766F] text-[22px]">search</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screens, tasks, guides, or jargon terms (e.g. Flight Plan, Webhook, API)..."
            className="w-full bg-transparent text-[#1D1B18] placeholder-[#7C766F] text-sm focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-bold text-[#534342] bg-[#E7E1DC] rounded-md">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider px-2 mb-1.5">
              Workspaces & Screens
            </div>
            <div className="space-y-1">
              {filteredScreens.map((item) => (
                <button
                  key={item.path}
                  onClick={() => jump(item.path)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#1D1B18] hover:bg-[#FFAAA6]/30 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-[#8E4B49]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[11px] text-[#7C766F]">Jump</span>
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider px-2 mb-1.5">
                Tasks & Milestones
              </div>
              <div className="space-y-1">
                {filteredTasks.slice(0, 5).map((t) => (
                  <button
                    key={t.id || t.title}
                    onClick={() => jump('/flight-plan')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1D1B18] hover:bg-[#FBE191]/30 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="w-2 h-2 rounded-full bg-[#8E4B49]"></span>
                      <span className="truncate">{t.title || t.name}</span>
                    </div>
                    <span className="text-[10px] bg-[#E7E1DC] px-2 py-0.5 rounded-full shrink-0">
                      {(t.status || 'in progress').replace('_', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim().length > 1 && filteredJargon.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#7C766F] uppercase tracking-wider px-2 mb-1.5">
                Jargon Translator
              </div>
              <div className="space-y-1">
                {filteredJargon.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => jump('/learning')}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs bg-[#FFFFFF] border border-[#EFEAE4] hover:border-[#8E4B49] flex flex-col gap-1 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#8E4B49]">{j.term}</span>
                      <span className="text-[10px] text-[#7C766F]">{j.category}</span>
                    </div>
                    <span className="text-[11px] text-[#534342] line-clamp-1">
                      {j.plainEnglishSummary}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
