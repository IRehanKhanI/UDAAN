import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, Copy, Download,
  FileText, Mail, Megaphone, MessageSquareText, Pencil, RefreshCw,
  Search, Sparkles, WandSparkles, X, Zap, TrendingUp, Globe, MapPin, Upload, AlertCircle, Share2
} from 'lucide-react'
import Sidebar from '../layouts/Sidebar.jsx'
import Header from '../layouts/Header.jsx'
import { readSavedProjects } from '../services/projectStorage.js'
import { getLearningProject, listLearningProjects } from '../services/learningService.js'
import { getTeamWorkspace } from '../services/teamService.js'
import { deleteMarketingCampaign, deleteMarketingContent, generateMarketingCampaign, generateMarketingContent, getMarketIntelligence, importMarketIntelligence, listMarketingCampaigns, listMarketingContent, regenerateMarketingCampaignAsset, saveMarketingContent, searchMarketPlaces, updateMarketingCampaign, updateMarketingContent } from '../services/marketingService.js'
import './MarketingStudio.css'

const tabs = [
  { id: 'create', label: 'Create Content', icon: Sparkles },
  { id: 'saved',  label: 'Saved Library', icon: Bookmark  },
  { id: 'market', label: 'Market Intelligence', icon: MapPin },
]

const contentTypes = [
  { mode: 'social',    title: 'Social Post',       subtitle: 'LinkedIn, X, Instagram, Reddit',       icon: MessageSquareText },
  { mode: 'showcase',  title: 'Project Showcase',   subtitle: 'Launch, portfolio, demo day',           icon: TrendingUp        },
  { mode: 'repurpose', title: 'Repurpose',          subtitle: 'Transform existing content',            icon: RefreshCw         },
  { mode: 'campaign',  title: 'Campaign Plan',      subtitle: '7, 14 or 30-day calendar',              icon: FileText          },
  { mode: 'tool',      title: 'Marketing Toolkit',  subtitle: 'Pitches, value props, FAQs',            icon: WandSparkles      },
  { mode: 'email',     title: 'Email Sequence',     subtitle: 'Purposeful audience sequences',         icon: Mail              },
  { mode: 'launch',    title: 'Launch Announce',    subtitle: 'Grounded product announcements',        icon: Megaphone         },
  { mode: 'landing',  title: 'Landing Page Copy',  subtitle: 'Conversion-focused page sections',       icon: Globe              },
]

const platforms     = ['LinkedIn', 'Instagram', 'X', 'Facebook', 'Reddit', 'Email', 'Website']
const tones         = ['Professional', 'Conversational', 'Storytelling', 'Educational', 'Bold', 'Humorous']
const formats       = ['LinkedIn post', 'Instagram caption', '5–8 slide carousel outline', '30–60 second video script', 'X post or thread', 'Demo narration', 'Promotional email']
const showcaseTypes = ['Project launch announcement', 'Build-in-public update', 'Portfolio description', 'Hackathon introduction', 'Demo-day announcement', 'Feature launch', 'Team achievement', 'GitHub repository description', 'README introduction', 'Elevator pitch']
const toolTypes     = ['Product description', 'Landing-page copy', 'Startup elevator pitch', 'Event announcement', 'Personal brand introduction', 'Educational post', 'Internship announcement', 'Achievement announcement', 'Demo-day script', 'Promotional email', 'Audience-specific messaging', 'Call to action variations', 'Headline variations', 'Custom request']
const navCopy       = { social: 'Social post', showcase: 'Project showcase', repurpose: 'Repurpose', campaign: 'Campaign', tool: 'Marketing toolkit', email: 'Email sequence', launch: 'Launch announcement', landing: 'Landing page' }

function normalizeProject(project) {
  const understanding = project.understanding || {}
  return {
    ...project,
    name: project.name || understanding.project_name || 'Untitled project',
    description: project.description || understanding.problem_statement || project.idea || '',
    target_users: understanding.target_users || '',
    expected_outcome: understanding.expected_outcome || '',
    project_type: project.project_type || project.category || 'Project',
    workflow: project.workflow || {},
  }
}

function makeWorkspaceItem(item) {
  const completeBody = [item.hook, item.body, item.cta, ...(item.hashtags || [])].filter(Boolean).join('\n\n')
  return { ...item, body: completeBody, saved: false, favorite: false }
}

function dateLabel(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function projectSummary(project, teamWorkspace) {
  const milestones = project?.workflow?.flight_plan?.milestones || []
  const planned    = milestones.flatMap(item => item.tasks || []).length
  const features   = project?.latest_assessment?.task_assessments || {}
  const verified   = Object.values(features).filter(item => item.status === 'verified').length
  const completed  = teamWorkspace?.tasks?.filter(task => task.status === 'completed').length ?? project?.workspace_completed_tasks ?? 0
  return { milestones, planned, verified, completed }
}

export default function MarketingStudio() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [menuOpen, setMenuOpen]         = useState(false)
  const [projects, setProjects]         = useState(() => readSavedProjects().map(normalizeProject))
  const [backendProjectIds, setBackendProjectIds] = useState(() => new Set())
  const [selectedId, setSelectedId]     = useState(() => searchParams.get('project') || localStorage.getItem('udaan:selected-project') || 'custom')
  const [teamWorkspace, setTeamWorkspace] = useState(null)
  const [activeTab, setActiveTab]       = useState('create')
  const [mode, setMode]                 = useState('social')
  const [wizardStep, setWizardStep]     = useState(1)
  const [advancedBriefOpen, setAdvancedBriefOpen] = useState(false)
  const [inputs, setInputs]             = useState({
    topic: '', objective: 'awareness', audience: '', customer_problem: '',
    value_proposition: '', tone: 'Professional', language: 'English',
    key_message: '', length: 'Medium', keywords: '', cta: '',
    desired_next_action: '', recipient_type: '', extra_instructions: '',
    platform: 'LinkedIn',
    showcase_type: showcaseTypes[0], formats: [formats[0], formats[2], formats[3]],
    campaign_days: 7, campaign_platform: 'LinkedIn', template: toolTypes[0],
    channels: ['LinkedIn'], budget: '', measurable_goals: '',
    competitor_links: [], brand_voice: '', launch_status: 'Not confirmed',
    source_content: '', source_url: '', context_override: '', image_count: 3,
  })
  const [editContext, setEditContext]   = useState(false)
  const [results, setResults]           = useState([])
  const [campaign, setCampaign]         = useState(null)
  const [approach, setApproach]         = useState('')
  const [generationBusy, setGenerationBusy] = useState(false)
  const [refineBusy, setRefineBusy]     = useState('')
  const [library, setLibrary]           = useState([])
  const [libraryLoaded, setLibraryLoaded] = useState(false)
  const [libraryBusy, setLibraryBusy]   = useState(false)
  const [libraryFilters, setLibraryFilters] = useState({ q: '', project: '', type: '', platform: '', status: '' })
  const [error, setError]               = useState('')
  const [notice, setNotice]             = useState('')
  const [copying, setCopying]           = useState('')
  const [marketData, setMarketData]     = useState({ locations: [], summary: null, data_status: 'empty' })
  const [marketBusy, setMarketBusy]     = useState(false)
  const [marketLocation, setMarketLocation] = useState(null)

  const selectedProject = projects.find(item => String(item.id) === String(selectedId)) || null
  const selectedBackendProjectId = selectedProject && backendProjectIds.has(String(selectedProject.id))
    ? selectedProject.id
    : null
  const summary         = useMemo(() => projectSummary(selectedProject, teamWorkspace), [selectedProject, teamWorkspace])
  const savedProjects   = projects
  useEffect(() => {
    if (!selectedProject) {
      if (selectedId === 'custom') {
        setInputs(current => ({ ...current, audience: '', customer_problem: '', value_proposition: '' }))
      }
      return
    }
    setInputs(current => ({
      ...current,
      audience: selectedProject.target_users || '',
      customer_problem: selectedProject.description || '',
      value_proposition: selectedProject.expected_outcome || '',
    }))
  }, [selectedProject?.id, selectedId])
  useEffect(() => {
    if (wizardStep !== 3) return
    const projectName = selectedProject?.name || ''
    const value = inputs.value_proposition.trim()
    const description = selectedProject?.description || ''
    const technologies = (selectedProject?.repository?.detected_technologies || [])
      .map(item => item?.name || item)
      .filter(Boolean)
      .slice(0, 5)
    const verifiedTasks = Object.values(selectedProject?.latest_assessment?.task_assessments || {})
      .filter(item => item?.status === 'verified')
      .map(item => item.taskTitle)
      .filter(Boolean)
      .slice(0, 5)
    const factualPoints = [...verifiedTasks, ...technologies]
    setInputs(current => ({
      ...current,
      topic: current.topic || (projectName ? `Introduce ${projectName} to the selected audience` : ''),
      key_message: current.key_message || value,
      avoid_claims: current.avoid_claims || 'Avoid unsupported metrics, testimonials, capabilities or outcomes.',
      brand_voice: current.brand_voice || 'Clear, credible and grounded in verified project facts.',
      extra_instructions: current.extra_instructions || (description ? `Use this confirmed project description as context: ${description}` : ''),
      keywords: current.keywords || factualPoints.join(', '),
    }))
  }, [wizardStep, selectedProject?.id, selectedProject?.name, selectedProject?.description, selectedProject?.expected_outcome, inputs.value_proposition])

  const loadProjects = useCallback(async () => {
    const localProjects = readSavedProjects().map(normalizeProject)
    const byId = new Map(localProjects.map(project => [String(project.id), project]))
    try {
      const response = await listLearningProjects()
      const backendProjects = response?.results || []
      setBackendProjectIds(new Set(backendProjects.map(project => String(project.id))))
      for (const project of backendProjects) {
        const previous = byId.get(String(project.id)) || {}
        byId.set(String(project.id), normalizeProject({ ...previous, ...project, name: previous.name || project.understanding?.project_name, description: previous.description || project.understanding?.problem_statement }))
      }
    } catch { /* Local project drafts remain selectable if account listing is unavailable. */ }
    const hydrated = await Promise.allSettled([...byId.values()].map(project => getLearningProject(project.id)))
    const verifiedIds = new Set(backendProjects.map(project => String(project.id)))
    hydrated.forEach(result => {
      if (result.status !== 'fulfilled') return
      const project  = result.value
      verifiedIds.add(String(project.id))
      const previous = byId.get(String(project.id)) || {}
      byId.set(String(project.id), normalizeProject({ ...previous, ...project, name: previous.name || project.understanding?.project_name, description: previous.description || project.understanding?.problem_statement }))
    })
    setBackendProjectIds(verifiedIds)
    setProjects([...byId.values()])
    const requested = searchParams.get('project')
    const remembered = localStorage.getItem('udaan:selected-project')
    const all    = [...byId.keys()]
    const chosen = requested && byId.has(String(requested)) ? requested : remembered && byId.has(String(remembered)) ? remembered : all[0] || 'custom'
    setSelectedId(String(chosen))
  }, [])

  const loadLibrary = useCallback(async filters => {
    setLibraryBusy(true)
    try {
      const [response, campaignResponse] = await Promise.all([listMarketingContent(filters || {}), listMarketingCampaigns({ q: filters?.q || '' })])
      const campaigns = (campaignResponse.results || []).map(item => ({
        ...item,
        id: `campaign-${item.id}`,
        campaign_id: item.id,
        isCampaign: true,
        body: item.copy?.body || item.copy?.caption || '',
        title: item.title || 'Marketing campaign',
        content_type: item.content_type || 'Campaign',
      }))
      setLibrary([...(response.results || []), ...campaigns])
      setLibraryLoaded(true)
    } catch (err) {
      setError(err.message || 'Saved content could not be loaded.')
      setLibraryLoaded(true)
    } finally { setLibraryBusy(false) }
  }, [])

  useEffect(() => { void loadProjects(); void loadLibrary() }, [loadProjects, loadLibrary])
  useEffect(() => {
    if (selectedId !== 'custom' && selectedProject?.id) {
      localStorage.setItem('udaan:selected-project', String(selectedProject.id))
      if (searchParams.get('project') !== String(selectedProject.id)) setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('project', String(selectedProject.id)); return next }, { replace: true })
    } else if (selectedId === 'custom' && searchParams.has('project')) setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete('project'); return next }, { replace: true })
  }, [selectedId, selectedProject?.id])
  useEffect(() => {
    if (!selectedProject?.id) { setTeamWorkspace(null); return }
    let active = true
    void getTeamWorkspace(selectedProject.id).then(value => { if (active) setTeamWorkspace(value) }).catch(() => { if (active) setTeamWorkspace(null) })
    return () => { active = false }
  }, [selectedProject?.id])
  useEffect(() => {
    if (activeTab === 'saved') void loadLibrary({ q: libraryFilters.q, project: libraryFilters.project, type: libraryFilters.type, platform: libraryFilters.platform, status: libraryFilters.status })
  }, [activeTab, libraryFilters.project, libraryFilters.type, libraryFilters.platform, libraryFilters.status, loadLibrary])
  useEffect(() => {
    if (activeTab !== 'market' || !selectedBackendProjectId) return
    setMarketBusy(true)
    void getMarketIntelligence(selectedBackendProjectId)
      .then(setMarketData)
      .catch(err => setError(err.message || 'Market data could not be loaded.'))
      .finally(() => setMarketBusy(false))
  }, [activeTab, selectedBackendProjectId])

  const switchTab  = tab => { setActiveTab(tab); const nextMode = tabs.find(item => item.id === tab)?.mode; if (nextMode) setMode(nextMode); setError(''); setNotice('') }
  const prepareLocationCampaign = location => {
    setMarketLocation(location)
    setInputs(current => ({
      ...current,
      topic: current.topic || `${selectedProject?.name || 'Product'} in ${location.name}`,
      audience: current.audience || selectedProject?.target_users || '',
      region_context: {
        region_id: location.region_id || '',
        name: location.name,
        display_name: location.display_name || location.name,
        country: location.country || '',
        state: location.state || '',
        district: location.district || '',
        city: location.city || '',
        boundary_status: location.boundary_status || 'unavailable',
        observed_metrics: location.metrics || {},
        observations: location.observations || 0,
      },
      extra_instructions: `${current.extra_instructions || ''}\nSelected market location: ${location.name}${location.state ? `, ${location.state}` : ''}${location.country ? `, ${location.country}` : ''}. Use only the observed market data shown; do not imply demand where no data exists.`.trim(),
    }))
    setActiveTab('create')
    setWizardStep(1)
    setNotice(`Campaign brief prepared for ${location.name}. Review it before generating.`)
  }
  const handleMarketImport = async file => {
    if (!file) return
    setMarketBusy(true); setError('')
    try {
      await importMarketIntelligence(file, selectedBackendProjectId)
      setMarketData(await getMarketIntelligence(selectedBackendProjectId))
      setNotice('Market data imported. Metrics are labelled as observed data.')
    } catch (err) { setError(err.message || 'Market data import failed.') }
    finally { setMarketBusy(false) }
  }
  const setField   = (key, value) => setInputs(current => ({ ...current, [key]: value }))
  const selectProject = projectId => {
    setSelectedId(projectId)
    setResults([])
    setApproach('')
    setError('')
    const project = projects.find(item => String(item.id) === String(projectId))
    if (project) {
      setInputs(current => ({
        ...current,
        audience: project.target_users || '',
        customer_problem: project.description || '',
        value_proposition: project.expected_outcome || '',
        context_override: '',
      }))
    } else {
      setInputs(current => ({ ...current, audience: '', customer_problem: '', value_proposition: '', context_override: '' }))
    }
  }
  const generationInputs = useMemo(() => {
    const base = { ...inputs }
    if (mode !== 'repurpose') delete base.source_content
    if (mode !== 'campaign') delete base.campaign_days
    if (!selectedProject) delete base.context_override
    return base
  }, [inputs, mode, selectedProject])

  const generate = async event => {
    event?.preventDefault?.()
    if (generationBusy) return
    if (mode === 'repurpose' && !inputs.source_content.trim() && !inputs.source_url.trim()) { setError('Add source content or a URL to repurpose.'); return }
    if (mode !== 'repurpose' && !inputs.audience.trim() && !selectedProject?.target_users) { setError('Add a target audience so the brief can guide the generation.'); return }
    if (mode !== 'repurpose' && !inputs.topic.trim() && !inputs.source_content.trim() && !inputs.source_url.trim()) { setError('Describe what you want to create first.'); return }
    setGenerationBusy(true); setError(''); setNotice(''); setWizardStep(4)
    try {
      const campaignMode = ['social', 'showcase', 'launch', 'landing'].includes(mode)
      if (campaignMode) {
        const response = await generateMarketingCampaign({
          mode,
          project_id: selectedBackendProjectId,
          inputs: {
            ...generationInputs,
            creative_format: inputs.platform ? `${inputs.platform} ${navCopy[mode]}` : navCopy[mode],
            aspect_ratio: mode === 'launch' ? '16:9' : '1:1',
          },
        })
        setCampaign(response)
        const item = response.copy || {}
        setResults([{ ...makeWorkspaceItem(item), localKey: `${Date.now()}-campaign`, id: response.id, saved: true, content_type: mode, generation_inputs: { ...generationInputs, mode }, project: selectedBackendProjectId, projectName: selectedProject?.name || null }])
        setApproach('Three distinct campaign concepts were generated from the same project-grounded brief.')
      } else {
        const response = await generateMarketingContent({ mode, project_id: selectedBackendProjectId, inputs: generationInputs })
        setCampaign(null)
        setResults((response.result?.items || []).map((item, index) => ({ ...makeWorkspaceItem(item), localKey: `${Date.now()}-${index}`, content_type: mode, generation_inputs: { ...generationInputs, mode }, project: selectedBackendProjectId, projectName: selectedProject?.name || null })))
        setApproach(response.result?.approach || '')
      }
      setNotice('Drafts are ready to review and edit. Nothing has been published.')
      setActiveTab('create')
    } catch (err) { if (!results.length) setWizardStep(3); setError(err.message || 'Content generation failed. Your request is still here — try again or revise it.') }
    finally { setGenerationBusy(false) }
  }

  const saveCampaignCopy = async item => {
    try {
      const updated = await updateMarketingCampaign(campaign.id, { copy: { ...campaign.copy, title: item.title, body: item.body, cta: item.cta } })
      setCampaign(updated)
      setNotice('Campaign copy saved.')
    } catch (err) { setError(err.message || 'Campaign copy could not be saved.') }
  }

  const selectCampaignAsset = async index => {
    try {
      const updated = await updateMarketingCampaign(campaign.id, { selected_asset: index })
      setCampaign(updated)
      setNotice('Campaign image selected.')
    } catch (err) { setError(err.message || 'The selected image could not be saved.') }
  }

  const retryCampaignAsset = async index => {
    try {
      const updated = await regenerateMarketingCampaignAsset(campaign.id, index)
      setCampaign(updated)
      setNotice(`Image concept ${index + 1} regenerated.`)
    } catch (err) { setError(err.message || 'This image could not be regenerated.') }
  }

  const copyResult = async item => {
    try { await navigator.clipboard.writeText(item.body); setCopying(item.localKey || item.id); setNotice('Copied to clipboard.') }
    catch { setError('Clipboard access was blocked. Select the text and copy manually.') }
  }

  const saveResult = async item => {
    setError(''); setNotice('')
    const payload = { title: item.title || 'Untitled draft', body: item.body, content_type: item.content_type || mode, platform: item.platform || item.format || '', project_id: item.project || selectedBackendProjectId, generation_inputs: item.generation_inputs || generationInputs, status: 'ready_for_review' }
    try {
      const saved = item.id ? await updateMarketingContent(item.id, payload) : await saveMarketingContent(payload)
      setResults(current => current.map(row => row.localKey === item.localKey || row.id === item.id ? { ...row, ...saved, saved: true, projectName: saved.project_name || row.projectName } : row))
      await loadLibrary()
      setNotice('Saved to your content library.')
    } catch (err) { setError(err.message || 'This draft could not be saved.') }
  }

  const deleteSaved = async item => {
    try {
      if (item.isCampaign) await deleteMarketingCampaign(item.campaign_id)
      else await deleteMarketingContent(item.id)
      setLibrary(current => current.filter(row => row.id !== item.id)); setResults(current => current.filter(row => row.id !== item.id)); setNotice('Draft deleted.')
    }
    catch (err) { setError(err.message || 'Could not delete this draft.') }
  }

  const refine = async (item, action) => {
    const key = `${item.localKey || item.id}:${action}`
    setRefineBusy(key); setError('')
    try {
      const response = await generateMarketingContent({ mode: 'refine', project_id: item.project || selectedProject?.id || null, inputs: { ...(item.generation_inputs || generationInputs), source_title: item.title || '', source_content: item.body, refinement_action: action, extra_instructions: action === 'change tone' ? `Change tone to ${inputs.tone}.` : (item.generation_inputs?.extra_instructions || '') } })
      const newDraft = makeWorkspaceItem(response.result.items[0])
      setResults(current => current.map(row => row.localKey === item.localKey || (item.id && row.id === item.id) ? { ...row, ...newDraft, localKey: row.localKey, id: row.id, saved: Boolean(row.id), generation_inputs: row.generation_inputs } : row))
      setNotice(`Draft ${action}d. Review the result before saving.`)
    } catch (err) { setError(err.message || `Could not ${action} this draft.`) }
    finally { setRefineBusy('') }
  }

  const openSaved = item => {
    if (item.isCampaign) {
      setCampaign({ ...item, id: item.campaign_id })
      setSelectedId(item.project || 'custom')
      setResults([{ ...makeWorkspaceItem(item.copy || {}), localKey: `campaign-${item.campaign_id}`, id: item.campaign_id, saved: true, content_type: 'social', project: item.project, projectName: item.project_name }])
      setActiveTab('create'); setWizardStep(4); setApproach('Saved campaign reopened for editing.')
      return
    }
    setSelectedId(item.project || 'custom')
    setResults(current => [{ ...item, localKey: `saved-${item.id}`, saved: true, generation_inputs: item.generation_inputs || {}, projectName: item.project_name }])
    setMode(item.content_type || 'tool'); setActiveTab('create'); setWizardStep(4); setApproach('Saved draft reopened for editing.')
    if (item.generation_inputs) setInputs(current => ({ ...current, ...item.generation_inputs }))
  }

  const duplicateSaved = item => { openSaved({ ...item, id: null, title: `${item.title} — copy`, status: 'draft' }); setNotice('Copy opened as an unsaved draft.') }
  const repurposeResult = item => { setSelectedId(item.project || selectedId); setMode('repurpose'); setField('source_content', item.body); setField('topic', item.title); setActiveTab('create'); setNotice('Source text added. Choose the formats to create.') }

  const exportResult = item => {
    const text = `${item.title || 'Marketing draft'}\n\n${item.body || ''}\n\n${item.cta ? `CTA: ${item.cta}\n` : ''}${item.hashtags?.length ? `\n${item.hashtags.join(' ')}` : ''}`
    const url    = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href  = url
    anchor.download = `${(item.title || 'marketing-draft').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'marketing-draft'}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Draft exported as a text file.')
  }

  const postToLinkedIn = item => {
    const textToShare = [item.title, item.body, item.cta ? `\n${item.cta}` : '', item.hashtags?.length ? `\n${item.hashtags.join(' ')}` : ''].filter(Boolean).join('\n\n')
    try {
      navigator.clipboard.writeText(textToShare)
    } catch { }
    const encoded = encodeURIComponent(textToShare)
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encoded}`, '_blank', 'noopener,noreferrer')
    setNotice('Copied post to clipboard & opened LinkedIn share! 🚀')
  }

  const continueStrategy = () => {
    setError('')
    if (!inputs.audience.trim()) { setError('Tell us who the ideal customer is.'); return }
    if (!inputs.customer_problem.trim()) { setError('Describe the customer problem.'); return }
    if (!inputs.value_proposition.trim()) { setError('Describe how the project helps this customer.'); return }
    setWizardStep(2)
  }
  const continueFormat = () => {
    setError('')
    if (mode === 'repurpose' && !inputs.source_content.trim() && !inputs.source_url.trim()) { setError('Add source content or a URL to repurpose.'); return }
    if ((mode === 'social' || mode === 'showcase' || mode === 'launch' || mode === 'landing') && !inputs.platform) { setError('Choose a target platform.'); return }
    setWizardStep(3)
  }
  const backWizard = () => { setError(''); setWizardStep(value => Math.max(1, value - 1)) }

  const toggleFormat   = format => setField('formats', inputs.formats.includes(format) ? inputs.formats.filter(item => item !== format) : [...inputs.formats, format])
  const visibleLibrary = library.filter(item => !libraryFilters.q || `${item.title} ${item.body}`.toLowerCase().includes(libraryFilters.q.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#FDFBF9] text-[#1D1B18] flex flex-col ms-page font-['Plus_Jakarta_Sans'] antialiased">
      <Sidebar activePage="marketing-studio" open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-80 flex-1 flex flex-col min-w-0">
        <Header
          currentProject={selectedProject}
          onToggleMobileMenu={() => setMenuOpen(!menuOpen)}
          onProjectSelect={p => selectProject(p.id)}
        />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <div className="ms-content w-full">

            {/* ── Hero Header ── */}
            <section className="ms-heading">
              <div>
                <span className="ms-eyebrow">
                  <Zap size={12} /> Marketing Studio
                </span>
                <h1>Turn ideas into content<br />worth sharing.</h1>
                <p>
                  Generate project-aware social posts, campaigns, launch announcements
                  and more — all grounded in what's real about your work.
                </p>
              </div>
              <div className="ms-project-selector-wrap">
                <span className="ms-project-selector-label">Creating for</span>
                <div className="ms-project-select">
                  <select
                    value={selectedProject?.id || 'custom'}
                    onChange={e => selectProject(e.target.value)}
                  >
                    <option value="custom">✦ Custom Content (No Project)</option>
                    {savedProjects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
            </section>

            {/* ── Feedback ── */}
            {error  && <div className="ms-feedback ms-error"  role="alert"><X size={15} />{error}<button  onClick={() => setError('')}  aria-label="Dismiss"><X size={13} /></button></div>}
            {notice && <div className="ms-feedback ms-success" role="status"><Check size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={13} /></button></div>}

            {/* ── Tabs ── */}
            <nav className="ms-tabs" aria-label="Marketing Studio sections">
              {tabs.map(tab => { const Icon = tab.icon; return (
                <button type="button" key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => switchTab(tab.id)}>
                  <Icon size={14} />{tab.label}
                </button>
              )})}
            </nav>

            {/* ════════════════════════════════════
                SAVED LIBRARY TAB
            ════════════════════════════════════ */}
            {activeTab === 'market' ? (
              <MarketIntelligencePanel
                data={marketData}
                busy={marketBusy}
                project={selectedProject}
                selectedLocation={marketLocation}
                onSelectLocation={setMarketLocation}
                onCreateCampaign={prepareLocationCampaign}
                onImport={handleMarketImport}
              />
            ) : activeTab === 'saved' ? (
              <section className="ms-panel ms-library-panel">
                <div className="ms-library-header">
                  <div>
                    <span className="ms-eyebrow"><Bookmark size={12} /> Your Library</span>
                    <h2>Saved Content</h2>
                    <p>Drafts are private to your account or this browser workspace.</p>
                  </div>
                  <button className="ms-secondary" onClick={() => void loadLibrary()} disabled={libraryBusy}>
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>

                <div className="ms-library-filters">
                  <label>
                    <Search size={15} />
                    <input
                      placeholder="Search saved drafts…"
                      value={libraryFilters.q}
                      onChange={e => setLibraryFilters(c => ({ ...c, q: e.target.value }))}
                    />
                  </label>
                  <select value={libraryFilters.project} onChange={e => setLibraryFilters(c => ({ ...c, project: e.target.value }))}>
                    <option value="">All projects</option>
                    <option value="custom">Custom content</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select value={libraryFilters.type} onChange={e => setLibraryFilters(c => ({ ...c, type: e.target.value }))}>
                    <option value="">All types</option>
                    {Object.entries(navCopy).map(([k, label]) => <option value={k} key={k}>{label}</option>)}
                  </select>
                  <select value={libraryFilters.platform} onChange={e => setLibraryFilters(c => ({ ...c, platform: e.target.value }))}>
                    <option value="">All platforms</option>
                    {platforms.map(v => <option value={v} key={v}>{v}</option>)}
                  </select>
                  <select value={libraryFilters.status} onChange={e => setLibraryFilters(c => ({ ...c, status: e.target.value }))}>
                    <option value="">All statuses</option>
                    <option value="ready_for_review">Ready for review</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {libraryBusy
                  ? <div className="ms-empty"><span className="ms-spinner" /> Loading your library…</div>
                  : visibleLibrary.length
                    ? <div className="ms-library-grid">{visibleLibrary.map(item => <SavedCard key={item.id} item={item} onOpen={openSaved} onDuplicate={duplicateSaved} onDelete={deleteSaved} onPostLinkedIn={() => postToLinkedIn(item)} />)}</div>
                    : <EmptyState title={libraryLoaded ? 'Your library is empty' : 'Loading content'} copy={libraryLoaded ? 'Save a generated draft to keep it here for editing later.' : 'Fetching content saved to this workspace…'} />
                }
              </section>

            ) : (
            /* ════════════════════════════════════
               CREATE CONTENT TAB
            ════════════════════════════════════ */
              <>
                <section className="ms-wizard">
                  <div className="ms-wizard-progress" aria-label="Marketing brief progress">
                    {[['Audience & Strategy', 'Understand your customer'], ['Content Format', 'Choose what to create'], ['Creative Brief', 'Set the direction'], ['Generated Content', 'Edit, save & post']].map(([label, hint], index) => {
                      const number = index + 1
                      return <button type="button" key={label} className={wizardStep === number ? 'active' : wizardStep > number ? 'complete' : ''} onClick={() => number < wizardStep && setWizardStep(number)} disabled={number > wizardStep}><span>{String(number).padStart(2, '0')}</span><b>{label}</b><small>{hint}</small></button>
                    })}
                  </div>
                  {wizardStep === 1 && <section className="ms-wizard-panel">
                    <span className="ms-eyebrow"><Globe size={13} /> Step 01 · Audience & Strategy</span>
                    <h2>Who are you trying to reach?</h2>
                    <p className="ms-wizard-lede">Let's understand your customer before creating your marketing.</p>
                    {selectedProject && <><div className="ms-wizard-project"><span className="ms-context-mark">{selectedProject.name.slice(0, 1).toUpperCase()}</span><div><b>{selectedProject.name}</b><small>{selectedProject.project_type} · context from your saved project</small></div><button type="button" onClick={() => setEditContext(value => !value)}><Pencil size={12} /> {editContext ? 'Close context' : 'Edit project context'}</button></div>{editContext && <label className="ms-field ms-wizard-context-edit"><span>Context used for generation</span><textarea rows="3" maxLength="7000" value={inputs.context_override} onChange={e => setField('context_override', e.target.value)} placeholder="Add or correct confirmed project details. Planned features remain plans." /></label>}</>}
                    <div className="ms-wizard-grid ms-strategy-grid">
                      <label className="ms-field ms-wide"><span>Target audience <i>*</i></span><textarea rows="2" value={inputs.audience} onChange={e => setField('audience', e.target.value)} placeholder="Who are we trying to reach?" /></label>
                      <label className="ms-field ms-wide"><span>Customer problem <i>*</i></span><textarea rows="2" value={inputs.customer_problem} onChange={e => setField('customer_problem', e.target.value)} placeholder="What problem do they face?" /></label>
                      <label className="ms-field ms-wide"><span>Value proposition <i>*</i></span><textarea rows="2" value={inputs.value_proposition} onChange={e => setField('value_proposition', e.target.value)} placeholder="How does this project help them?" /></label>
                      <label className="ms-field"><span>Marketing goal <i>*</i></span><select value={inputs.objective} onChange={e => setField('objective', e.target.value)}>{['awareness', 'leads', 'signups', 'sales', 'beta testers', 'investors'].map(value => <option key={value}>{value}</option>)}</select></label>
                    </div>
                    <div className="ms-wizard-actions"><button className="ms-primary" type="button" onClick={continueStrategy}>Continue to Content Format <ArrowRight size={14} /></button></div>
                  </section>}
                  {wizardStep === 2 && <section className="ms-wizard-panel">
                    <span className="ms-eyebrow"><Sparkles size={13} /> Step 02 · Content Format</span>
                    <h2>What do you want to create?</h2><p className="ms-wizard-lede">Choose the format that best supports your marketing goal.</p>
                    <div className="ms-wizard-type-grid">{contentTypes.map(type => <ContentTypeCard key={type.mode} item={type} selected={mode === type.mode} onClick={() => setMode(type.mode)} />)}</div>
                    {(mode === 'social' || mode === 'showcase' || mode === 'launch' || mode === 'landing' || mode === 'email') && <div className="ms-wizard-platform"><span className="ms-field-label">Target platform or destination</span><div className="ms-platform-options" role="group" aria-label="Target platform or destination">{platforms.map(value => <button type="button" key={value} className={inputs.platform === value ? 'selected' : ''} onClick={() => setField('platform', value)}>{value}</button>)}</div></div>}
                    {mode === 'campaign' && <div className="ms-wizard-grid"><label className="ms-field"><span>Campaign duration</span><select value={inputs.campaign_days} onChange={e => setField('campaign_days', Number(e.target.value))}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></label><label className="ms-field"><span>Primary channel</span><select value={inputs.campaign_platform} onChange={e => setField('campaign_platform', e.target.value)}>{platforms.map(value => <option key={value}>{value}</option>)}</select></label></div>}
                    {mode === 'email' && <div className="ms-wizard-grid"><label className="ms-field"><span>Recipient type</span><input value={inputs.recipient_type} onChange={e => setField('recipient_type', e.target.value)} placeholder="Leads, early adopters, customers…" /></label><label className="ms-field"><span>Purpose / next action</span><input value={inputs.desired_next_action} onChange={e => setField('desired_next_action', e.target.value)} placeholder="Reply, book a call, activate…" /></label></div>}
                    {mode === 'repurpose' && <label className="ms-field ms-wide"><span>Source content or URL <i>*</i></span><textarea rows="3" value={inputs.source_content} onChange={e => setField('source_content', e.target.value)} placeholder="Paste source text; a URL is accepted as a reference only unless fetched by an integration." /></label>}
                    <div className="ms-wizard-actions"><button className="ms-secondary" type="button" onClick={backWizard}><ArrowLeft size={14} /> Back</button><button className="ms-primary" type="button" onClick={continueFormat}>Continue to Creative Brief <ArrowRight size={14} /></button></div>
                  </section>}
                  {wizardStep === 3 && <section className="ms-wizard-panel">
                    <span className="ms-eyebrow"><Pencil size={13} /> Step 03 · Creative Brief</span>
                    <h2>Give your content its direction.</h2><p className="ms-wizard-lede">Only add details relevant to the selected format. Your audience and project facts stay attached.</p>
                    <div className="ms-wizard-summary"><b>{inputs.audience}</b><span>{inputs.objective}</span><span>{contentTypes.find(item => item.mode === mode)?.title}</span><span>{inputs.platform || inputs.campaign_platform}</span></div>
                    <div className="ms-wizard-grid">
                      <label className="ms-field ms-wide"><span>Core message or announcement <i>*</i></span><textarea rows="3" value={inputs.topic} onChange={e => setField('topic', e.target.value)} placeholder="What should this content communicate?" /></label>
                      <label className="ms-field"><span>Tone</span><select value={inputs.tone} onChange={e => setField('tone', e.target.value)}>{['Professional', 'Friendly', 'Bold', 'Educational', 'Inspirational', 'Conversational'].map(value => <option key={value}>{value}</option>)}</select></label>
                      <label className="ms-field"><span>Language</span><input value={inputs.language} onChange={e => setField('language', e.target.value)} /></label>
                      <label className="ms-field"><span>Key points to include</span><textarea rows="2" value={inputs.key_message} onChange={e => setField('key_message', e.target.value)} placeholder="Facts, features or framing to include" /></label>
                      <label className="ms-field"><span>Claims or topics to avoid</span><textarea rows="2" value={inputs.avoid_claims || ''} onChange={e => setField('avoid_claims', e.target.value)} placeholder="Unsupported metrics, promises or topics" /></label>
                      <label className="ms-field"><span>Preferred length</span><select value={inputs.length} onChange={e => setField('length', e.target.value)}><option>Short</option><option>Medium</option><option>Long</option></select></label>
                      <label className="ms-field"><span>Brand voice</span><textarea rows="2" value={inputs.brand_voice} onChange={e => setField('brand_voice', e.target.value)} placeholder="Optional guidance" /></label>
                      <label className="ms-field"><span>Keywords / hashtags</span><input value={inputs.keywords} onChange={e => setField('keywords', e.target.value)} placeholder="Optional" /></label>
                      <label className="ms-field"><span>Call to action <small>optional</small></span><input value={inputs.cta} onChange={e => setField('cta', e.target.value)} placeholder="Sign up, book a demo, request a pilot…" /></label>
                      {['social', 'showcase', 'launch', 'landing'].includes(mode) && (
                        <label className="ms-field"><span>AI image concepts</span><select value={inputs.image_count} onChange={e => setField('image_count', Number(e.target.value))}><option value="1">1 image</option><option value="2">2 images</option><option value="3">3 images</option></select></label>
                      )}
                    </div>
                    <div className="ms-facts-note"><b>Project facts</b><span>Generated claims will be grounded in saved project context. Planned work and completed-but-unverified work are not treated as verified capabilities.</span></div>
                    <div className="ms-wizard-actions"><button className="ms-secondary" type="button" onClick={backWizard}><ArrowLeft size={14} /> Back</button><button className="ms-primary" type="button" onClick={generate} disabled={generationBusy}>{generationBusy ? <><span className="ms-spinner" /> Generating…</> : <>Generate Marketing Content <Sparkles size={14} /></>}</button></div>
                  </section>}
                  {wizardStep === 4 && results.length === 0 && <section className="ms-wizard-panel ms-wizard-empty"><span className="ms-spinner" /><h2>Preparing your workspace</h2><p>Generation did not return content. Review the error above and try again.</p></section>}
                  {wizardStep === 4 && results.length > 0 && (
                    <section className="ms-wizard-panel ms-step4-header-panel">
                      <div className="ms-step4-banner">
                        <div>
                          <span className="ms-eyebrow"><Sparkles size={13} /> Step 04 · Generated Content & 1-Click Publishing</span>
                          <h2>Your marketing drafts are ready!</h2>
                          <p className="ms-wizard-lede">
                            Review and polish your content below. You can refine with AI, save to your library, export as a file, or click <b>Post to LinkedIn</b> to publish right away.
                          </p>
                        </div>
                        <div className="ms-step4-quick-actions">
                          <button type="button" className="ms-secondary" onClick={() => setWizardStep(3)}>
                            <ArrowLeft size={13} /> Edit Brief
                          </button>
                          <button type="button" className="ms-primary" onClick={generate} disabled={generationBusy}>
                            <RefreshCw size={13} /> Regenerate
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </section>

                {/* Repurpose hint */}
                {mode === 'repurpose' && (
                  <div className="ms-repurpose-hint">
                    <Sparkles size={13} style={{display:'inline',marginRight:6}} />
                    Choose the formats above. UDAAN will create one draft for each selected format, preserving the original source meaning.
                  </div>
                )}

                {/* Creative Direction */}
                {approach && results.length > 0 && (
                  <div className="ms-approach">
                    <Sparkles size={16} />
                    <div><b>Creative direction</b><span>{approach}</span></div>
                  </div>
                )}

                {campaign && (
                  <CampaignGallery
                    campaign={campaign}
                    onSelect={selectCampaignAsset}
                    onRetry={retryCampaignAsset}
                    onError={setError}
                  />
                )}

                {/* Results */}
                {results.length > 0 && (
                  <section className="ms-results">
                    <div className="ms-results-heading">
                      <div>
                        <span className="ms-eyebrow"><Zap size={12} /> Your Drafts</span>
                        <h2>Review, edit, save &amp; post</h2>
                        <p>{results.length} editable option{results.length === 1 ? '' : 's'} · 1-click post to LinkedIn or save to library</p>
                      </div>
                      <button className="ms-secondary" onClick={generate} disabled={generationBusy}>
                        <RefreshCw size={13} /> Regenerate all
                      </button>
                    </div>
                    <div className="ms-result-grid">
                      {results.map((item, index) => (
                        <ResultCard
                          key={item.localKey || item.id || index}
                          item={item}
                          index={index}
                          busy={refineBusy}
                          copying={copying}
                          tone={inputs.tone}
                          onChange={(key, value) => setResults(current => current.map(row => row === item ? { ...row, [key]: value } : row))}
                          onCopy={() => void copyResult(item)}
                          onExport={() => exportResult(item)}
                          onPostLinkedIn={() => postToLinkedIn(item)}
                          onSave={() => void (campaign ? saveCampaignCopy(item) : saveResult(item))}
                          onRefine={action => void refine(item, action)}
                          onRepurpose={() => repurposeResult(item)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────── */

function ContentTypeCard({ item, selected, onClick }) {
  const Icon = item.icon
  return (
    <button type="button" className={`ms-type-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span className="ms-type-icon"><Icon size={16} /></span>
      <b>{item.title}</b>
      <small>{item.subtitle}</small>
    </button>
  )
}

function MarketIntelligencePanel({ data, busy, project, selectedLocation, onSelectLocation, onCreateCampaign, onImport }) {
  const mapRef = useRef(null)
  const searchRef = useRef(null)
  const mapInstance = useRef(null)
  const boundaryLayer = useRef(null)
  const [query, setQuery] = useState('')
  const [mapError, setMapError] = useState('')
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [metricLayer, setMetricLayer] = useState('boundaries')
  const mapKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const locations = data.locations || []
  const summary = data.summary
  const availableLayers = [...new Set(locations.flatMap(location => Object.keys(location.metrics || {})))]

  useEffect(() => {
    if (!mapKey || !mapRef.current) return undefined
    const initialize = () => {
      if (!window.google?.maps || mapInstance.current) return
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 22.9734, lng: 78.6569 }, zoom: 5, mapTypeControl: false, streetViewControl: false,
      })
    }
    if (window.google?.maps) { initialize(); return undefined }
    const existing = document.querySelector('script[data-udaan-google-maps]')
    if (existing) {
      existing.addEventListener('load', initialize)
      existing.addEventListener('error', () => setMapError('Google Maps could not be loaded. Check the browser key restrictions and enabled APIs.'))
      return () => existing.removeEventListener('load', initialize)
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapKey)}&libraries=places`
    script.async = true; script.defer = true; script.dataset.udaanGoogleMaps = 'true'
    script.addEventListener('load', initialize)
    script.addEventListener('error', () => setMapError('Google Maps could not be loaded. Check the browser key restrictions and enabled APIs.'))
    document.head.appendChild(script)
    return () => script.removeEventListener('load', initialize)
  }, [mapKey, onSelectLocation])

  useEffect(() => {
    const value = query.trim()
    if (value.length < 2) {
      setSuggestions([])
      setSearchError('')
      return undefined
    }
    let active = true
    const timer = setTimeout(() => {
      setSearchBusy(true)
      void searchMarketPlaces(value)
        .then(response => { if (active) setSuggestions(response.results || []) })
        .catch(error => { if (active) setSearchError(error.message || 'Place search is unavailable.') })
        .finally(() => { if (active) setSearchBusy(false) })
    }, 350)
    return () => { active = false; clearTimeout(timer) }
  }, [query])

  const selectPlace = place => {
    const observed = locations.find(item => [item.name, item.city, item.state, item.country].filter(Boolean).some(value => value.toLowerCase() === place.name.toLowerCase()))
    setQuery(place.display_name || place.name)
    setSuggestions([])
    setSearchError('')
    onSelectLocation({ ...place, ...(observed || {}), metrics: observed?.metrics || {}, observations: observed?.observations || 0, source: observed ? 'imported_observations' : 'geographic_boundary' })
    if (!mapInstance.current || !window.google?.maps) return
    if (boundaryLayer.current) boundaryLayer.current.setMap(null)
    if (place.geometry) {
      boundaryLayer.current = new window.google.maps.Data({ map: mapInstance.current })
      boundaryLayer.current.addGeoJson({ type: 'Feature', properties: { name: place.name }, geometry: place.geometry })
      boundaryLayer.current.setStyle({ fillColor: '#F16B61', fillOpacity: 0.18, strokeColor: '#8E4B49', strokeWeight: 2 })
      const bounds = new window.google.maps.LatLngBounds()
      boundaryLayer.current.forEach(feature => feature.getGeometry()?.forEachLatLng(point => bounds.extend(point)))
      if (!bounds.isEmpty()) mapInstance.current.fitBounds(bounds)
    } else if (place.latitude != null && place.longitude != null) {
      mapInstance.current.setCenter({ lat: place.latitude, lng: place.longitude })
      mapInstance.current.setZoom(10)
    }
  }

  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return
    const markers = locations.filter(item => item.latitude != null && item.longitude != null).map(item => {
      const marker = new window.google.maps.Marker({
        map: mapInstance.current, position: { lat: item.latitude, lng: item.longitude }, title: item.name,
      })
      marker.addListener('click', () => onSelectLocation(item))
      return marker
    })
    return () => markers.forEach(marker => marker.setMap(null))
  }, [locations, onSelectLocation])

  return (
    <section className="ms-market-panel">
      <div className="ms-library-header">
        <div>
          <span className="ms-eyebrow"><MapPin size={12} /> Market Intelligence</span>
          <h2>Explore where your marketing can focus</h2>
          <p>Google Maps provides the geography. Metrics below only come from your connected or imported business data.</p>
        </div>
        <label className="ms-market-import">
          <Upload size={14} /> Import CSV
          <input type="file" accept=".csv,text/csv" onChange={event => { void onImport(event.target.files?.[0]); event.target.value = '' }} disabled={busy || !project} />
        </label>
      </div>
      {!project && <div className="ms-market-empty"><AlertCircle size={18} /><div><b>Select a project first</b><span>Regional records are kept separate for each project and signed-in account.</span></div></div>}
      {!mapKey && <div className="ms-market-empty"><AlertCircle size={18} /><div><b>Google Maps is not configured</b><span>Add VITE_GOOGLE_MAPS_API_KEY to the frontend environment and restrict it to Maps JavaScript API and Places API.</span></div></div>}
      <div className="ms-market-search">
        <Search size={15} />
        <input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a city, state, district or address" />
        {searchBusy && <span className="ms-market-search-status">Searching…</span>}
        {suggestions.length > 0 && <div className="ms-market-suggestions">
          {suggestions.map(place => (
            <button type="button" key={place.region_id} onClick={() => selectPlace(place)}>
              <b>{place.name}</b>
              <small>{place.display_name} · {place.boundary_status === 'available' ? 'Boundary available' : 'Boundary unavailable'}</small>
            </button>
          ))}
        </div>}
      </div>
      {searchError && <p className="ms-error">{searchError}</p>}
      <div className="ms-market-layer-controls">
        <label>Map layer
          <select value={metricLayer} onChange={event => setMetricLayer(event.target.value)}>
            <option value="boundaries">Administrative boundaries</option>
            {['sales', 'enquiries', 'website_visits', 'conversions'].filter(layer => availableLayers.includes(layer)).map(layer => <option key={layer} value={layer}>{layer.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
        {metricLayer !== 'boundaries' && <span className="ms-market-legend">Observed {metricLayer.replaceAll('_', ' ')} · darker values indicate higher values within imported records</span>}
      </div>
      <div className="ms-market-grid">
        <div className="ms-market-map" ref={mapRef}>{mapError || (mapKey ? 'Loading Google Maps…' : 'Map unavailable until a browser key is configured.')}</div>
        <aside className="ms-market-details">
          {selectedLocation ? (
            <>
              <span className="ms-eyebrow"><MapPin size={12} /> Selected location</span>
              <h3>{selectedLocation.name}</h3>
              <p>{[selectedLocation.city, selectedLocation.district, selectedLocation.state, selectedLocation.country].filter(Boolean).join(' → ') || 'Geographic selection'}</p>
              <p>{selectedLocation.boundary_status === 'available' ? 'Administrative boundary available' : 'Boundary unavailable for this place'} · {selectedLocation.provider || 'Google Maps selection'}</p>
              {selectedLocation.observations ? (
                <div className="ms-market-metrics">
                  {Object.entries(selectedLocation.metrics || {}).filter(([, value]) => value != null).map(([key, value]) => <span key={key}><b>{Number(value).toLocaleString()}</b>{key.replaceAll('_', ' ')}</span>)}
                </div>
              ) : <div className="ms-market-empty compact"><AlertCircle size={16} /><span>No connected observations for this location. Do not treat the map selection as demand evidence.</span></div>}
              <button className="ms-primary" type="button" onClick={() => onCreateCampaign(selectedLocation)}>Create Campaign for This Location <ArrowRight size={14} /></button>
            </>
          ) : <div className="ms-market-empty compact"><MapPin size={18} /><span>Search or select a marker to review location context.</span></div>}
          <div className="ms-market-summary">
            <b>Data status</b>
            {summary?.status === 'observed'
              ? <><span>{summary.observations} imported observation(s)</span>{summary.score != null && <span>Explainable signal score: {summary.score}/100</span>}<span>{summary.reliability}</span></>
              : <span>No sales, enquiry or analytics dataset is connected yet. Import approved CSV data to calculate observed metrics.</span>}
          </div>
        </aside>
      </div>
    </section>
  )
}

function EmptyState({ title, copy }) {
  return (
    <div className="ms-empty">
      <span className="ms-empty-icon"><Bookmark size={20} /></span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  )
}

function ResultCard({ item, index, busy, copying, tone, onChange, onCopy, onExport, onPostLinkedIn, onSave, onRefine, onRepurpose }) {
  const key = item.localKey || item.id
  const refinements = [
    ['improve hook', 'Improve hook'],
    ['shorten', 'Shorten'],
    ['expand', 'Expand'],
    ['change tone', 'Change tone'],
  ]
  return (
    <article className="ms-result-card">
      <header>
        <div>
          <span className="ms-result-kicker">{item.day ? `Day ${item.day}` : `Option ${index + 1}`}</span>
          {(item.platform || item.format) && <span className="ms-result-platform">{item.platform || item.format}</span>}
        </div>
      </header>

      <label className="ms-result-title">
        <span>Title / hook</span>
        <input value={item.title || ''} onChange={e => onChange('title', e.target.value)} placeholder="Add a title…" />
      </label>

      {item.objective && <span className="ms-objective">{item.objective}</span>}

      <label className="ms-result-body">
        <span>Editable content</span>
        <textarea
          rows={Math.min(18, Math.max(7, (item.body || '').split('\n').length + 3))}
          value={item.body || ''}
          onChange={e => onChange('body', e.target.value)}
        />
      </label>

      {item.rationale && (
        <p className="ms-rationale"><Sparkles size={12} />{item.rationale}</p>
      )}

      <div className="ms-result-actions">
        <button onClick={onCopy}>
          <Copy size={13} />{copying === key ? 'Copied!' : 'Copy'}
        </button>
        {onPostLinkedIn && (
          <button
            type="button"
            className="ms-linkedin-btn"
            onClick={onPostLinkedIn}
            title="Open in LinkedIn post composer with pre-filled content"
          >
            <Share2 size={13} /> Post to LinkedIn
          </button>
        )}
        <button onClick={onExport}><Download size={13} />Export</button>
        <button className="ms-save-draft" onClick={onSave}>
          <Bookmark size={13} />{item.id ? 'Save edits' : item.saved ? 'Saved ✓' : 'Save to library'}
        </button>
      </div>

      <details className="ms-refine">
        <summary><WandSparkles size={13} /> Refine this draft</summary>
        <div>
          {refinements.map(([action, label]) => (
            <button key={action} disabled={busy === `${key}:${action}`} onClick={() => onRefine(action)}>
              {busy === `${key}:${action}` ? <span className="ms-spinner" /> : <Sparkles size={11} />}
              {label}
            </button>
          ))}
          <button disabled={busy === `${key}:regenerate`} onClick={() => onRefine('regenerate')}>
            <RefreshCw size={11} />Regenerate
          </button>
          <button onClick={onRepurpose}><ArrowRight size={11} />Repurpose</button>
        </div>
        <small>Change tone uses the selected "{tone}" tone. Original request settings are retained.</small>
      </details>
    </article>
  )
}

function CampaignGallery({ campaign, onSelect, onRetry, onError }) {
  const [failedImages, setFailedImages] = useState(() => new Set())
  const assets = campaign.assets || []
  useEffect(() => {
    setFailedImages(new Set())
  }, [campaign.id])
  const retry = async index => {
    setFailedImages(current => {
      const next = new Set(current)
      next.delete(index)
      return next
    })
    await onRetry(index)
  }
  return (
    <section className="ms-campaign-gallery">
      <div className="ms-results-heading">
        <div>
          <span className="ms-eyebrow"><Sparkles size={12} /> AI Creative Gallery</span>
          <h2>Choose your campaign image</h2>
          <p>{assets.length} distinct concepts generated for {campaign.platform || campaign.content_type}.</p>
        </div>
      </div>
      <div className="ms-campaign-assets">
        {assets.map((asset, index) => (
          <article className={`ms-campaign-asset ${campaign.selected_asset === index ? 'selected' : ''}`} key={asset.url || index}>
            {asset.url && asset.status !== 'failed' && !failedImages.has(index)
              ? <img
                  src={asset.url}
                  alt={`${campaign.content_type} concept ${index + 1}`}
                  loading="lazy"
                  onError={() => {
                    setFailedImages(current => new Set(current).add(index))
                    onError?.(`Creative ${index + 1} could not be loaded. Retry generation for this variation.`)
                  }}
                />
              : <div className="ms-campaign-asset-failed">
                  <strong>Creative unavailable</strong>
                  <span>{asset.error || 'The saved image could not be loaded.'}</span>
                </div>}
            <div>
              {asset.url && asset.status !== 'failed' && !failedImages.has(index) && <button type="button" onClick={() => void onSelect(index)}>{campaign.selected_asset === index ? 'Selected campaign image' : 'Select image'}</button>}
              {asset.url && asset.status !== 'failed' && !failedImages.has(index) && <a href={asset.url} download={`campaign-concept-${index + 1}.svg`}>Download</a>}
              <button type="button" onClick={() => void retry(index)}>Retry variation</button>
            </div>
            <details><summary>View image prompt</summary><p>{asset.prompt}</p></details>
            {asset.error && <p className="ms-error">{asset.error}</p>}
          </article>
        ))}
      </div>
      {!assets.length && <p className="ms-error">No image assets were returned. Retry the campaign generation.</p>}
      {onError && null}
    </section>
  )
}

function SavedCard({ item, onOpen, onDuplicate, onDelete, onPostLinkedIn }) {
  return (
    <article className="ms-saved-card">
      <div className="ms-saved-meta">
        <span>{item.content_type || 'Draft'}</span>
        {(item.platform) && <span>{item.platform}</span>}
        {item.isCampaign && <span>{item.assets?.length || 0} AI images</span>}
      </div>
      <h3>{item.title}</h3>
      <p>{item.body}</p>
      <div className="ms-saved-foot">
        <span>{item.project_name || 'Custom content'} · {dateLabel(item.updated_at)}</span>
        <div>
          {onPostLinkedIn && (
            <button title="Post to LinkedIn" onClick={onPostLinkedIn} className="ms-btn-icon-linkedin">
              <Share2 size={13} />
            </button>
          )}
          <button title="Open and edit" onClick={() => onOpen(item)}><Pencil size={13} /></button>
          <button title="Duplicate" onClick={() => onDuplicate(item)}><Copy size={13} /></button>
          <button title="Delete" onClick={() => onDelete(item)}><X size={14} /></button>
        </div>
      </div>
    </article>
  )
}
