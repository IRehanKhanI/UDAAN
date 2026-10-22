import { useMemo, useState } from 'react'
import {
  ArrowRight, Bolt, Check, ChevronDown, CircleCheck, GraduationCap,
  Grid2X2, List, MoreHorizontal, Plus, Rocket, Search, Sparkles, Trash2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { readSavedProjects, removeSavedProject } from '../services/projectStorage.js'
import { deleteProject } from '../services/projectService.js'

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'planning', label: 'Planning' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
]

const categoryIcon = {
  Startup: Rocket,
  Hackathon: Bolt,
  'College Project': GraduationCap,
  'Personal Lab': Sparkles,
  'Personal Project': Sparkles,
}

function ProjectCard({ project, menuOpen, deleting, onOptions, onDelete, onSelect }) {
  const CategoryIcon = categoryIcon[project.category] ?? Rocket
  const toneBg = {
    coral: 'bg-[#FFAAA6]/30 border-[#FFAAA6]/80 text-[#7A3C3A]',
    mint: 'bg-[#fff1ed]/40 border-[#f0dedb] text-[#8e4b49]',
    butter: 'bg-[#FBE191]/40 border-[#FBE191] text-[#766320]',
    lavender: 'bg-[#EAE4F8]/60 border-[#D8C1C0] text-[#534342]',
    honey: 'bg-[#FDE293]/40 border-[#E7DFD0] text-[#705D1B]',
  }[project.tone] || 'bg-white border-[#EFEAE4] text-[#1D1B18]'

  const barColor = {
    coral: 'bg-[#8E4B49]',
    mint: 'bg-[#8e4b49]',
    butter: 'bg-[#705D1B]',
    lavender: 'bg-[#534342]',
    honey: 'bg-[#705D1B]',
  }[project.tone] || 'bg-[#8E4B49]'

  return (
    <article className="group bg-white rounded-3xl p-5 md:p-6 border border-[#EFEAE4] shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${toneBg}`}>
            <CategoryIcon size={13} />
            <span>{project.category}</span>
          </span>

          <div className="relative flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3EDE7] text-[#534342] flex items-center gap-1">
              {project.status === 'completed' && <CircleCheck size={11} className="text-[#8e4b49]" />}
              <span>{project.statusLabel}</span>
            </span>
            <button
              type="button"
              className="text-[#7C766F] hover:text-[#1D1B18] p-1 rounded-full hover:bg-[#F3EDE7] transition-colors cursor-pointer"
              aria-label={`Options for ${project.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => onOptions(project.id)}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="mp-project-menu" role="menu" aria-label={`${project.name} options`}>
                <button type="button" role="menuitem" onClick={() => onDelete(project)} disabled={deleting}>
                  <Trash2 size={14} />
                  <span>{deleting ? 'Deleting…' : 'Delete project'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Name and Description */}
        <div>
          <h2 className="text-lg font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans'] group-hover:text-[#8E4B49] transition-colors leading-snug">
            {project.name}
          </h2>
          <p className="text-xs text-[#534342] mt-1.5 font-normal leading-relaxed line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Progress Bar & Milestones */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-[#534342] font-semibold">
            <span>{project.level}</span>
            <span className="font-mono">{project.progress}% complete</span>
          </div>
          <div className="w-full bg-[#F3EDE7] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#7C766F]">
            <span>Milestone: {project.milestone}</span>
            <span>{project.xp}</span>
          </div>
        </div>

        {/* Stack Chips */}
        {project.stack && project.stack.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {project.stack.map((item) => (
              <span key={item} className="px-2 py-0.5 rounded-md bg-[#F9F2ED] text-[#534342] text-[10px] font-mono font-medium">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-[#EFEAE4] flex items-center justify-between">
        <div className="flex items-center -space-x-1.5" aria-label="Project team">
          {(project.team || ['TS']).map((person) => (
            <span
              key={person}
              className="w-6 h-6 rounded-full bg-[#E7E1DC] text-[#1D1B18] text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
            >
              {person}
            </span>
          ))}
          <span className="text-[11px] text-[#7C766F] ml-3">{project.updated}</span>
        </div>

        <Link
          to={`/flight-plan?project=${encodeURIComponent(project.id)}`}
          onClick={() => onSelect(project)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1B18] hover:bg-black text-white text-xs font-bold transition-all shadow-xs group-hover:scale-105 no-underline"
        >
          <span>Open Plan</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  )
}

export default function MyProjects() {
  const [projects, setProjects] = useState(readSavedProjects)
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Types')
  const [sortBy, setSortBy] = useState('Recently Updated')
  const [view, setView] = useState('grid')
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const counts = useMemo(() => ({
    all: projects.length,
    'in-progress': projects.filter(p => p.status === 'in-progress').length,
    planning: projects.filter(p => p.status === 'planning').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived: projects.filter(p => p.status === 'archived').length,
  }), [projects])

  const visibleProjects = useMemo(() => {
    const filtered = projects.filter(p => {
      const statusMatches = activeTab === 'all' || p.status === activeTab
      const typeMatches = category === 'All Types' || p.category === category
      const queryMatches = `${p.name} ${p.description} ${p.category} ${(p.stack || []).join(' ')}`.toLowerCase().includes(search.toLowerCase())
      return statusMatches && typeMatches && queryMatches
    })
    if (sortBy === 'Highest Progress') return filtered.sort((a, b) => b.progress - a.progress)
    if (sortBy === 'Alphabetical') return filtered.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'Deadline Approaching') return filtered.sort((a, b) => a.progress - b.progress)
    return filtered
  }, [activeTab, category, projects, search, sortBy])

  function handleSelectProject(project) {
    localStorage.setItem('udaan:selected-project', project.id)
  }

  async function handleDeleteProject(project) {
    if (!window.confirm(`Delete "${project.name}"? This will permanently remove the project and its saved data.`)) {
      setOpenMenuId(null)
      return
    }

    setDeletingId(project.id)
    setOpenMenuId(null)
    setNotice('')
    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(project.id)) {
        await deleteProject(project.id)
      }
      removeSavedProject(project.id)
      setProjects(current => current.filter(item => item.id !== project.id))
      setNotice(`${project.name} was deleted.`)
      setNoticeIsError(false)
    } catch (error) {
      setNotice(`Could not delete ${project.name}: ${error.message}`)
      setNoticeIsError(true)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans']">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
          onProjectSelect={handleSelectProject}
        />

        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-7 animate-fadeIn">
          {/* Top Eyebrow & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] text-[#8E4B49] text-xs font-bold tracking-wide border border-[#EFEAE4] shadow-xs mb-2">
                <span className="w-2 h-2 rounded-full bg-[#FFAAA6]"></span>
                <span>STUDIO WORKSPACES</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1D1B18] tracking-tight leading-tight font-['Plus_Jakarta_Sans']">
                My Projects
              </h1>
              <p className="text-sm text-[#534342] mt-1 leading-relaxed">
                Every idea has a journey. Pick up where you left off or launch a new initiative.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/projects/new/setup"
                className="px-5 py-2.5 rounded-full bg-[#FFAAA6] text-[#7A3C3A] hover:bg-[#FFDAD8] text-xs font-bold flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95 no-underline"
              >
                <Plus size={16} />
                <span>New Project</span>
              </Link>
            </div>
          </div>

          {/* Summary Badges Bar */}
          <div className="flex items-center gap-4 text-xs font-semibold text-[#534342] bg-white p-3.5 rounded-2xl border border-[#EFEAE4] shadow-xs">
            <span className="flex items-center gap-1.5">
              <Rocket size={15} className="text-[#8E4B49]" />
              <strong>{counts['in-progress'] + counts.planning}</strong> active projects
            </span>
            <span className="w-1 h-1 rounded-full bg-[#D8C1C0]" />
            <span className="flex items-center gap-1.5">
              <Check size={15} className="text-[#8e4b49]" />
              <strong>{counts.completed + counts.archived}</strong> finished or live
            </span>
          </div>

          {/* Controls: Search, Filters, Sorters, Grid/List */}
          <div className="bg-white p-4 rounded-3xl border border-[#EFEAE4] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C766F]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects by name, stack, or keyword..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6] cursor-pointer"
                >
                  <option>All Types</option>
                  <option>Startup</option>
                  <option>Hackathon</option>
                  <option>College Project</option>
                  <option>Personal Lab</option>
                  <option>Personal Project</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7C766F] pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[#FFF8F3] border border-[#EFEAE4] text-xs font-semibold text-[#1D1B18] focus:outline-none focus:ring-2 focus:ring-[#FFAAA6] cursor-pointer"
                >
                  <option>Recently Updated</option>
                  <option>Highest Progress</option>
                  <option>Alphabetical</option>
                  <option>Deadline Approaching</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7C766F] pointer-events-none" />
              </div>

              <div className="inline-flex p-1 bg-[#F3EDE7] rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    view === 'grid' ? 'bg-white shadow-xs text-[#1D1B18]' : 'text-[#7C766F] hover:text-[#1D1B18]'
                  }`}
                  aria-label="Grid view"
                >
                  <Grid2X2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    view === 'list' ? 'bg-white shadow-xs text-[#1D1B18]' : 'text-[#7C766F] hover:text-[#1D1B18]'
                  }`}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EFEAE4] pb-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FFAAA6] text-[#7A3C3A] shadow-xs'
                      : 'text-[#534342] hover:bg-[#F3EDE7]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/70 text-[#7A3C3A]' : 'bg-[#E7E1DC] text-[#534342]'}`}>
                    {counts[tab.id]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Project Cards Grid */}
          {visibleProjects.length > 0 ? (
            <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {visibleProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  menuOpen={openMenuId === p.id}
                  deleting={deletingId === p.id}
                  onOptions={id => setOpenMenuId(current => current === id ? null : id)}
                  onDelete={handleDeleteProject}
                  onSelect={handleSelectProject}
                />
              ))}

              {/* Start Something New Card */}
              <Link
                to="/projects/new/setup"
                className="group border-2 border-dashed border-[#D8C1C0] hover:border-[#8E4B49] rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all hover:bg-[#FFFDFB] no-underline"
              >
                <div className="w-12 h-12 rounded-full bg-[#FFAAA6]/30 text-[#8E4B49] flex items-center justify-center transition-transform group-hover:scale-110">
                  <Plus size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1B18] font-['Plus_Jakarta_Sans'] group-hover:text-[#8E4B49] transition-colors">
                    Start something new
                  </h3>
                  <p className="text-xs text-[#534342] mt-1 max-w-xs">
                    Bring an idea and we&apos;ll help you shape the complete flight plan.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8E4B49]">
                  <span>Create a project</span>
                  <ArrowRight size={14} />
                </span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#EFEAE4] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F3EDE7] flex items-center justify-center mx-auto text-[#7C766F]">
                <Search size={22} />
              </div>
              <h2 className="text-base font-bold text-[#1D1B18]">
                {activeTab === 'archived' ? 'No archived projects yet' : 'No matching projects found'}
              </h2>
              <p className="text-xs text-[#534342] max-w-sm mx-auto">
                {activeTab === 'archived'
                  ? 'Completed projects you archive will be saved here safely.'
                  : 'Try searching for a different keyword or resetting your filters.'}
              </p>
              <button
                type="button"
                onClick={() => { setSearch(''); setCategory('All Types'); setActiveTab('all') }}
                className="px-4 py-2 rounded-full bg-[#1D1B18] text-white text-xs font-bold hover:bg-black transition-colors"
              >
                Show all projects
              </button>
            </div>
          )}

          {/* Toast Notice */}
          {notice && (
            <div className={`fixed bottom-6 right-6 z-50 ${noticeIsError ? 'bg-[#8E4B49]' : 'bg-[#1D1B18]'} text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-fadeIn`} role={noticeIsError ? 'alert' : 'status'}>
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice('')}
                className="text-[#FFAAA6] hover:text-white"
              >
                ×
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
