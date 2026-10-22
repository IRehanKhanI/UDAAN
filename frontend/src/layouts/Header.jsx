import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { readSavedProjects } from '../services/projectStorage.js'

export default function Header({
  currentProject: propCurrentProject,
  onToggleMobileMenu = () => {},
  onProjectSelect = null,
  onInviteClick = null,
}) {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [allProjects, setAllProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const list = readSavedProjects()
    setAllProjects(list)
    const storedId = localStorage.getItem('udaan:selected-project') || list[0]?.id || ''
    setSelectedProjectId(storedId)
  }, [])

  const currentProject = propCurrentProject || allProjects.find(p => p.id === selectedProjectId) || allProjects[0] || {
    id: 'starter',
    name: 'My Workspace Project',
    category: 'Creative Launchpad',
  }

  const handleSelectProject = (proj) => {
    localStorage.setItem('udaan:selected-project', proj.id)
    setSelectedProjectId(proj.id)
    setProjectDropdownOpen(false)
    if (onProjectSelect) {
      onProjectSelect(proj)
    } else {
      window.dispatchEvent(new CustomEvent('udaan:project-changed', { detail: proj }))
    }
  }

  const notifications = [
    { id: 1, text: 'Milestone proof verification completed', time: '14m ago', unread: true },
    { id: 2, text: 'Automated test suite probe verified 200 OK', time: '1h ago', unread: false },
    { id: 3, text: 'Collaborator invitation link active', time: 'Yesterday', unread: false },
  ]

  return (
    <header className="fixed top-4 left-4 lg:left-80 right-4 h-16 bg-[#FFF8F3]/90 backdrop-blur-xl rounded-2xl z-40 flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border border-[#EFEAE4]">
      {/* Left items: Mobile menu trigger + sprint pill + project dropdown */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 text-[#534342] hover:text-[#1D1B18] rounded-xl hover:bg-[#F3EDE7]"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 bg-[#F9F2ED] px-3 py-1.5 rounded-full border border-[#EFEAE4]">
          <span className="w-2 h-2 rounded-full bg-[#FFAAA6] animate-pulse"></span>
          <span className="text-xs text-[#1D1B18] font-bold">Today · Sprint 1 Active</span>
        </div>
        <div className="sm:hidden flex items-center gap-1 bg-[#F9F2ED] px-2 py-1 rounded-full border border-[#EFEAE4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFAAA6]"></span>
          <span className="text-[10px] text-[#1D1B18] font-bold">Sprint 1</span>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] rounded-full shadow-[0_1px_4px_rgba(31,29,26,0.02)] border border-[#EFEAE4] cursor-pointer hover:bg-[#F9F2ED] transition-colors"
          >
            <span className="text-xs font-bold text-[#1D1B18] max-w-[140px] sm:max-w-[200px] truncate">
              {currentProject.name}
            </span>
            <span className="material-symbols-outlined text-[#534342] text-[16px]">
              unfold_more
            </span>
          </button>

          {projectDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EFEAE4] py-2 z-50 animate-fadeIn">
              <div className="px-3 py-1 text-[11px] font-bold text-[#7C766F] uppercase tracking-wider">
                Switch Studio Project
              </div>
              {allProjects.length === 0 && (
                <div className="px-3 py-2 text-xs text-[#7C766F]">No saved projects yet</div>
              )}
              {allProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p)}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#F9F2ED] transition-colors ${
                    p.id === currentProject.id ? 'bg-[#FFAAA6]/20 text-[#8E4B49]' : 'text-[#1D1B18]'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-[#7C766F] font-normal">{p.category || 'Project'}</span>
                  </div>
                  {p.id === currentProject.id && (
                    <span className="material-symbols-outlined text-[16px] text-[#8E4B49]">
                      check
                    </span>
                  )}
                </button>
              ))}
              <div className="border-t border-[#EFEAE4] my-1"></div>
              <button
                onClick={() => {
                  setProjectDropdownOpen(false)
                  navigate('/projects/new/setup')
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-[#8E4B49] hover:bg-[#F9F2ED] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>+ Launch New Project</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right items: Collaborators avatars + Notifications + New Idea */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Collaborators Avatar Stack */}
        <button
          onClick={() => {
            if (onInviteClick) onInviteClick()
            else navigate('/team')
          }}
          className="hidden md:flex items-center -space-x-2 cursor-pointer hover:opacity-90 transition-opacity"
          title="Collaborators - View Team Workspace"
        >
          <div className="w-7 h-7 rounded-full bg-[#f0dedb] text-[#8e4b49] flex items-center justify-center text-[11px] font-bold ring-2 ring-[#FFF8F3]">
            AK
          </div>
          <div className="w-7 h-7 rounded-full bg-[#FBE191] text-[#766320] flex items-center justify-center text-[11px] font-bold ring-2 ring-[#FFF8F3]">
            MR
          </div>
          <div className="w-7 h-7 rounded-full bg-[#FFAAA6] text-[#7A3C3A] flex items-center justify-center text-[11px] font-bold ring-2 ring-[#FFF8F3]">
            ER
          </div>
          <div className="w-7 h-7 rounded-full bg-[#E7E1DC] text-[#534342] flex items-center justify-center text-[11px] font-semibold ring-2 ring-[#FFF8F3]">
            +3
          </div>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-[#534342] hover:text-[#1D1B18] hover:bg-[#F9F2ED] rounded-full transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8E4B49] ring-2 ring-[#FFF8F3]"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#EFEAE4] p-3 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE4] mb-2">
                <span className="text-xs font-bold text-[#1D1B18]">Studio Activity</span>
                <span className="text-[10px] font-bold text-[#8E4B49] bg-[#FFAAA6]/30 px-2 py-0.5 rounded-full">
                  1 unread
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2 rounded-xl bg-[#F9F2ED] flex items-start gap-2 text-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#8E4B49] shrink-0 mt-1"></span>
                    <div className="flex flex-col">
                      <span className="font-medium text-[#1D1B18]">{n.text}</span>
                      <span className="text-[10px] text-[#7C766F]">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* New Idea Button */}
        <Link
          to="/projects/new/setup"
          className="flex items-center gap-1.5 bg-[#FFAAA6] text-[#7A3C3A] hover:bg-[#FFDAD8] px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all shadow-[0_2px_8px_-2px_rgba(142,75,73,0.18)] hover:scale-105 active:scale-95 no-underline"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Idea</span>
        </Link>
      </div>
    </header>
  )
}
