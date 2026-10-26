import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpDown, Check, CheckCircle2, ChevronDown, Clock,
  Copy, Edit3, Filter, Mail, MapPin, MoreVertical, Plus, RefreshCw,
  Save, Search, Sparkles, Trash2, Users, X
} from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import UdaanLoader from '../components/UdaanLoader.jsx'
import { readSavedProjects } from '../services/projectStorage.js'
import {
  createTeamInvitations, getTeamWorkspace, manageTeamInvitation,
  removeTeamMember, updateTeamMember, updateTeamSize
} from '../services/teamService.js'
import './TeamWorkspace.css'

// Curated role styling & color themes matching design specifications
const ROLE_CONFIGS = {
  'Project Owner': {
    label: 'Project Owner',
    icon: '👑',
    cardBg: 'bg-[#FFFDF5]',
    cardBorder: 'border-[#FDE68A]',
    pillBg: 'bg-[#FEF3C7]',
    pillText: 'text-[#B45309]',
    pillBorder: 'border-[#FDE68A]',
    barColor: 'bg-[#10B981]',
    ringColor: 'ring-[#F59E0B]',
  },
  'Developer': {
    label: 'Developer',
    icon: '👤',
    cardBg: 'bg-[#F0F7FF]',
    cardBorder: 'border-[#BAE6FD]',
    pillBg: 'bg-[#E0F2FE]',
    pillText: 'text-[#0284C7]',
    pillBorder: 'border-[#BAE6FD]',
    barColor: 'bg-[#3B82F6]',
    ringColor: 'ring-[#38BDF8]',
  },
  'Designer': {
    label: 'Designer',
    icon: '✨',
    cardBg: 'bg-[#FAF5FF]',
    cardBorder: 'border-[#E9D5FF]',
    pillBg: 'bg-[#F3E8FF]',
    pillText: 'text-[#9333EA]',
    pillBorder: 'border-[#E9D5FF]',
    barColor: 'bg-[#8B5CF6]',
    ringColor: 'ring-[#C084FC]',
  },
  'Hardware': {
    label: 'Hardware',
    icon: '🛡️',
    cardBg: 'bg-[#F0FDF4]',
    cardBorder: 'border-[#BBF7D0]',
    pillBg: 'bg-[#DCFCE7]',
    pillText: 'text-[#16A34A]',
    pillBorder: 'border-[#BBF7D0]',
    barColor: 'bg-[#10B981]',
    ringColor: 'ring-[#4ADE80]',
  },
  'Research': {
    label: 'Research',
    icon: '💬',
    cardBg: 'bg-[#ECFEFF]',
    cardBorder: 'border-[#A5F3FC]',
    pillBg: 'bg-[#CFFAFE]',
    pillText: 'text-[#0891B2]',
    pillBorder: 'border-[#A5F3FC]',
    barColor: 'bg-[#06B6D4]',
    ringColor: 'ring-[#22D3EE]',
  },
  'Marketing': {
    label: 'Marketing',
    icon: '📢',
    cardBg: 'bg-[#FFF7ED]',
    cardBorder: 'border-[#FFEDD5]',
    pillBg: 'bg-[#FFEDD5]',
    pillText: 'text-[#EA580C]',
    pillBorder: 'border-[#FED7AA]',
    barColor: 'bg-[#F97316]',
    ringColor: 'ring-[#FB923C]',
  },
}

// Fallback high quality avatars for Indian team profiles shown in design
const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
]

// Curated starter team presets
const INITIAL_TEMPLATES = [
  {
    id: 'default',
    name: 'Default Layout',
    memberCount: 6,
    roles: ['Project Owner', 'Developer', 'Designer', 'Hardware', 'Research', 'Marketing'],
  },
  {
    id: 'dev_focus',
    name: 'Development Focus',
    memberCount: 4,
    roles: ['Project Owner', 'Developer', 'Developer', 'Designer'],
  },
  {
    id: 'hardware_team',
    name: 'Hardware Team',
    memberCount: 5,
    roles: ['Project Owner', 'Hardware', 'Hardware', 'Developer', 'Research'],
  },
  {
    id: 'marketing_team',
    name: 'Marketing Team',
    memberCount: 3,
    roles: ['Project Owner', 'Marketing', 'Designer'],
  },
]

export default function TeamWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const savedProjects = readSavedProjects()

  // Project ID resolution
  const urlProjectId = searchParams.get('project')
  const [projectId, setProjectId] = useState(
    () => urlProjectId || localStorage.getItem('udaan:selected-project') || savedProjects[0]?.id || ''
  )

  useEffect(() => {
    if (urlProjectId && urlProjectId !== projectId) {
      setProjectId(urlProjectId)
    }
  }, [urlProjectId])

  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All Roles')
  const [sortBy, setSortBy] = useState('name_asc')

  // Modals state
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [saveLayoutModalOpen, setSaveLayoutModalOpen] = useState(false)
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState(null)

  // Layout templates
  const [templates, setTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem('udaan:team-templates')
      return stored ? JSON.parse(stored) : INITIAL_TEMPLATES
    } catch {
      return INITIAL_TEMPLATES
    }
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState('default')

  // Local state overlay for rich attributes (responsibilities, workload, location, avatars)
  const [memberMeta, setMemberMeta] = useState(() => {
    try {
      const stored = localStorage.getItem(`udaan:team-meta:${projectId}`)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  const saveMemberMeta = (id, meta) => {
    setMemberMeta(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...meta } }
      try {
        localStorage.setItem(`udaan:team-meta:${projectId}`, JSON.stringify(next))
      } catch { }
      return next
    })
  }

  // Load project team workspace from backend
  const loadWorkspace = useCallback(async () => {
    if (!projectId) {
      setWorkspace(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await getTeamWorkspace(projectId)
      setWorkspace(data)
    } catch (err) {
      console.warn('Backend team workspace load:', err)
      // Provide clean default workspace if empty
      setWorkspace({
        project: {
          id: projectId,
          name: savedProjects.find(p => p.id === projectId)?.name || 'Project Team',
          team_size: 6,
          is_owner: true,
        },
        members: [
          {
            id: 1,
            slot: 1,
            name: 'Rehan Khan',
            email: 'rehan@example.com',
            role: 'Project Owner',
            title: 'Full Stack Developer',
            is_creator: true,
            skills: ['Project planning', 'Architecture', 'Team coordination'],
          },
          {
            id: 2,
            slot: 2,
            name: 'Aarav Singh',
            email: 'aarav@example.com',
            role: 'Developer',
            title: 'Frontend Developer',
            is_creator: false,
            skills: ['Frontend development', 'API integration', 'Testing'],
          },
          {
            id: 3,
            slot: 3,
            name: 'Zara Khan',
            email: 'zara@example.com',
            role: 'Designer',
            title: 'UI/UX Designer',
            is_creator: false,
            skills: ['UI/UX design', 'Prototyping', 'User testing'],
          },
          {
            id: 4,
            slot: 4,
            name: 'Rohan Mehta',
            email: 'rohan@example.com',
            role: 'Hardware',
            title: 'Hardware Engineer',
            is_creator: false,
            skills: ['Hardware design', 'Prototyping', 'Testing'],
          },
          {
            id: 5,
            slot: 5,
            name: 'Isha Verma',
            email: 'isha@example.com',
            role: 'Research',
            title: 'Research Analyst',
            is_creator: false,
            skills: ['Market research', 'Competitor analysis', 'Data collection'],
          },
        ],
        invitations: [
          {
            id: 101,
            name: 'Sameer Khan',
            email: 'sameer@example.com',
            role: 'Marketing',
            title: 'Growth Marketer',
            status: 'pending',
            skills: ['Content creation', 'Social media', 'Campaigns'],
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
        ],
      })
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  // Click outside to close row menus
  useEffect(() => {
    const handleDocClick = () => setActiveMenuId(null)
    window.addEventListener('click', handleDocClick)
    return () => window.removeEventListener('click', handleDocClick)
  }, [])

  // Resolve members & invitations with fallback values matching the design screenshots
  const members = useMemo(() => {
    if (!workspace?.members?.length) return []
    return workspace.members.map((m, idx) => {
      const meta = memberMeta[m.id] || {}
      const role = meta.role || m.role || (m.is_creator ? 'Project Owner' : 'Developer')
      const config = ROLE_CONFIGS[role] || ROLE_CONFIGS['Developer']
      const name = meta.name || m.name || (m.is_creator ? 'Rehan Khan' : `Member ${m.slot}`)
      const title = meta.title || m.title || `${role} Specialist`
      const email = meta.email || m.email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`
      const location = meta.location || 'India'
      const avatar = meta.avatar || m.avatar || DEFAULT_AVATARS[idx % DEFAULT_AVATARS.length]
      const responsibilities = meta.responsibilities || (m.skills?.length ? m.skills : [
        'Architecture', 'Team coordination', 'Task delivery'
      ])
      const workload = meta.workload !== undefined ? meta.workload : (idx === 0 ? 80 : idx === 1 ? 60 : idx === 2 ? 70 : idx === 3 ? 50 : 40)

      return {
        ...m,
        name,
        role,
        title,
        email,
        location,
        avatar,
        responsibilities,
        workload,
        status: 'active',
        config,
      }
    })
  }, [workspace?.members, memberMeta])

  const pendingInvitations = useMemo(() => {
    const list = workspace?.invitations?.filter(inv => inv.status === 'pending') || []
    return list.map((inv, idx) => {
      const meta = memberMeta[`inv-${inv.id}`] || {}
      const role = meta.role || inv.role || 'Marketing'
      const config = ROLE_CONFIGS[role] || ROLE_CONFIGS['Marketing']
      const name = meta.name || inv.name || 'Sameer Khan'
      const title = meta.title || inv.title || `${role} Specialist`
      const email = meta.email || inv.email || 'sameer@example.com'
      const location = meta.location || 'India'
      const avatar = meta.avatar || DEFAULT_AVATARS[(members.length + idx) % DEFAULT_AVATARS.length]
      const responsibilities = meta.responsibilities || (inv.skills?.length ? inv.skills : [
        'Content creation', 'Social media', 'Campaigns'
      ])
      const workload = meta.workload !== undefined ? meta.workload : 20

      return {
        ...inv,
        id: `inv-${inv.id}`,
        rawId: inv.id,
        name,
        role,
        title,
        email,
        location,
        avatar,
        responsibilities,
        workload,
        status: 'invited',
        config,
        isInvitation: true,
      }
    })
  }, [workspace?.invitations, members.length, memberMeta])

  // Combine active members + pending invited for unified presentation
  const allTeamRows = useMemo(() => {
    return [...members, ...pendingInvitations]
  }, [members, pendingInvitations])

  // Filter & Search
  const filteredRows = useMemo(() => {
    let rows = allTeamRows

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.responsibilities.some(resp => resp.toLowerCase().includes(q))
      )
    }

    if (selectedRoleFilter !== 'All Roles') {
      rows = rows.filter(r => r.role.toLowerCase() === selectedRoleFilter.toLowerCase())
    }

    if (sortBy === 'name_asc') {
      rows = [...rows].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'workload_desc') {
      rows = [...rows].sort((a, b) => b.workload - a.workload)
    } else if (sortBy === 'workload_asc') {
      rows = [...rows].sort((a, b) => a.workload - b.workload)
    } else if (sortBy === 'role') {
      rows = [...rows].sort((a, b) => a.role.localeCompare(b.role))
    }

    return rows
  }, [allTeamRows, searchQuery, selectedRoleFilter, sortBy])

  // Stats calculation
  const totalMembersCount = allTeamRows.length
  const activeMembersCount = members.length
  const invitedCount = pendingInvitations.length
  const rolesFilledCount = new Set(allTeamRows.map(r => r.role)).size

  // Actions
  const handleAddMember = async (formData) => {
    setError('')
    if (formData.isDirectAdd) {
      // Create slot directly
      const newSlot = (workspace?.members?.length || 0) + 1
      const newId = Date.now()
      const newMember = {
        id: newId,
        slot: newSlot,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        title: formData.title || `${formData.role} Specialist`,
        is_creator: false,
        skills: formData.responsibilities,
      }
      setWorkspace(prev => ({
        ...prev,
        members: [...(prev?.members || []), newMember],
      }))
      saveMemberMeta(newId, {
        location: formData.location || 'India',
        workload: Number(formData.workload) || 40,
      })
      setNotice(`Added ${formData.name} to project team.`)
      return { success: true, isDirectAdd: true }
    } else {
      // Invite via email backend API
      const res = await createTeamInvitations(projectId, [{
        email: formData.email,
        name: formData.name,
        role: formData.role,
        skills: formData.responsibilities,
      }])
      const created = res?.invitations?.[0] || {}

      const newInvId = created.id || Date.now()
      setWorkspace(prev => ({
        ...prev,
        invitations: [
          ...(prev?.invitations || []).filter(i => i.email !== formData.email),
          {
            id: newInvId,
            name: formData.name,
            email: formData.email,
            role: formData.role,
            title: formData.title || `${formData.role} Specialist`,
            status: 'pending',
            skills: formData.responsibilities,
            expires_at: created.expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
          },
        ],
      }))
      saveMemberMeta(`inv-${newInvId}`, {
        location: formData.location || 'India',
        workload: Number(formData.workload) || 20,
      })

      // Sync backend state
      void loadWorkspace()

      if (created.delivery === 'sent') {
        setNotice(`Invitation email sent directly to ${formData.email}.`)
      } else {
        setNotice(`Invitation link generated for ${formData.name}.`)
      }

      return created
    }
  }

  const handleSaveEditMember = async (formData) => {
    if (!editMember) return
    try {
      saveMemberMeta(editMember.id, {
        name: formData.name,
        role: formData.role,
        title: formData.title,
        email: formData.email,
        location: formData.location,
        responsibilities: formData.responsibilities,
        workload: Number(formData.workload),
      })
      if (!editMember.isInvitation && typeof editMember.id === 'number') {
        try {
          await updateTeamMember(projectId, editMember.id, {
            name: formData.name,
            role: formData.role,
            email: formData.email,
            skills: formData.responsibilities,
          })
        } catch { }
      }
      setNotice(`Updated ${formData.name}'s details.`)
      setEditMember(null)
    } catch (err) {
      setError(err.message || 'Could not update member.')
    }
  }

  const handleRemoveMember = async (item) => {
    if (!window.confirm(`Remove ${item.name} from this project?`)) return
    try {
      if (item.isInvitation) {
        try {
          await manageTeamInvitation(projectId, item.rawId, 'cancel')
        } catch { }
        setWorkspace(prev => ({
          ...prev,
          invitations: (prev?.invitations || []).filter(i => i.id !== item.rawId),
        }))
      } else {
        try {
          await removeTeamMember(projectId, item.id)
        } catch { }
        setWorkspace(prev => ({
          ...prev,
          members: (prev?.members || []).filter(m => m.id !== item.id),
        }))
      }
      setNotice(`Removed ${item.name}.`)
    } catch (err) {
      setError(err.message || 'Could not remove member.')
    }
  }

  const handleResendInvite = async (item) => {
    try {
      const res = await manageTeamInvitation(projectId, item.rawId, 'resend')
      if (res?.invite_link) {
        navigator.clipboard?.writeText(res.invite_link)
        setNotice(`Invitation renewed for ${item.email}! Invite link copied to clipboard (${res.delivery === 'sent' ? 'email sent' : 'shareable link'}).`)
      } else {
        setNotice(`Invitation resent to ${item.email}.`)
      }
    } catch (err) {
      setError(err.message || `Could not resend invitation to ${item.email}.`)
    }
  }

  // Save Layout as a template
  const handleSaveCurrentLayout = (templateName = 'My Custom Layout') => {
    const newTemplate = {
      id: `tmpl_${Date.now()}`,
      name: templateName,
      memberCount: allTeamRows.length,
      roles: allTeamRows.map(r => r.role),
    }
    const nextTemplates = [newTemplate, ...templates]
    setTemplates(nextTemplates)
    setSelectedTemplateId(newTemplate.id)
    try {
      localStorage.setItem('udaan:team-templates', JSON.stringify(nextTemplates))
    } catch { }
    setSaveLayoutModalOpen(false)
    setNotice(`Team layout saved as "${templateName}"!`)
  }

  // Apply template
  const handleApplyTemplate = (tmpl) => {
    setSelectedTemplateId(tmpl.id)
    setNotice(`Template "${tmpl.name}" active (${tmpl.memberCount} roles).`)
  }

  const currentProject = savedProjects.find(p => String(p.id) === String(projectId)) || {
    id: projectId,
    name: workspace?.project?.name || 'Current Project',
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] tw-page">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          currentProject={currentProject}
          onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
          onInviteClick={() => setAddMemberModalOpen(true)}
          onProjectSelect={(proj) => {
            if (proj?.id) {
              setProjectId(proj.id)
              setSearchParams({ project: proj.id })
            }
          }}
        />

        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 md:px-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ── Top Bar Alerts & Project Switcher ── */}
          {notice && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#EBF7EE] border border-[#CDEBD4] text-[#1F7A3F] text-xs font-semibold animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} />
                {notice}
              </span>
              <button onClick={() => setNotice('')} className="hover:opacity-75">
                <X size={14} />
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold animate-fadeIn">
              <span className="flex items-center gap-2">
                <AlertTriangle size={15} />
                {error}
              </span>
              <button onClick={() => setError('')} className="hover:opacity-75">
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── Main Header Section with 'Better Together' sticker ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black tracking-wider text-[#1D1B18] uppercase">
                <Users size={14} className="text-[#1D1B18]" />
                TEAM WORKSPACE
              </span>
              <div className="flex items-center gap-3.5 mt-1">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D1B18] tracking-tight">
                  Your Team
                </h1>
                {/* Playful 'Better Together' angled badge */}
                <div className="relative inline-flex items-center justify-center -rotate-6 select-none cursor-default">
                  {/* Decorative sunshine rays */}
                  <span className="text-[#F59E0B] font-bold text-xs absolute -top-2 -left-2">✦</span>
                  <span className="text-[#F59E0B] font-bold text-xs absolute -bottom-1 -right-2">✦</span>
                  <div className="px-2.5 py-0.5 rounded-full bg-[#E0F2FE]/80 border border-[#BAE6FD] text-[#0284C7] text-xs font-extrabold italic shadow-xs">
                    Better Together
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#7C766F] mt-1.5 font-medium">
                Manage your team, assign roles, and keep your project moving forward.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAddMemberModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF5252] hover:from-[#FF5252] hover:to-[#EE3E3E] text-white text-xs font-bold shadow-[0_3px_12px_rgba(255,100,100,0.35)] transition-all hover:scale-102 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Add Team Member</span>
              </button>
            </div>
          </div>

          {/* ── Horizontal Deck: Member Cards Carousel & Save Layout Card ── */}
          <div className="overflow-x-auto pb-2 pt-1 -mx-2 px-2 scrollbar-none">
            <div className="flex items-stretch gap-3 min-w-max">
              {/* Member cards */}
              {allTeamRows.map((member) => {
                const cfg = member.config || ROLE_CONFIGS[member.role] || ROLE_CONFIGS['Developer']
                return (
                  <div
                    key={member.id}
                    className={`w-[142px] sm:w-[152px] p-3.5 rounded-2xl flex flex-col items-center text-center shadow-xs border transition-all hover:-translate-y-1 ${cfg.cardBg} ${cfg.cardBorder}`}
                  >
                    {/* Role Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.pillBg} ${cfg.pillText} ${cfg.pillBorder}`}
                    >
                      <span>{cfg.icon}</span>
                      <span className="truncate max-w-[85px]">{member.role}</span>
                    </span>

                    {/* Circular Avatar */}
                    <div className="mt-3 relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className={`w-12 h-12 rounded-full object-cover ring-2 ring-offset-2 ${cfg.ringColor} shadow-xs bg-white`}
                        onError={(e) => {
                          e.target.src = DEFAULT_AVATARS[0]
                        }}
                      />
                      {member.status === 'invited' && (
                        <span
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#EA580C] text-white text-[9px] flex items-center justify-center font-bold shadow-xs"
                          title="Invitation Pending"
                        >
                          ⏰
                        </span>
                      )}
                    </div>

                    {/* Member Name */}
                    <h3 className="text-xs font-bold text-[#1D1B18] mt-2.5 truncate w-full">
                      {member.name}
                    </h3>

                    {/* Subtitle / Title */}
                    <p className="text-[10px] text-[#7C766F] mt-0.5 truncate w-full font-medium">
                      {member.title || `${member.role} Lead`}
                    </p>
                  </div>
                )
              })}

              {/* Add Member Dashed Card */}
              <button
                type="button"
                onClick={() => setAddMemberModalOpen(true)}
                className="w-[125px] sm:w-[135px] border-2 border-dashed border-[#D5CEC7] hover:border-[#FFAAA6] bg-white/40 hover:bg-white rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#F3EDE7] group-hover:bg-[#FFAAA6]/30 text-[#7C766F] group-hover:text-[#8E4B49] flex items-center justify-center transition-all">
                  <Plus size={20} strokeWidth={2.2} />
                </div>
                <span className="text-xs font-bold text-[#7C766F] group-hover:text-[#1D1B18] mt-2">
                  Add Member
                </span>
              </button>

              {/* Save Team LAYOUT Card */}
              <div className="w-[170px] sm:w-[185px] bg-white rounded-2xl p-4 border border-[#EFEAE4] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1B18]">
                    <Users size={14} className="text-[#0284C7]" />
                    <span>Save Team LAYOUT</span>
                  </div>
                  <p className="text-[11px] text-[#7C766F] mt-1.5 leading-snug font-medium">
                    Save this member layout as a template for future projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveLayoutModalOpen(true)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B6B] hover:bg-[#EE5353] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Save size={13} />
                  <span>Save Layout</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Two-Column Layout: Left (Team Members List) & Right (Stats + Templates) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
            {/* ── Left Column: Team Members (8 cols on lg) ── */}
            <div className="lg:col-span-8 space-y-4">
              {/* Header Bar with Search, Role Filter, and Sort */}
              <div className="bg-white rounded-2xl p-4 border border-[#EFEAE4] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#1D1B18]" />
                  <div>
                    <h2 className="text-sm font-bold text-[#1D1B18]">
                      Team Members
                    </h2>
                    <span className="text-[11px] text-[#7C766F] font-normal">
                      {activeMembersCount} members · {invitedCount} invite pending
                    </span>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  {/* Search input */}
                  <div className="relative min-w-[160px] flex-1 sm:flex-none">
                    <Search
                      size={13}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7C766F]"
                    />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-[#EFEAE4] text-xs bg-[#FFFDFB] text-[#1D1B18] placeholder:text-[#9C948D] focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
                    />
                  </div>

                  {/* Role filter dropdown */}
                  <div className="relative">
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-[#EFEAE4] text-xs bg-[#FFFDFB] text-[#1D1B18] font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
                    >
                      <option value="All Roles">All Roles</option>
                      <option value="Project Owner">Project Owner</option>
                      <option value="Developer">Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Research">Research</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7C766F] pointer-events-none"
                    />
                  </div>

                  {/* Sort dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-[#EFEAE4] text-xs bg-[#FFFDFB] text-[#1D1B18] font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#FF6B6B]"
                    >
                      <option value="name_asc">Sort: Name (A-Z)</option>
                      <option value="workload_desc">Sort: Workload (High)</option>
                      <option value="workload_asc">Sort: Workload (Low)</option>
                      <option value="role">Sort: Role</option>
                    </select>
                    <ArrowUpDown
                      size={12}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7C766F] pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Members Row Cards List */}
              <div className="space-y-3">
                {filteredRows.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-[#EFEAE4] text-center text-[#7C766F] space-y-2">
                    <Users size={28} className="mx-auto text-[#B0A7A0]" />
                    <p className="text-sm font-bold text-[#1D1B18]">No team members match this filter</p>
                    <p className="text-xs">Try clearing the search or role filter.</p>
                  </div>
                ) : (
                  filteredRows.map((member) => {
                    const cfg = member.config || ROLE_CONFIGS[member.role] || ROLE_CONFIGS['Developer']
                    const isOwner = member.role === 'Project Owner' || member.is_creator

                    return (
                      <div
                        key={member.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-[#EFEAE4] hover:border-[#D5CEC7] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Column 1: Member Identity (Avatar, Name, Role Pill, Email, Country) */}
                        <div className="flex items-center gap-3.5 min-w-[210px] md:max-w-[260px]">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className={`w-11 h-11 rounded-full object-cover ring-2 ring-offset-2 ${cfg.ringColor} shadow-xs bg-white shrink-0`}
                            onError={(e) => {
                              e.target.src = DEFAULT_AVATARS[0]
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-[#1D1B18] truncate">
                                {member.name}
                              </span>
                              {isOwner && (
                                <span className="text-xs" title="Project Owner">
                                  👑
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.pillBg} ${cfg.pillText}`}
                              >
                                {member.role}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#7C766F] mt-0.5 truncate">
                              <span className="truncate">{member.email}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[#9C948D] mt-0.5">
                              <MapPin size={10} />
                              <span>{member.location || 'India'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 2: Responsibilities */}
                        <div className="flex-1 min-w-[170px] md:px-2">
                          <span className="text-[10px] font-bold text-[#8C847E] uppercase tracking-wider block">
                            Responsibilities
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {member.responsibilities.map((resp, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-xs text-[#3D3733] font-medium"
                              >
                                <span className="text-[#8C847E] mr-1">•</span>
                                <span>{resp}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Column 3: Workload bar & percentage */}
                        <div className="min-w-[130px] md:w-[150px]">
                          <span className="text-[10px] font-bold text-[#8C847E] uppercase tracking-wider block">
                            Workload
                          </span>
                          <div className="flex items-center gap-2.5 mt-1.5">
                            <div className="flex-1 h-2 rounded-full bg-[#EFEAE4] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${cfg.barColor} transition-all duration-500`}
                                style={{ width: `${Math.min(member.workload, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-[#1D1B18] min-w-[32px]">
                              {member.workload}%
                            </span>
                          </div>
                        </div>

                        {/* Column 4: Status badge & Actions menu */}
                        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                          {member.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8F8EE] text-[#1E824C] text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1E824C]" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF3E8] text-[#D97706] text-xs font-bold">
                                <span>⏰</span>
                                <span>Invited</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleResendInvite(member)}
                                className="px-2.5 py-1 rounded-lg border border-[#BAE6FD] bg-[#F0F7FF] text-[#0284C7] hover:bg-[#E0F2FE] text-xs font-bold transition-colors cursor-pointer"
                              >
                                Resend
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                className="p-1 rounded-lg text-[#EF4444] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                                title="Cancel Invitation"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}

                          {/* Three dots dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuId(activeMenuId === member.id ? null : member.id)
                              }}
                              className="p-1.5 rounded-lg text-[#7C766F] hover:text-[#1D1B18] hover:bg-[#F3EDE7] transition-colors cursor-pointer"
                              title="Member Options"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeMenuId === member.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white shadow-lg border border-[#EFEAE4] p-1.5 space-y-1 animate-fadeIn"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditMember(member)
                                    setActiveMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1D1B18] hover:bg-[#FFF4F0] hover:text-[#8E4B49] text-left cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                  <span>Edit details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveMember(member)
                                    setActiveMenuId(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-[#DC2626] hover:bg-[#FEE2E2] text-left cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                  <span>Remove member</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── Right Column: Team Stats (2x2) & Team Templates ── */}
            <div className="lg:col-span-4 space-y-5">
              {/* Card 1: Team Stats */}
              <div className="bg-white rounded-2xl p-5 border border-[#EFEAE4] shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <h3 className="text-sm font-bold text-[#1D1B18]">Team Stats</h3>
                </div>

                {/* 2x2 Grid Tiles */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {/* Tile 1: Total Members */}
                  <div className="bg-[#EFF6FF] rounded-2xl p-3.5 flex items-center gap-3 border border-[#DBEAFE]">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2563EB] shadow-xs shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <span className="text-xl font-black text-[#1D1B18] leading-none block">
                        {totalMembersCount}
                      </span>
                      <span className="text-[11px] font-semibold text-[#64748B] mt-0.5 block">
                        Total Members
                      </span>
                    </div>
                  </div>

                  {/* Tile 2: Active */}
                  <div className="bg-[#F0FDF4] rounded-2xl p-3.5 flex items-center gap-3 border border-[#DCFCE7]">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#16A34A] shadow-xs shrink-0">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <span className="text-xl font-black text-[#1D1B18] leading-none block">
                        {activeMembersCount}
                      </span>
                      <span className="text-[11px] font-semibold text-[#64748B] mt-0.5 block">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Tile 3: Invited */}
                  <div className="bg-[#FFF7ED] rounded-2xl p-3.5 flex items-center gap-3 border border-[#FFEDD5]">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#EA580C] shadow-xs shrink-0">
                      <Clock size={18} />
                    </div>
                    <div>
                      <span className="text-xl font-black text-[#1D1B18] leading-none block">
                        {invitedCount}
                      </span>
                      <span className="text-[11px] font-semibold text-[#64748B] mt-0.5 block">
                        Invited
                      </span>
                    </div>
                  </div>

                  {/* Tile 4: Roles Filled */}
                  <div className="bg-[#FAF5FF] rounded-2xl p-3.5 flex items-center gap-3 border border-[#F3E8FF]">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#9333EA] shadow-xs shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <span className="text-xl font-black text-[#1D1B18] leading-none block">
                        {rolesFilledCount}
                      </span>
                      <span className="text-[11px] font-semibold text-[#64748B] mt-0.5 block">
                        Roles Filled
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Team Templates */}
              <div className="bg-white rounded-2xl p-5 border border-[#EFEAE4] shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1D1B18]">Team Templates</h3>
                    <p className="text-[11px] text-[#7C766F] font-medium">
                      Use a saved layout or create a new one.
                    </p>
                  </div>
                </div>

                {/* Templates list */}
                <div className="space-y-2.5 mt-4">
                  {templates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => handleApplyTemplate(tmpl)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#F0F7FF] border-[#38BDF8] shadow-xs ring-1 ring-[#38BDF8]'
                            : 'bg-white border-[#EFEAE4] hover:bg-[#FFFDFB] hover:border-[#D5CEC7]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Mini avatar cluster preview */}
                          <div className="flex items-center -space-x-2">
                            {DEFAULT_AVATARS.slice(0, Math.min(3, tmpl.memberCount)).map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
                              />
                            ))}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#1D1B18] block">
                              {tmpl.name}
                            </span>
                            <span className="text-[10px] text-[#7C766F]">
                              {tmpl.memberCount} members
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#0284C7] text-white flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Create New Template button */}
                <button
                  type="button"
                  onClick={() => setCreateTemplateModalOpen(true)}
                  className="mt-4 w-full py-2.5 rounded-xl border border-[#D8B4FE] bg-white hover:bg-[#FAF5FF] text-[#9333EA] text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Create New Template</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modal: Add Team Member ── */}
      {addMemberModalOpen && (
        <AddTeamMemberModal
          onClose={() => setAddMemberModalOpen(false)}
          onSubmit={handleAddMember}
        />
      )}

      {/* ── Modal: Edit Member ── */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSubmit={handleSaveEditMember}
        />
      )}

      {/* ── Modal: Save Layout ── */}
      {saveLayoutModalOpen && (
        <SaveLayoutModal
          onClose={() => setSaveLayoutModalOpen(false)}
          onSubmit={handleSaveCurrentLayout}
          defaultName={`${currentProject.name} Layout`}
        />
      )}

      {/* ── Modal: Create New Template ── */}
      {createTemplateModalOpen && (
        <CreateTemplateModal
          onClose={() => setCreateTemplateModalOpen(false)}
          onSubmit={(tmpl) => {
            const next = [tmpl, ...templates]
            setTemplates(next)
            setSelectedTemplateId(tmpl.id)
            try {
              localStorage.setItem('udaan:team-templates', JSON.stringify(next))
            } catch { }
            setCreateTemplateModalOpen(false)
            setNotice(`Created template "${tmpl.name}".`)
          }}
        />
      )}
    </div>
  )
}

// ── Subcomponent Modals ─────────────────────────────────────────────

function AddTeamMemberModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Developer')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('India')
  const [responsibilities, setResponsibilities] = useState('Frontend development, API integration, Testing')
  const [workload, setWorkload] = useState(50)
  const [isDirectAdd, setIsDirectAdd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [inviteResult, setInviteResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() && !isDirectAdd) {
      setError('Please provide an email address for invitation.')
      return
    }
    setError('')
    setBusy(true)

    try {
      const respList = responsibilities.split(',').map(s => s.trim()).filter(Boolean)
      const res = await onSubmit({
        name: name.trim() || 'New Teammate',
        email: email.trim().toLowerCase(),
        role,
        title: title.trim() || `${role} Specialist`,
        location: location.trim() || 'India',
        responsibilities: respList.length ? respList : ['Feature delivery'],
        workload: Number(workload) || 40,
        isDirectAdd,
      })

      if (isDirectAdd) {
        onClose()
      } else {
        setInviteResult(res || { delivery: 'link_only' })
      }
    } catch (err) {
      setError(err.message || 'Could not complete invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copyToClipboard = () => {
    if (!inviteResult?.invite_link) return
    navigator.clipboard?.writeText(inviteResult.invite_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-[#EFEAE4] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE4]">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8E4B49] uppercase">
              TEAM WORKSPACE
            </span>
            <h2 className="text-xl font-black text-[#1D1B18]">
              {inviteResult ? 'Invitation Generated' : 'Add Team Member'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F3EDE7] text-[#7C766F] hover:text-[#1D1B18]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {inviteResult ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border text-xs font-bold text-center flex items-center justify-center gap-2 ${
              inviteResult.delivery === 'sent'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-[#2A5D54]/10 border-[#2A5D54]/30 text-[#2A5D54]'
            }`}>
              <Check size={18} />
              <span>
                {inviteResult.delivery === 'sent'
                  ? `Invitation email sent to ${email}!`
                  : `Invitation link created for ${name || email}!`}
              </span>
            </div>

            {inviteResult.delivery === 'sent' ? (
              <p className="text-[11px] text-[#2A5D54] text-center font-medium px-2">
                Your teammate will receive the invitation link in their inbox. You can also copy and share the direct link below:
              </p>
            ) : (
              <p className="text-[11px] text-[#7C766F] text-center font-medium px-2">
                Share this direct invite link via WhatsApp, Slack, or email so your collaborator can join this workspace:
              </p>
            )}

            {inviteResult.invite_link && (
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#FFF8F3] border border-[#EFEAE4]">
                <label className="block text-[11px] font-bold text-[#534342] uppercase tracking-wider">
                  Direct Invitation Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.invite_link}
                    className="w-full text-xs font-mono bg-white p-2.5 rounded-xl border border-[#EFEAE4] text-[#1D1B18] select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-3.5 py-2.5 rounded-xl bg-[#1D1B18] text-white text-xs font-bold shrink-0 hover:bg-black flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#534342] block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#534342] block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="aarav@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#534342] block mb-1">
                  Role Category
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none bg-white"
                >
                  <option value="Project Owner">Project Owner</option>
                  <option value="Developer">Developer</option>
                  <option value="Designer">Designer</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Research">Research</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#534342] block mb-1">
                  Title / Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Developer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Responsibilities (comma-separated)
              </label>
              <input
                type="text"
                placeholder="e.g. UI/UX design, Prototyping, User testing"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#534342] block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#534342] block mb-1">
                  Initial Workload: {workload}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={workload}
                  onChange={(e) => setWorkload(e.target.value)}
                  className="w-full mt-2 accent-[#FF6B6B]"
                />
              </div>
            </div>

            {/* Add method toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-[#EFEAE4]">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#534342] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDirectAdd}
                  onChange={(e) => setIsDirectAdd(e.target.checked)}
                  className="rounded accent-[#FF6B6B]"
                />
                <span>Add directly as active (skip email invitation)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#534342] hover:bg-[#F3EDE7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl bg-[#FF6B6B] hover:bg-[#EE5353] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                {busy ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <span>{isDirectAdd ? 'Add Member' : 'Send Invitation'}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function EditMemberModal({ member, onClose, onSubmit }) {
  const [name, setName] = useState(member.name || '')
  const [email, setEmail] = useState(member.email || '')
  const [role, setRole] = useState(member.role || 'Developer')
  const [title, setTitle] = useState(member.title || '')
  const [location, setLocation] = useState(member.location || 'India')
  const [responsibilities, setResponsibilities] = useState((member.responsibilities || []).join(', '))
  const [workload, setWorkload] = useState(member.workload || 50)

  const handleSubmit = (e) => {
    e.preventDefault()
    const respList = responsibilities.split(',').map(s => s.trim()).filter(Boolean)
    onSubmit({
      name: name.trim() || member.name,
      email: email.trim() || member.email,
      role,
      title: title.trim() || member.title,
      location: location.trim() || member.location,
      responsibilities: respList.length ? respList : member.responsibilities,
      workload: Number(workload),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-[#EFEAE4] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE4]">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-[#8E4B49] uppercase">
              TEAM MEMBER DETAILS
            </span>
            <h2 className="text-xl font-black text-[#1D1B18]">Edit {member.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F3EDE7] text-[#7C766F] hover:text-[#1D1B18]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Role Category
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none bg-white"
              >
                <option value="Project Owner">Project Owner</option>
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="Hardware">Hardware</option>
                <option value="Research">Research</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Title / Designation
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#534342] block mb-1">
              Responsibilities (comma-separated)
            </label>
            <input
              type="text"
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FFAAA6] outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#534342] block mb-1">
                Workload: {workload}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                className="w-full mt-2 accent-[#FF6B6B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EFEAE4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#534342] hover:bg-[#F3EDE7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1D1B18] hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SaveLayoutModal({ defaultName, onClose, onSubmit }) {
  const [layoutName, setLayoutName] = useState(defaultName || 'Project Team Layout')

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#EFEAE4] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE4]">
          <h2 className="text-lg font-black text-[#1D1B18]">Save Team Layout</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#F3EDE7]">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-[#7C766F]">
          Save the current roles and allocations as a reusable team template.
        </p>
        <input
          type="text"
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
          placeholder="e.g. Core Squad Template"
          className="w-full px-3.5 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#FF6B6B] outline-none"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#534342]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(layoutName.trim() || 'Custom Layout')}
            className="px-5 py-2 rounded-xl bg-[#FF6B6B] hover:bg-[#EE5353] text-white text-xs font-bold"
          >
            Save Layout
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateTemplateModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [memberCount, setMemberCount] = useState(4)

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#EFEAE4] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[#EFEAE4]">
          <h2 className="text-lg font-black text-[#1D1B18]">New Team Template</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#F3EDE7]">
            <X size={16} />
          </button>
        </div>
        <div>
          <label className="text-[11px] font-bold text-[#534342] block mb-1">
            Template Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. AI & Robotics Squad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#EFEAE4] text-xs focus:ring-2 focus:ring-[#9333EA] outline-none"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-[#534342] block mb-1">
            Recommended Team Size: {memberCount}
          </label>
          <input
            type="range"
            min="2"
            max="12"
            value={memberCount}
            onChange={(e) => setMemberCount(Number(e.target.value))}
            className="w-full mt-2 accent-[#9333EA]"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#EFEAE4] text-xs font-bold text-[#534342]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return
              onSubmit({
                id: `tmpl_${Date.now()}`,
                name: name.trim(),
                memberCount,
                roles: ['Project Owner', 'Developer', 'Designer', 'Hardware'].slice(0, memberCount),
              })
            }}
            className="px-5 py-2 rounded-xl bg-[#9333EA] hover:bg-[#7E22CE] text-white text-xs font-bold"
          >
            Create Template
          </button>
        </div>
      </div>
    </div>
  )
}
