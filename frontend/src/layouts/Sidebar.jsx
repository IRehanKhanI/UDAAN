import { useState } from 'react'
import {
  FolderOpen, Home, LogOut,
  Megaphone, Sparkles, UserRound, CircleDollarSign
} from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import './Sidebar.css'
import { useAuth } from '../app/AuthContext.jsx'
import { logoutAccount } from '../services/authService.js'
import { readSavedProjects } from '../services/projectStorage.js'
import CommandPalette from '../components/modals/CommandPalette.jsx'

const navigation = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'My Projects', icon: FolderOpen, to: '/projects' },
  { label: 'Business Model', icon: CircleDollarSign, to: '/business-model' },
  { label: 'Marketing Studio', icon: Megaphone, to: '/marketing-studio' },
]

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { auth, refresh } = useAuth()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const savedProjects = readSavedProjects()
  const selectedId = localStorage.getItem('udaan:selected-project')
  const currentProject = savedProjects.find(p => p.id === selectedId) || savedProjects[0]
  const isComplete = currentProject ? (currentProject.progress >= 100 || currentProject.status === 'completed') : false

  const displayName = auth.user?.name || (auth.authenticated ? 'Developer' : 'Sign In')
  const initials = auth.authenticated
    ? displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : ''
  const avatarUrl = auth.profile?.avatar_url || ''

  const logout = async () => {
    try {
      await logoutAccount()
      await refresh()
    } catch {
      /* Current API session will expire normally. */
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-4 top-4 bottom-4 w-72 bg-[#F9F2ED] rounded-3xl shadow-[0_4px_24px_-4px_rgba(31,29,26,0.06)] z-50 flex flex-col justify-between p-4 overflow-hidden border border-[#EFEAE4] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-[110%] lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-3.5 min-h-0">
          {/* Logo & Mobile Close */}
          <div className="flex items-center justify-between px-1 py-0.5">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5 text-left group no-underline focus:outline-none"
            >
              <img
                src="/logo.jpeg"
                alt="Udaan Logo"
                className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0 transition-transform group-hover:scale-105 border border-[#EFEAE4]/80"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-[#1D1B18] leading-none font-['Plus_Jakarta_Sans']">
                  Udaan
                </span>
                <span className="text-[11px] text-[#534342] font-semibold mt-1">
                  creative launchpad
                </span>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-[#534342] hover:text-[#1D1B18] rounded-full"
              aria-label="Close navigation"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Search / Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full relative flex items-center bg-[#FFFFFF] text-[#1D1B18] text-sm pl-9 pr-8 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FFAAA6] shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#EFEAE4] hover:bg-[#FFFDFB] transition-colors text-left cursor-pointer"
          >
            <span className="material-symbols-outlined absolute left-3 text-[#534342] text-[18px]">
              search
            </span>
            <span className="text-[#7C766F] text-xs">Quick find or jump...</span>
            <span className="absolute right-2.5 text-[11px] font-semibold text-[#534342] bg-[#F3EDE7] px-1.5 py-0.5 rounded-full">
              ⌘K
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
            {navigation.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-2xl text-left transition-all no-underline ${
                    isActive
                      ? 'bg-[#FFAAA6] text-[#7A3C3A] font-bold shadow-[0_2px_8px_-2px_rgba(31,29,26,0.08)]'
                      : 'text-[#534342] hover:bg-[#EDE7E2] hover:text-[#1D1B18] font-medium'
                  }`
                }
              >
                <Icon size={17} strokeWidth={1.8} className="shrink-0" />
                <span className="text-xs font-semibold">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer info & Profile Card */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#EFEAE4]">
          {/* Status pill (Only show Ready to Launch if project is complete) */}
          {isComplete ? (
            <div className="bg-[#FFFFFF] rounded-2xl p-2.5 flex items-center justify-between shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#2A5D54]/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2A5D54]"></span>
                <span className="text-xs font-bold text-[#2A5D54]">Ready to launch</span>
              </div>
              <span className="text-[11px] bg-[#9FD8CB]/30 text-[#2A5D54] px-2 py-0.5 rounded-full font-bold">
                100%
              </span>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] rounded-2xl p-2.5 flex items-center justify-between shadow-[0_1px_4px_rgba(31,29,26,0.03)] border border-[#EFEAE4]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8E4B49] animate-pulse"></span>
                <span className="text-xs font-semibold text-[#534342]">
                  {currentProject ? `In Flight · ${currentProject.progress || 0}%` : 'Studio Active'}
                </span>
              </div>
              <span className="text-[11px] bg-[#FBE191] text-[#766320] px-2 py-0.5 rounded-full font-bold">
                Sprint 1
              </span>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-[#FFFFFF] rounded-2xl p-2 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(31,29,26,0.04)] border border-[#EFEAE4]">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-2.5 overflow-hidden min-w-0 no-underline"
              aria-label="Open developer profile"
            >
              <div className="w-8 h-8 rounded-full bg-[#F9F2ED] border border-[#D8C1C0] flex items-center justify-center text-[11px] font-bold text-[#7A3C3A] overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : initials ? (
                  initials
                ) : (
                  <UserRound size={15} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#1D1B18] truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#534342] font-medium truncate">
                  {auth.authenticated ? 'Developer Profile' : 'Click to Sign In'}
                </span>
              </div>
            </Link>
            {auth.authenticated ? (
              <button
                onClick={() => void logout()}
                className="text-[#534342] hover:text-[#1D1B18] p-1 rounded-full hover:bg-[#F3EDE7] transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            ) : (
              <Link
                to="/profile"
                className="text-[#8E4B49] hover:text-[#7A3C3A] p-1 rounded-full hover:bg-[#FFAAA6]/20 transition-colors shrink-0"
                title="Sign In"
              >
                <UserRound size={15} />
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  )
}
