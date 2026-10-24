import { useEffect, useState } from 'react'
import UdaanLoader from '../components/UdaanLoader.jsx'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  ExternalLink,
  GitBranch,
  Github,
  Layers,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import {
  associateProjectRepository,
  detectTechnologies,
  disconnectProjectRepository,
  fetchManifests,
  fetchRepositoryBranches,
  fetchRepositoryMetadata,
  fetchRepositoryTree,
  getProjectRepository,
  listConnectedRepositories,
  parseRepositoryUrl,
  readConnectedRepoLocally,
  saveConnectedRepoLocally,
} from '../services/projectRepositoryService.js'
import { fetchProjectDraft, saveProjectDraft } from '../services/ideaWorkflowService.js'
import './ProjectSetup.css'

const draftKey = 'udaan:idea-draft'

function readDraftFromStorage() {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey) || localStorage.getItem(draftKey) || 'null')
  } catch {
    return null
  }
}

function newUuid() {
  return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0
    return (char === 'x' ? random : (random & 3 | 8)).toString(16)
  })
}

export default function ProjectSetup() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Project state
  const [projectDraft, setProjectDraft] = useState(() => {
    const state = location.state || {}
    const stored = readDraftFromStorage() || {}
    const projectId = state.projectId || stored.projectId || newUuid()
    return {
      ...stored,
      projectId,
      idea: state.idea || stored.idea || '',
      projectType: state.projectType || stored.projectType || 'Startup',
    }
  })

  // Repository input & inspected state
  const [urlInput, setUrlInput] = useState('')
  const [existingRepos, setExistingRepos] = useState([])
  const [status, setStatus] = useState('idle') // 'idle' | 'inspecting' | 'ready' | 'connecting' | 'success' | 'error'
  const [error, setError] = useState('')
  const [inspectedRepo, setInspectedRepo] = useState(null)
  const [connectedRepo, setConnectedRepo] = useState(null)
  const [loadingInitial, setLoadingInitial] = useState(true)

  // Load project from Django or verify association
  useEffect(() => {
    let active = true

    async function initialize() {
      const draft = projectDraft
      if (draft.projectId) {
        try {
          // Check if repo already associated in Django
          const repoResponse = await getProjectRepository(draft.projectId).catch(() => null)
          if (active && repoResponse && repoResponse.repo_owner) {
            setConnectedRepo(repoResponse)
            setStatus('success')
          }
        } catch {
          // No repository connected yet, normal state
        }

        // Also fetch draft from Django to ensure sync
        try {
          const draftResponse = await fetchProjectDraft(draft.projectId).catch(() => null)
          if (active && draftResponse) {
            setProjectDraft(current => ({
              ...current,
              idea: draftResponse.idea || current.idea,
              projectType: draftResponse.project_type || current.projectType,
              understanding: draftResponse.understanding || current.understanding,
              workflow: draftResponse.workflow || current.workflow,
            }))
            if (draftResponse.repository) {
              setConnectedRepo(draftResponse.repository)
              setStatus('success')
            }
          }
        } catch {
          // Fall back to storage
        }
      }

      // Check existing connected repos for suggestions
      try {
        const userReposResponse = await listConnectedRepositories().catch(() => null)
        const repos = userReposResponse?.repositories || []
        const local = readConnectedRepoLocally()
        const combined = [...repos]
        if (local && local.fullName && !combined.some(r => r.repo_full_name === local.fullName)) {
          combined.push({
            repo_owner: local.owner,
            repo_name: local.name,
            repo_full_name: local.fullName,
            repo_url: local.url,
            selected_branch: local.branch,
          })
        }
        if (active) {
          setExistingRepos(combined)
        }
      } catch {
        // Non-fatal
      } finally {
        if (active) setLoadingInitial(false)
      }
    }

    initialize()
    return () => { active = false }
  }, [projectDraft.projectId])

  // Inspect repository (fetches metadata, branches, tree, tech detection)
  async function inspectRepository(rawUrl) {
    setError('')
    setStatus('inspecting')
    setInspectedRepo(null)

    try {
      const { owner, name } = parseRepositoryUrl(rawUrl)
      const metadata = await fetchRepositoryMetadata(owner, name)
      const branches = await fetchRepositoryBranches(owner, name)

      // Handle empty repo (no branches)
      if (!branches || branches.length === 0) {
        setInspectedRepo({
          owner,
          name,
          fullName: `${owner}/${name}`,
          url: metadata.html_url || `https://github.com/${owner}/${name}`,
          defaultBranch: 'main',
          branches: ['main'],
          fileCount: 0,
          technologies: [],
          description: metadata.description || '',
          isPrivate: metadata.private || false,
          isEmpty: true,
        })
        setStatus('ready')
        return
      }

      const defaultBranch = metadata.default_branch || branches[0].name || 'main'
      const tree = await fetchRepositoryTree(owner, name, defaultBranch).catch(() => [])
      const manifests = await fetchManifests(owner, name, defaultBranch, tree).catch(() => ({}))
      const technologies = detectTechnologies(tree, manifests)

      setInspectedRepo({
        owner,
        name,
        fullName: `${owner}/${name}`,
        url: metadata.html_url || `https://github.com/${owner}/${name}`,
        defaultBranch,
        branches: branches.map(b => b.name),
        fileCount: tree.length,
        technologies,
        description: metadata.description || '',
        isPrivate: metadata.private || false,
        isEmpty: false,
      })
      setStatus('ready')
    } catch (err) {
      setError(err.message || 'Could not reach or parse this repository URL. Ensure it is public or you have granted access.')
      setStatus('error')
    }
  }

  // Connect inspected repo to project in Django and storage
  async function handleConnectRepository() {
    if (!inspectedRepo) return
    setStatus('connecting')
    setError('')

    try {
      const payload = {
        repo_owner: inspectedRepo.owner,
        repo_name: inspectedRepo.name,
        repo_url: inspectedRepo.url,
        selected_branch: inspectedRepo.defaultBranch,
        is_private: inspectedRepo.isPrivate,
      }

      // Associate in backend
      const result = await associateProjectRepository(projectDraft.projectId, payload)

      // Save locally as active
      saveConnectedRepoLocally({
        owner: inspectedRepo.owner,
        name: inspectedRepo.name,
        fullName: inspectedRepo.fullName,
        url: inspectedRepo.url,
        branch: inspectedRepo.defaultBranch,
        isPrivate: inspectedRepo.isPrivate,
        technologies: inspectedRepo.technologies,
      })

      setConnectedRepo(result)
      setStatus('success')
    } catch (err) {
      setError(err.message || 'Failed to link repository with your project.')
      setStatus('error')
    }
  }

  // Disconnect repo from project
  async function handleDisconnectRepository() {
    if (!projectDraft.projectId) return
    try {
      await disconnectProjectRepository(projectDraft.projectId).catch(() => {})
      setConnectedRepo(null)
      setInspectedRepo(null)
      setStatus('idle')
      setUrlInput('')
    } catch (err) {
      setError(err.message || 'Failed to disconnect repository.')
    }
  }

  // Skip or continue to idea planning (IdeaAnalysis)
  function handleContinueToAnalysis() {
    navigate('/projects/new/analysis', {
      state: {
        projectId: projectDraft.projectId,
        idea: projectDraft.idea,
        projectType: projectDraft.projectType,
      },
    })
  }

  const projectName = projectDraft.understanding?.project_name?.trim() || 'New Project'

  return (
    <div className="min-h-screen bg-[#FFF8F3] text-[#1D1B18] flex flex-col font-['Plus_Jakarta_Sans'] ps-page">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMenuOpen(!menuOpen)} />

        <main className="ps-main">
          <div className="ps-content">
            <Link className="ps-back-link" to="/">
              <ArrowLeft size={14} /> Back to studio dashboard
            </Link>

            <section className="ps-header">
              <span className="ps-eyebrow">
                <Sparkles size={14} /> Project Initialization · Step 1 of 2
              </span>
              <h1>Connect a GitHub Repository</h1>
              <p className="ps-subtitle">
                Optionally link your codebase now so UDAAN can inspect components, detect frameworks, and prepare for Flight Plan verification.
              </p>
            </section>

            {/* Project Summary Card */}
            <section className="ps-idea-recap">
              <div className="ps-idea-recap-left">
                <span className="ps-idea-recap-label">Draft Project: {projectName}</span>
                <p className="ps-idea-recap-text">{projectDraft.idea || 'No idea description entered.'}</p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFAAA6]/40 text-[#7A3C3A] self-start">
                {projectDraft.projectType}
              </span>
            </section>

            {/* Main Repository Connection Card */}
            <div className="ps-card">
              {loadingInitial ? (
                <div className="flex justify-center py-8">
                  <UdaanLoader character="builder" size="sm" message="Loading project details…" sub="fetching integration settings" />
                </div>
              ) : connectedRepo ? (
                /* Already connected state */
                <div className="space-y-4">
                  <div className="ps-connected-banner">
                    <div className="ps-connected-left">
                      <div className="ps-connected-icon">
                        <Check size={18} />
                      </div>
                      <div className="ps-connected-meta">
                        <span className="ps-connected-label">Repository Linked</span>
                        <span className="ps-connected-name">
                          {connectedRepo.repo_full_name || `${connectedRepo.repo_owner}/${connectedRepo.repo_name}`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ps-disconnect-btn"
                      onClick={handleDisconnectRepository}
                    >
                      <Trash2 size={13} /> Disconnect
                    </button>
                  </div>

                  <p className="ps-card-desc">
                    Your codebase is linked to this project. Architecture Visualizer and Flight Plan evidence tracking are active.
                  </p>
                </div>
              ) : (
                /* Connect new repository form */
                <div className="space-y-4">
                  <div className="ps-card-header">
                    <h2 className="ps-card-title">
                      <Github size={18} /> Link GitHub Codebase
                    </h2>
                    <p className="ps-card-desc">
                      Enter any public repository link or your own GitHub repository URL (e.g. <code>https://github.com/owner/repo</code> or <code>owner/repo</code>).
                    </p>
                  </div>

                  <div className="ps-input-row">
                    <div className="ps-input-wrap">
                      <Github size={16} className="ps-input-icon" />
                      <input
                        type="text"
                        className="ps-url-input"
                        placeholder="https://github.com/owner/repository"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && urlInput.trim()) {
                            inspectRepository(urlInput.trim())
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="ps-inspect-btn"
                      disabled={!urlInput.trim() || status === 'inspecting'}
                      onClick={() => inspectRepository(urlInput.trim())}
                    >
                      {status === 'inspecting' ? (
                        <>
                          <LoaderCircle size={14} className="animate-spin" /> Inspecting…
                        </>
                      ) : (
                        <>
                          <Code2 size={14} /> Inspect
                        </>
                      )}
                    </button>
                  </div>

                  {/* Existing Repos Suggestions */}
                  {existingRepos.length > 0 && (
                    <div className="ps-existing-repos">
                      <span className="ps-existing-title">Or select a recent workspace repository:</span>
                      <div className="ps-repo-chips">
                        {existingRepos.map((repo) => (
                          <button
                            key={repo.repo_full_name}
                            type="button"
                            className="ps-repo-chip"
                            onClick={() => {
                              setUrlInput(repo.repo_full_name)
                              inspectRepository(repo.repo_full_name)
                            }}
                          >
                            <Github size={12} />
                            <span>{repo.repo_full_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Box */}
                  {error && (
                    <div className="p-3 bg-[#FFAAA6]/30 border border-[#FFAAA6] rounded-xl flex items-center gap-2 text-xs text-[#8E4B49]">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Inspected Preview Card */}
                  {inspectedRepo && (
                    <div className="ps-preview-box animate-fadeIn">
                      <div className="ps-preview-header">
                        <span className="ps-repo-name">
                          <Github size={16} /> {inspectedRepo.fullName}
                        </span>
                        <span className="ps-visibility-badge">
                          {inspectedRepo.isPrivate ? 'Private' : 'Public'}
                        </span>
                      </div>

                      {inspectedRepo.description && (
                        <p className="text-xs text-[#534342]">{inspectedRepo.description}</p>
                      )}

                      <div className="ps-meta-grid">
                        <div className="ps-meta-item">
                          <span className="ps-meta-label">Default Branch</span>
                          <span className="ps-meta-val">{inspectedRepo.defaultBranch}</span>
                        </div>
                        <div className="ps-meta-item">
                          <span className="ps-meta-label">Source Files</span>
                          <span className="ps-meta-val">{inspectedRepo.fileCount} items</span>
                        </div>
                        <div className="ps-meta-item">
                          <span className="ps-meta-label">Branches</span>
                          <span className="ps-meta-val">{inspectedRepo.branches.length} detected</span>
                        </div>
                      </div>

                      {inspectedRepo.technologies && inspectedRepo.technologies.length > 0 && (
                        <div className="ps-tech-section">
                          <span className="ps-tech-title">Detected Technologies:</span>
                          <div className="ps-tech-chips">
                            {inspectedRepo.technologies.map((t) => (
                              <span key={t} className="ps-tech-chip">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="ps-action-row">
                        <button
                          type="button"
                          className="ps-connect-btn"
                          disabled={status === 'connecting'}
                          onClick={handleConnectRepository}
                        >
                          {status === 'connecting' ? (
                            <>
                              <LoaderCircle size={14} className="animate-spin" /> Linking Codebase…
                            </>
                          ) : (
                            <>
                              <Check size={15} /> Confirm & Link to Project
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation / Proceed Row */}
            <div className="ps-proceed-row">
              <button
                type="button"
                className="ps-skip-btn"
                onClick={handleContinueToAnalysis}
              >
                Skip repository connection for now
              </button>

              <button
                type="button"
                className="ps-next-btn"
                onClick={handleContinueToAnalysis}
              >
                <span>Continue to Idea Breakdown</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
