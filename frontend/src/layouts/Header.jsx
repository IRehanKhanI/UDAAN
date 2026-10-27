import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Check, ChevronsUpDown, Menu, Plus, UserPlus } from 'lucide-react'
import { readSavedProjects } from '../services/projectStorage.js'
import { getTeamWorkspace } from '../services/teamService.js'
import { useAuth } from '../app/AuthContext.jsx'
import InviteMakerModal from '../components/modals/InviteMakerModal.jsx'

export default function Header({
  currentProject: propCurrentProject,
  onToggleMobileMenu = () => { },
  onProjectSelect = null,
  onInviteClick = null,
}) {
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [allProjects, setAllProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [internalInviteOpen, setInternalInviteOpen] = useState(false)
  const { auth } = useAuth()
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

  useEffect(() => {
    if (!currentProject?.id || currentProject.id === 'starter') {
      if (auth.authenticated && auth.user) {
        setTeamMembers([{
          id: 'me',
          name: auth.user.name,
          role: auth.profile?.preferred_roles?.[0] || 'Project Lead',
          avatar_url: auth.profile?.avatar_url,
          is_creator: true
        }])
      } else {
        setTeamMembers([])
      }
      return
    }

    let active = true
    getTeamWorkspace(currentProject.id)
      .then(data => {
        if (!active) return
        if (data?.members?.length) {
          setTeamMembers(data.members)
        } else if (auth.authenticated && auth.user) {
          setTeamMembers([{
            id: 'me',
            name: auth.user.name,
            role: auth.profile?.preferred_roles?.[0] || 'Project Lead',
            avatar_url: auth.profile?.avatar_url,
            is_creator: true
          }])
        }
      })
      .catch(() => {
        if (!active) return
        if (auth.authenticated && auth.user) {
          setTeamMembers([{
            id: 'me',
            name: auth.user.name,
            role: auth.profile?.preferred_roles?.[0] || 'Project Lead',
            avatar_url: auth.profile?.avatar_url,
            is_creator: true
          }])
        }
      })

    return () => { active = false }
  }, [currentProject?.id, auth.authenticated, auth.user, auth.profile])

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
          <Menu size={20} />
        </button>

        <Link to="/" className="lg:hidden flex items-center shrink-0" aria-label="Go to Udaan home">
          <img src="/logo.jpeg" alt="Udaan Logo" className="w-8 h-8 rounded-xl object-contain border border-[#EFEAE4] shadow-xs" />
        </Link>

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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FBBF24] hover:bg-[#DDF2E3] rounded-full shadow-[0_1px_4px_rgba(31,29,26,0.02)] border border-[#CDEBD4] cursor-pointer transition-colors"
          >
            <span className="text-xs font-bold text-[#1D1B18] max-w-[140px] sm:max-w-[200px] truncate">
              {currentProject.name}
            </span>
            <ChevronsUpDown size={15} className="text-[#2E6BFF] shrink-0" />
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
                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#F9F2ED] transition-colors ${p.id === currentProject.id ? 'bg-[#FFAAA6]/20 text-[#8E4B49]' : 'text-[#1D1B18]'
                    }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{p.name}</span>
                    <span className="text-[10px] text-[#7C766F] font-normal">{p.category || 'Project'}</span>
                  </div>
                  {p.id === currentProject.id && (
                    <Check size={15} className="text-[#8E4B49] shrink-0" />
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
                <Plus size={15} className="shrink-0" />
                <span>+ Launch New Project</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right items: Collaborators avatars + Notifications + New Idea */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real Collaborators Avatar Stack */}
        <div className="hidden md:flex items-center gap-1.5">
          <div
            onClick={() => {
              if (onInviteClick) onInviteClick()
              else navigate('/team')
            }}
            className="flex items-center -space-x-2 cursor-pointer hover:opacity-90 transition-opacity"
            title="Project Team Members - Click to View Team Workspace"
          >
            {teamMembers.length > 0 ? (
              teamMembers.slice(0, 4).map((member, idx) => {
                const initials = (member.name || member.display_name || member.role || 'M')
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
                const colors = [
                  'bg-[#f0dedb] text-[#8e4b49]',
                  'bg-[#FBE191] text-[#766320]',
                  'bg-[#FFAAA6] text-[#7A3C3A]',
                  'bg-[#E7E1DC] text-[#534342]',
                ]
                return (
                  <div
                    key={member.id || idx}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-[#FFF8F3] overflow-hidden ${colors[idx % colors.length]
                      }`}
                    title={`${member.name || member.display_name || 'Member'} (${member.role || 'Contributor'})`}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                )
              })
            ) : (
              <div
                className="w-7 h-7 rounded-full bg-[#f0dedb] text-[#8e4b49] flex items-center justify-center text-[10px] font-bold ring-2 ring-[#FFF8F3]"
                title="You (Project Lead)"
              >
                {auth.user?.name ? auth.user.name.slice(0, 2).toUpperCase() : 'ME'}
              </div>
            )}
            {teamMembers.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-[#E7E1DC] text-[#534342] flex items-center justify-center text-[10px] font-semibold ring-2 ring-[#FFF8F3]">
                +{teamMembers.length - 4}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (onInviteClick) onInviteClick()
              else setInternalInviteOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F9F2ED] hover:bg-[#EDE7E2] text-[#8E4B49] text-xs font-bold border border-[#EFEAE4] transition-colors cursor-pointer"
            title="Invite new collaborator to this project"
          >
            <UserPlus size={13} />
            <span>Invite</span>
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-[#534342] hover:text-[#1D1B18] hover:bg-[#F9F2ED] rounded-full transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} />
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
          className="flex items-center gap-1.5 bg-[#FFAAA6] text-[#7A3C3A] hover:bg-[#FFDAD8] px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold transition-all shadow-[0_2px_8px_-2px_rgba(142,75,73,0.18)] hover:scale-105 active:scale-95 no-underline shrink-0"
        >
          <Plus size={15} />
          <span>New Idea</span>
        </Link>
      </div>

      <InviteMakerModal
        isOpen={internalInviteOpen}
        onClose={() => setInternalInviteOpen(false)}
        projectId={currentProject?.id}
        onInviteSent={() => {
          if (currentProject?.id && currentProject.id !== 'starter') {
            getTeamWorkspace(currentProject.id).then(d => {
              if (d?.members) setTeamMembers(d.members)
            }).catch(() => { })
          }
        }}
      />
    </header>
  )
}
