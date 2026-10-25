import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ArrowRight, Check, ChevronRight,
  Code2, Cpu, Database, FileCode2,
  Globe, Layers3, Link2, Maximize2,
  Network, Server, Sparkles, Waypoints,
  X, ZoomIn, ZoomOut, Box, Eye
} from 'lucide-react'
import './ArchitectureVisualizer.css'

/* ═══════════════════════════════════════════════════════════════════
   LAYER CONFIGURATION
═══════════════════════════════════════════════════════════════════ */
const LAYER_CFG = {
  frontend: { label: 'Client',   color: '#4a6a8e', bg: '#eef3f8', text: '#2d4a6e' },
  service:  { label: 'Services', color: '#a35a53', bg: '#fef4f2', text: '#7a3830' },
  gateway:  { label: 'Gateway',  color: '#8e4b49', bg: '#fff1ed', text: '#6b2f2d' },
  backend:  { label: 'Backend',  color: '#4d7a5a', bg: '#eef5f0', text: '#2d5a3a' },
  database: { label: 'Database', color: '#7a4d7a', bg: '#f4eef4', text: '#5a2d5a' },
  external: { label: 'External', color: '#8a6a1b', bg: '#fdf6e3', text: '#6b4e0e' },
}
const LAYER_ORDER = ['frontend', 'service', 'gateway', 'backend', 'database', 'external']

const EDGE_COLOR = {
  confirmed:  '#4d7a5a',
  inferred:   '#8a6a1b',
  unverified: '#b5bdb7',
}

/* ═══════════════════════════════════════════════════════════════════
   ARCHITECTURE DATA  (static map of the UDAAN platform itself)
═══════════════════════════════════════════════════════════════════ */
const ARCH = {
  nodes: [
    /* ── Frontend ── */
    { id: 'browser',     layer: 'frontend', name: 'Browser',          role: 'React 19 + Vite SPA',      status: 'confirmed', tech: ['React 19','Vite','Framer Motion'],     files: ['frontend/src/main.jsx','frontend/vite.config.js'] },
    { id: 'sidebar',     layer: 'frontend', name: 'Sidebar & Header', role: 'Navigation shell',          status: 'confirmed', tech: ['React','Lucide Icons'],                files: ['frontend/src/layouts/Sidebar.jsx'] },
    { id: 'pages',       layer: 'frontend', name: 'Page Components',  role: '15+ route pages',           status: 'confirmed', tech: ['React Router v6'],                     files: ['frontend/src/pages/'] },
    /* ── Services ── */
    { id: 'flightplan',  layer: 'service',  name: 'Flight Plan',      role: 'Milestone & mind-map',      status: 'confirmed', tech: ['React','SVG Canvas','Mermaid'],        files: ['frontend/src/pages/FlightPlan.jsx'] },
    { id: 'repository',  layer: 'service',  name: 'Repository',       role: 'GitHub analyser',           status: 'confirmed', tech: ['GitHub REST API','Static Analysis'],   files: ['frontend/src/pages/Repository.jsx'] },
    { id: 'testpilot',   layer: 'service',  name: 'TestPilot',        role: 'AI test generation',        status: 'confirmed', tech: ['Django REST','Gemini'],                files: ['frontend/src/pages/TestPilot.jsx'] },
    { id: 'missionctrl', layer: 'service',  name: 'Mission Control',  role: 'Dashboard & metrics',       status: 'confirmed', tech: ['React','Charts'],                      files: ['frontend/src/pages/MissionControl.jsx'] },
    { id: 'marketing',   layer: 'service',  name: 'Marketing Studio', role: 'AI marketing content',      status: 'confirmed', tech: ['Gemini API','Django REST'],             files: ['frontend/src/pages/MarketingStudio.jsx'] },
    { id: 'learning',    layer: 'service',  name: 'Learning Hub',     role: 'Adaptive learning paths',   status: 'confirmed', tech: ['Gemini API','Django REST'],             files: ['frontend/src/pages/Learning.jsx'] },
    /* ── Gateway ── */
    { id: 'apigateway',  layer: 'gateway',  name: 'Django REST API',  role: 'Unified API gateway :8000', status: 'confirmed', tech: ['Django 4','DRF','CORS'],               files: ['backend/manage.py','backend/config/'] },
    /* ── Backend ── */
    { id: 'coreapp',     layer: 'backend',  name: 'Core App',         role: 'Ideas · roadmaps · AI',     status: 'confirmed', tech: ['Django','Gemini 2.5 Flash','Brave','Tavily'], files: ['backend/apps/core/'] },
    { id: 'usersapp',    layer: 'backend',  name: 'Users & Auth',     role: 'JWT sessions + OTP',        status: 'confirmed', tech: ['Django Auth','JWT','Email OTP'],       files: ['backend/apps/users/'] },
    { id: 'teamsapp',    layer: 'backend',  name: 'Teams',            role: 'Collaboration & invites',   status: 'confirmed', tech: ['Django','WebSocket-ready'],             files: ['backend/apps/teams/'] },
    { id: 'projectsapp', layer: 'backend',  name: 'Projects',         role: 'Milestone tracking + XP',   status: 'confirmed', tech: ['Django','SQLite / PostgreSQL'],         files: ['backend/apps/projects/'] },
    { id: 'integrations',layer: 'backend',  name: 'Integrations',     role: 'External API connectors',   status: 'confirmed', tech: ['GitHub API','Calendar'],               files: ['backend/apps/integrations/'] },
    /* ── Database ── */
    { id: 'sqlite',      layer: 'database', name: 'SQLite / Postgres','role': 'Primary database',        status: 'confirmed', tech: ['SQLite (dev)','PostgreSQL (prod)'],    files: ['backend/db.sqlite3'] },
    /* ── External ── */
    { id: 'gemini',      layer: 'external', name: 'Gemini 2.5',       role: 'AI / LLM provider',         status: 'confirmed', tech: ['gemini-2.5-flash','REST'],             files: ['backend/apps/core/gemini_service.py'] },
    { id: 'brave',       layer: 'external', name: 'Brave Search',     role: 'Competitor research',       status: 'inferred',  tech: ['Brave Search API'],                   files: ['backend/.env.example'] },
    { id: 'tavily',      layer: 'external', name: 'Tavily AI',        role: 'Content extraction',        status: 'inferred',  tech: ['Tavily REST API'],                    files: ['backend/.env.example'] },
    { id: 'github',      layer: 'external', name: 'GitHub API',       role: 'Repo tree & file fetch',    status: 'confirmed', tech: ['api.github.com v3'],                  files: ['frontend/src/pages/Repository.jsx'] },
  ],
  edges: [
    /* frontend internal */
    { from: 'browser',     to: 'sidebar',      label: 'Renders',          status: 'confirmed' },
    { from: 'browser',     to: 'pages',        label: 'React Router',     status: 'confirmed' },
    /* pages → services */
    { from: 'pages',       to: 'flightplan',   label: '/flight-plan',     status: 'confirmed' },
    { from: 'pages',       to: 'repository',   label: '/repository',      status: 'confirmed' },
    { from: 'pages',       to: 'testpilot',    label: '/testpilot',       status: 'confirmed' },
    { from: 'pages',       to: 'missionctrl',  label: '/dashboard',       status: 'confirmed' },
    { from: 'pages',       to: 'marketing',    label: '/marketing',       status: 'confirmed' },
    { from: 'pages',       to: 'learning',     label: '/learning',        status: 'confirmed' },
    /* services → gateway */
    { from: 'flightplan',  to: 'apigateway',   label: 'REST',             status: 'confirmed' },
    { from: 'repository',  to: 'apigateway',   label: 'REST',             status: 'confirmed' },
    { from: 'testpilot',   to: 'apigateway',   label: 'REST',             status: 'confirmed' },
    { from: 'missionctrl', to: 'apigateway',   label: 'REST',             status: 'confirmed' },
    { from: 'marketing',   to: 'apigateway',   label: 'REST',             status: 'confirmed' },
    { from: 'learning',    to: 'apigateway',   label: 'REST',             status: 'confirmed' },
    /* service → external (direct) */
    { from: 'repository',  to: 'github',       label: 'GitHub API (direct)', status: 'confirmed' },
    /* gateway → backend */
    { from: 'apigateway',  to: 'coreapp',      label: 'Routes',           status: 'confirmed' },
    { from: 'apigateway',  to: 'usersapp',     label: 'Auth routes',      status: 'confirmed' },
    { from: 'apigateway',  to: 'teamsapp',     label: 'Team routes',      status: 'confirmed' },
    { from: 'apigateway',  to: 'projectsapp',  label: 'Project routes',   status: 'confirmed' },
    { from: 'apigateway',  to: 'integrations', label: 'Integration routes',status: 'confirmed' },
    /* backend → database */
    { from: 'coreapp',     to: 'sqlite',       label: 'Django ORM',       status: 'confirmed' },
    { from: 'usersapp',    to: 'sqlite',       label: 'Django ORM',       status: 'confirmed' },
    { from: 'teamsapp',    to: 'sqlite',       label: 'Django ORM',       status: 'confirmed' },
    { from: 'projectsapp', to: 'sqlite',       label: 'Django ORM',       status: 'confirmed' },
    /* backend → external AI */
    { from: 'coreapp',     to: 'gemini',       label: 'AI synthesis',     status: 'confirmed' },
    { from: 'coreapp',     to: 'brave',        label: 'Market search',    status: 'inferred'  },
    { from: 'coreapp',     to: 'tavily',       label: 'Content extract',  status: 'inferred'  },
    { from: 'integrations',to: 'github',       label: 'GitHub OAuth',     status: 'inferred'  },
  ]
}

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT ENGINE
═══════════════════════════════════════════════════════════════════ */
const NW      = 172   // node width
const NH      = 62    // node height
const GAP_X   = 68    // horizontal gap between layers
const GAP_Y   = 14    // vertical gap between nodes in same layer
const PAD_X   = 28    // left / right canvas padding
const PAD_TOP = 54    // top padding (layer label area)
const PAD_BOT = 28    // bottom padding

function buildLayout(nodes) {
  const byLayer = {}
  for (const l of LAYER_ORDER) byLayer[l] = []
  for (const n of nodes) {
    if (byLayer[n.layer] !== undefined) byLayer[n.layer].push(n)
  }

  const maxCount = Math.max(...LAYER_ORDER.map(l => byLayer[l].length))
  const canvasH = PAD_TOP + maxCount * (NH + GAP_Y) - GAP_Y + PAD_BOT
  const positions = new Map()
  const colMeta = []   // for column background strips

  let cx = PAD_X
  for (const layer of LAYER_ORDER) {
    const group = byLayer[layer]
    if (!group.length) { cx += NW + GAP_X; continue }

    const colH    = group.length * NH + (group.length - 1) * GAP_Y
    const availH  = canvasH - PAD_TOP - PAD_BOT
    const startY  = PAD_TOP + (availH - colH) / 2

    group.forEach((n, i) => {
      positions.set(n.id, { x: cx, y: startY + i * (NH + GAP_Y), layer })
    })

    colMeta.push({ layer, x: cx, count: group.length })
    cx += NW + GAP_X
  }

  return {
    positions,
    canvasW: cx - GAP_X + PAD_X,
    canvasH,
    colMeta,
    byLayer,
  }
}

/* bezier from right-center of source → left-center of target */
function bezier(from, to) {
  const sx = from.x + NW
  const sy = from.y + NH / 2
  const tx = to.x
  const ty = to.y + NH / 2
  const dx = (tx - sx) * 0.48
  return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`
}

/* ═══════════════════════════════════════════════════════════════════
   NODE ICONS  (simple inline SVG paths)
═══════════════════════════════════════════════════════════════════ */
function LayerIcon({ layer, color, size = 14 }) {
  const s = size, h = s / 2
  if (layer === 'frontend') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  )
  if (layer === 'service') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
  if (layer === 'gateway') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  )
  if (layer === 'backend') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
    </svg>
  )
  if (layer === 'database') return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  )
  /* external */
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   NODE CARD (rendered inside SVG foreignObject for crisp HTML text)
═══════════════════════════════════════════════════════════════════ */
function NodeCard({ node, isSelected, isConnected, isDimmed, color, onClick }) {
  const cfg = LAYER_CFG[node.layer] || LAYER_CFG.frontend
  const borderColor = isSelected ? color : isConnected ? `${color}88` : '#e8e0dd'
  const shadow = isSelected
    ? `0 0 0 2px ${color}30, 0 2px 12px ${color}20`
    : isConnected ? `0 1px 6px ${color}18` : '0 1px 4px #00000010'

  return (
    <div
      className="arch-card"
      style={{
        borderColor,
        boxShadow: shadow,
        opacity: isDimmed ? 0.2 : 1,
        transform: isSelected ? 'scale(1.025)' : 'scale(1)',
        background: isSelected ? cfg.bg : '#fff',
      }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${node.name}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      {/* Left accent bar */}
      <div className="arch-card-accent" style={{ background: color }}/>

      {/* Icon badge */}
      <div className="arch-card-icon" style={{ background: `${color}16`, color }}>
        <LayerIcon layer={node.layer} color={color} size={14}/>
      </div>

      {/* Text */}
      <div className="arch-card-text">
        <span className="arch-card-name">{node.name}</span>
        <span className="arch-card-role">{node.role}</span>
      </div>

      {/* Status dot */}
      <div
        className={`arch-status-dot ${node.status === 'confirmed' ? 'arch-status-dot--pulse' : ''}`}
        style={{ background: node.status === 'confirmed' ? '#4d7a5a' : node.status === 'inferred' ? '#8a6a1b' : '#b5bdb7' }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   EDGE PATH (SVG)
═══════════════════════════════════════════════════════════════════ */
function EdgePath({ edge, fromPos, toPos, isHighlighted, isDimmed, dashOffset }) {
  if (!fromPos || !toPos) return null

  const sameLayer = fromPos.layer === toPos.layer
  if (sameLayer) return null // skip intra-layer edges (drawn separately if needed)

  const color = EDGE_COLOR[edge.status] || EDGE_COLOR.unverified
  const d = bezier(fromPos, toPos)

  const strokeW   = isHighlighted ? 2   : 1.2
  const opacity   = isDimmed ? 0.07 : isHighlighted ? 1 : 0.38
  const dashArray = edge.status === 'inferred' ? '5 4' : edge.status === 'unverified' ? '3 3' : 'none'

  return (
    <g>
      {/* Glow halo on highlighted */}
      {isHighlighted && (
        <path d={d} fill="none" stroke={color} strokeWidth={6} strokeOpacity={0.12}/>
      )}
      {/* Main edge */}
      <path
        d={d} fill="none" stroke={color}
        strokeWidth={strokeW} strokeOpacity={opacity}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${edge.status})`}
      />
      {/* Animated flow on confirmed + highlighted */}
      {edge.status === 'confirmed' && isHighlighted && (
        <path d={d} fill="none" stroke={color}
          strokeWidth={2.5} strokeDasharray="5 30"
          strokeDashoffset={dashOffset} strokeOpacity={0.7}/>
      )}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN GRAPH
═══════════════════════════════════════════════════════════════════ */
function NodeGraph({ nodes, edges, onSelect, selected }) {
  const { positions, canvasW, canvasH, colMeta } = buildLayout(nodes)
  const [zoom, setZoom]   = useState(0.72)
  const [pan, setPan]     = useState({ x: 0, y: 0 })
  const dragging          = useRef(false)
  const lastPt            = useRef({ x: 0, y: 0 })
  const svgRef            = useRef(null)
  const [dashOffset, setDashOffset] = useState(0)

  /* animated flow */
  useEffect(() => {
    let id; let prev = null
    const loop = ts => {
      if (prev !== null) setDashOffset(o => (o - (ts - prev) * 0.025) % 100)
      prev = ts; id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])

  /* wheel zoom */
  const onWheel = useCallback(e => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.06 : 0.06
    setZoom(z => Math.max(0.3, Math.min(2, Math.round((z + delta) * 100) / 100)))
  }, [])
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  /* pan */
  const onMouseDown = useCallback(e => {
    if (e.button !== 0 || e.target.closest('.arch-card')) return
    dragging.current = true
    lastPt.current = { x: e.clientX, y: e.clientY }
  }, [])
  const onMouseMove = useCallback(e => {
    if (!dragging.current) return
    const dx = e.clientX - lastPt.current.x
    const dy = e.clientY - lastPt.current.y
    lastPt.current = { x: e.clientX, y: e.clientY }
    setPan(p => ({ x: p.x + dx, y: p.y + dy }))
  }, [])
  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  /* build connected-node set for dimming */
  const connectedIds = new Set()
  if (selected) {
    connectedIds.add(selected.id)
    for (const e of edges) {
      if (e.from === selected.id) connectedIds.add(e.to)
      if (e.to   === selected.id) connectedIds.add(e.from)
    }
  }

  return (
    <div className="arch-graph-wrap">
      {/* Toolbar */}
      <div className="arch-toolbar">
        <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))} title="Zoom in"><ZoomIn size={13}/></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(2)))} title="Zoom out"><ZoomOut size={13}/></button>
        <span className="arch-toolbar-sep"/>
        <button onClick={() => { setZoom(0.72); setPan({ x: 0, y: 0 }) }} title="Reset view"><Maximize2 size={12}/></button>
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        className="arch-svg"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
      >
        <defs>
          {/* Arrow markers */}
          {Object.entries(EDGE_COLOR).map(([s, c]) => (
            <marker key={s} id={`arrow-${s}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
              <path d="M0,0.5 L0,5.5 L6,3 z" fill={c} opacity="0.85"/>
            </marker>
          ))}
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} style={{ transformOrigin: '0 0' }}>

          {/* Column background strips */}
          {colMeta.map(({ layer, x }) => {
            const cfg = LAYER_CFG[layer]
            return (
              <g key={layer}>
                <rect
                  x={x - 10} y={8} width={NW + 20}
                  height={canvasH - 12} rx={10}
                  fill={cfg.bg} opacity={0.55}
                />
                {/* Layer label */}
                <text
                  x={x + NW / 2} y={32}
                  textAnchor="middle"
                  className="arch-layer-label"
                  style={{ fill: cfg.color }}
                >
                  {cfg.label.toUpperCase()}
                </text>
              </g>
            )
          })}

          {/* Edges */}
          {edges.map((edge, i) => {
            const fp = positions.get(edge.from)
            const tp = positions.get(edge.to)
            if (!fp || !tp) return null
            const isHighlighted = !!selected && (edge.from === selected.id || edge.to === selected.id)
            const isDimmed      = !!selected && !isHighlighted
            return (
              <EdgePath
                key={i} edge={edge}
                fromPos={fp} toPos={tp}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                dashOffset={dashOffset}
              />
            )
          })}

          {/* Nodes (foreignObject for crisp HTML rendering) */}
          {nodes.map(node => {
            const pos = positions.get(node.id)
            if (!pos) return null
            const cfg   = LAYER_CFG[node.layer] || LAYER_CFG.frontend
            const isSelected  = selected?.id === node.id
            const isConnected = selected && !isSelected && connectedIds.has(node.id)
            const isDimmed    = !!selected && !isSelected && !isConnected

            return (
              <foreignObject
                key={node.id}
                x={pos.x} y={pos.y}
                width={NW} height={NH}
                className="arch-node-fo"
                style={{ overflow: 'visible' }}
              >
                <NodeCard
                  node={node}
                  color={cfg.color}
                  isSelected={isSelected}
                  isConnected={isConnected}
                  isDimmed={isDimmed}
                  onClick={() => onSelect(isSelected ? null : node)}
                />
              </foreignObject>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="arch-legend">
        <span><i style={{ background: EDGE_COLOR.confirmed }}/> Confirmed</span>
        <span><i style={{ borderStyle: 'dashed', borderColor: EDGE_COLOR.inferred, background: 'transparent' }}/> Inferred</span>
        <span><i style={{ borderStyle: 'dashed', borderColor: EDGE_COLOR.unverified, background: 'transparent' }}/> Unverified</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DETAIL PANEL
═══════════════════════════════════════════════════════════════════ */
function DetailPanel({ node, edges, allNodes, onClose, onOpenFile }) {
  if (!node) return null
  const cfg     = LAYER_CFG[node.layer] || LAYER_CFG.frontend
  const outgoing = edges.filter(e => e.from === node.id)
  const incoming = edges.filter(e => e.to   === node.id)
  const find    = id => allNodes.find(n => n.id === id)

  return (
    <aside className="av2-detail" style={{ '--av2-accent': cfg.color }}>
      <div className="av2-detail-header">
        <div className="av2-detail-badge" style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}44`, color: cfg.color }}>
          {cfg.label.toUpperCase()}
        </div>
        <button className="av2-close" onClick={onClose} aria-label="Close"><X size={15}/></button>
      </div>

      <h3 className="av2-detail-name">{node.name}</h3>
      <p className="av2-detail-role">{node.role}</p>

      <div className={`av2-detail-status status-${node.status}`}>
        <span className="av2-status-dot"/>
        {node.status}
      </div>

      {node.tech?.length > 0 && (
        <div className="av2-detail-section">
          <h4><Layers3 size={12}/> Technologies</h4>
          <div className="av2-chips">
            {node.tech.map(t => <span key={t} className="av2-chip">{t}</span>)}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="av2-detail-section">
          <h4><ArrowRight size={12}/> Connects to</h4>
          {outgoing.map((e, i) => {
            const target = find(e.to)
            return (
              <div key={i} className="av2-conn-row">
                <span className="av2-conn-dot" style={{ background: EDGE_COLOR[e.status] }}/>
                <span className="av2-conn-name">{target?.name || e.to}</span>
                <small className="av2-conn-label">{e.label}</small>
              </div>
            )
          })}
        </div>
      )}

      {incoming.length > 0 && (
        <div className="av2-detail-section">
          <h4><ChevronRight size={12}/> Receives from</h4>
          {incoming.map((e, i) => {
            const src = find(e.from)
            return (
              <div key={i} className="av2-conn-row">
                <span className="av2-conn-dot" style={{ background: EDGE_COLOR[e.status] }}/>
                <span className="av2-conn-name">{src?.name || e.from}</span>
                <small className="av2-conn-label">{e.label}</small>
              </div>
            )
          })}
        </div>
      )}

      {node.files?.length > 0 && (
        <div className="av2-detail-section">
          <h4><FileCode2 size={12}/> Source files</h4>
          {node.files.map(f => (
            <button key={f} className="av2-file-btn" onClick={() => onOpenFile?.(f)}>
              <FileCode2 size={11}/><span>{f}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TECHNOLOGY STACK VIEW
═══════════════════════════════════════════════════════════════════ */
const STACK_LAYERS = [
  { id: 'client', label: 'Client Layer', color: '#4a6a8e', icon: Eye,
    items: [
      { name: 'React 19', desc: 'UI component framework', badge: 'v19', file: 'frontend/package.json' },
      { name: 'Vite 7', desc: 'Dev server & bundler', badge: 'v7', file: 'frontend/vite.config.js' },
      { name: 'React Router', desc: 'Client-side routing', badge: 'v6', file: 'frontend/src/main.jsx' },
      { name: 'Framer Motion', desc: 'Animations & transitions', badge: null, file: 'frontend/package.json' },
      { name: 'Mermaid.js', desc: 'Diagram rendering', badge: null, file: 'frontend/package.json' },
      { name: 'Lucide Icons', desc: 'Icon library', badge: null, file: null },
    ]},
  { id: 'api', label: 'API / Backend Layer', color: '#4d7a5a', icon: Server,
    items: [
      { name: 'Django 4', desc: 'Web framework', badge: 'v4', file: 'backend/manage.py' },
      { name: 'Django REST Framework', desc: 'API serialization', badge: null, file: 'backend/requirements.txt' },
      { name: 'CORS Headers', desc: 'Cross-origin support', badge: null, file: 'backend/requirements.txt' },
      { name: 'Python 3.10+', desc: 'Runtime', badge: '3.10+', file: 'backend/requirements.txt' },
    ]},
  { id: 'ai', label: 'AI / Intelligence Layer', color: '#8e4b49', icon: Sparkles,
    items: [
      { name: 'Gemini 2.5 Flash', desc: 'Roadmap synthesis, test generation, market analysis', badge: 'LLM', file: 'backend/apps/core/gemini_service.py' },
      { name: 'Brave Search API', desc: 'Real-time competitor research', badge: 'Optional', file: 'backend/.env.example' },
      { name: 'Tavily AI', desc: 'Deep content extraction', badge: 'Optional', file: 'backend/.env.example' },
      { name: 'GitHub REST API', desc: 'Repository intelligence', badge: 'v3', file: 'frontend/src/pages/Repository.jsx' },
    ]},
  { id: 'data', label: 'Data Layer', color: '#7a4d7a', icon: Database,
    items: [
      { name: 'SQLite', desc: 'Development database', badge: 'dev', file: 'backend/db.sqlite3' },
      { name: 'PostgreSQL', desc: 'Production database', badge: 'prod', file: 'backend/.env.example' },
      { name: 'Django ORM', desc: 'Object-relational mapper', badge: null, file: null },
      { name: 'localStorage', desc: 'Client-side repo state cache', badge: null, file: null },
    ]},
  { id: 'infra', label: 'Dev & Tooling', color: '#78857b', icon: Cpu,
    items: [
      { name: 'Bun / npm', desc: 'Package management', badge: null, file: 'frontend/bun.lock' },
      { name: 'Vite Proxy', desc: 'Zero-CORS dev bridge', badge: null, file: 'frontend/vite.config.js' },
      { name: 'Node.js Test Runner', desc: '27 frontend unit tests', badge: '27 tests', file: null },
      { name: 'Django Test Runner', desc: '102 backend tests', badge: '102 tests', file: 'backend/apps/core/tests.py' },
    ]},
]

function StackView({ onOpenFile }) {
  return (
    <div className="av2-stack">
      {STACK_LAYERS.map(layer => {
        const Icon = layer.icon
        return (
          <div key={layer.id} className="av2-stack-layer" style={{ '--sl-color': layer.color }}>
            <div className="av2-stack-layer-header">
              <span className="av2-stack-layer-icon"><Icon size={14}/></span>
              <strong>{layer.label}</strong>
              <span className="av2-stack-count">{layer.items.length}</span>
            </div>
            <div className="av2-stack-items">
              {layer.items.map(item => (
                <button key={item.name} className="av2-stack-card"
                  disabled={!item.file} onClick={() => item.file && onOpenFile?.(item.file)}>
                  <div className="av2-stack-card-top">
                    <strong>{item.name}</strong>
                    {item.badge && <span className="av2-badge">{item.badge}</span>}
                  </div>
                  <small>{item.desc}</small>
                  {item.file && <code>{item.file}</code>}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   API CONNECTIONS VIEW
═══════════════════════════════════════════════════════════════════ */
function ApiFlowView({ analysis, onOpenFile }) {
  const endpoints  = analysis?.insights?.endpoints || []
  const externalApis = analysis?.architecture?.externalApis || []
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? endpoints
    : filter === 'matched'   ? endpoints.filter(e => e.route)
    : endpoints.filter(e => !e.route)

  return (
    <div className="av2-api">
      <div className="av2-api-header">
        <div>
          <h3>API Connections</h3>
          <p>{endpoints.length} endpoint sites · {endpoints.filter(e => e.route).length} statically matched</p>
        </div>
        <div className="av2-api-filters">
          {['all','matched','unmatched'].map(f => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!endpoints.length ? (
        <div className="av2-api-empty">
          <Network size={28}/>
          <strong>No API endpoints found in repository</strong>
          <p>Connect and sync a repository with API service files to see endpoint mapping.</p>
        </div>
      ) : (
        <div className="av2-api-table">
          <div className="av2-api-table-head">
            <span>Method & Path</span><span>Status</span><span>Matched View</span><span>Source File</span>
          </div>
          {filtered.map((ep, i) => {
            const status = !ep.route ? 'unverified'
              : ep.route.methodStatus === 'unknown' || ep.route.methodStatus === 'mismatch' ? 'inferred'
              : 'confirmed'
            return (
              <button key={i} className="av2-api-row" onClick={() => onOpenFile?.(ep.sourcePath)}>
                <span className="av2-method-path">
                  <code className={`av2-method av2-method-${ep.method?.toLowerCase()}`}>{ep.method}</code>
                  <span>{ep.path}</span>
                </span>
                <span className={`av2-api-status av2-api-status--${status}`}>{status}</span>
                <span className="av2-api-view">{ep.route?.view || '—'}</span>
                <code className="av2-api-file">{ep.sourcePath}:{ep.line}</code>
              </button>
            )
          })}
        </div>
      )}

      {externalApis.length > 0 && (
        <div className="av2-external-apis">
          <h4><Globe size={13}/> External APIs called</h4>
          {externalApis.map((api, i) => (
            <button key={i} className="av2-ext-row" onClick={() => onOpenFile?.(api.file)}>
              <Globe size={13}/>
              <strong>{api.host}</strong>
              <small>{api.file}:{api.line}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   DATABASE SCHEMA VIEW
═══════════════════════════════════════════════════════════════════ */
function DbSchemaView({ analysis, onOpenFile }) {
  const entities      = analysis?.architecture?.databaseSchema?.entities || []
  const relationships = analysis?.architecture?.databaseSchema?.relationships || []
  const [selected, setSelected] = useState(null)

  if (!entities.length) return (
    <div className="av2-db-empty">
      <Database size={32}/>
      <strong>No database schema detected</strong>
      <p>Connect a repository with Django models, Prisma schema, or SQL to see the schema here.</p>
    </div>
  )

  return (
    <div className="av2-db">
      <div className="av2-db-grid">
        {entities.map((entity, i) => (
          <div key={`${entity.name}-${i}`}
            className={`av2-db-table ${selected?.name === entity.name ? 'av2-db-table--selected' : ''}`}
            onClick={() => setSelected(selected?.name === entity.name ? null : entity)}>
            <div className="av2-db-table-header">
              <Database size={12}/>
              <strong>{entity.displayName || entity.name}</strong>
              <code>{entity.kind}</code>
            </div>
            <div className="av2-db-fields">
              {(entity.fields || []).slice(0, 8).map((field, fi) => (
                <div key={`${field.name}-${fi}`} className="av2-db-field">
                  <code className="av2-db-field-name">{field.name}</code>
                  <span className="av2-db-field-type">{field.type}</span>
                </div>
              ))}
              {(entity.fields || []).length > 8 && (
                <small className="av2-db-more">+{entity.fields.length - 8} more</small>
              )}
            </div>
            <button className="av2-db-file" onClick={e => { e.stopPropagation(); onOpenFile?.(entity.file) }}>
              <FileCode2 size={10}/>{entity.file}
            </button>
          </div>
        ))}
      </div>
      {relationships.length > 0 && (
        <div className="av2-db-relations">
          <h4><Link2 size={13}/> Model relationships ({relationships.length})</h4>
          {relationships.map((r, i) => (
            <div key={i} className="av2-rel-row">
              <strong>{r.from}</strong>
              <span className="av2-rel-line"><span style={{ opacity:.5, fontSize:'10px' }}>{r.kind}</span><ArrowRight size={10}/></span>
              <strong>{r.to}</strong>
              <small>{r.label}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   STATS BAR
═══════════════════════════════════════════════════════════════════ */
function StatsBar({ analysis, repository }) {
  const nodeCount  = ARCH.nodes.length
  const edgeCount  = ARCH.edges.length
  const files      = analysis?.evidenceFiles?.length ?? 0
  const apis       = analysis?.insights?.endpointCount ?? 0
  const matched    = (analysis?.insights?.endpoints || []).filter(e => e.route).length
  const tables     = analysis?.architecture?.databaseSchema?.entities?.length ?? 0

  return (
    <div className="av2-stats">
      {[
        { label: 'Components',    value: nodeCount,       icon: Box,      color: '#4a6a8e' },
        { label: 'Connections',   value: edgeCount,       icon: Link2,    color: '#4d7a5a' },
        { label: 'Source Files',  value: files || '—',    icon: FileCode2,color: '#7a4d7a' },
        { label: 'API Endpoints', value: apis  || '—',    icon: Waypoints,color: '#8e4b49' },
        { label: 'DB Tables',     value: tables || '—',   icon: Database, color: '#8a6a1b' },
        { label: 'Matched Routes',value: matched || '—',  icon: Check,    color: '#4d7a5a' },
      ].map(stat => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="av2-stat">
            <span className="av2-stat-icon" style={{ color: stat.color, background: `${stat.color}18` }}>
              <Icon size={13}/>
            </span>
            <div>
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT EXPORT
═══════════════════════════════════════════════════════════════════ */
const VIEWS = [
  { id: 'system',   label: 'System Architecture', icon: Network  },
  { id: 'database', label: 'Database Schema',      icon: Database },
  { id: 'api',      label: 'API Connections',      icon: Waypoints},
  { id: 'stack',    label: 'Technology Stack',     icon: Layers3  },
]

export default function ArchitectureVisualizer({ analysis, repository, loading, onOpenFile }) {
  const [activeView, setActiveView] = useState('system')
  const [selected, setSelected]     = useState(null)

  useEffect(() => { setSelected(null) }, [activeView])

  if (loading) return (
    <div className="av2-shell av2-loading">
      <div className="av2-spinner"/>
      <strong>Analysing repository evidence…</strong>
      <p>Building architecture map from source files.</p>
    </div>
  )

  return (
    <section className="av2-shell" aria-label="Architecture visualizer">

      {/* Header */}
      <header className="av2-header">
        <div className="av2-header-left">
          <span className="av2-kicker"><Network size={13}/> ARCHITECTURE VISUALIZER</span>
          <h2>Explore how UDAAN fits together</h2>
          <p>
            {ARCH.nodes.length} components · {ARCH.edges.length} connections across 6 layers.
            Click any node to inspect it.
            {repository?.syncedAt && <> · Synced {new Date(repository.syncedAt).toLocaleDateString()}</>}
          </p>
        </div>
        <div className="av2-header-badges">
          {['React 19', 'Django 4', 'Gemini 2.5', 'SQLite'].map(t => (
            <span key={t} className="av2-tech-badge">{t}</span>
          ))}
        </div>
      </header>

      {/* Stats */}
      <StatsBar analysis={analysis} repository={repository}/>

      {/* Tabs */}
      <nav className="av2-tabs" aria-label="Architecture views">
        {VIEWS.map(v => {
          const Icon = v.icon
          return (
            <button key={v.id} className={activeView === v.id ? 'active' : ''}
              aria-pressed={activeView === v.id}
              onClick={() => setActiveView(v.id)}>
              <Icon size={14}/><span>{v.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <div className="av2-content">
        {activeView === 'system' && (
          <div className="av2-system-wrap">
            <NodeGraph
              nodes={ARCH.nodes}
              edges={ARCH.edges}
              selected={selected}
              onSelect={setSelected}
            />
            {selected && (
              <DetailPanel
                node={selected}
                edges={ARCH.edges}
                allNodes={ARCH.nodes}
                onClose={() => setSelected(null)}
                onOpenFile={onOpenFile}
              />
            )}
          </div>
        )}
        {activeView === 'database' && <DbSchemaView analysis={analysis} onOpenFile={onOpenFile}/>}
        {activeView === 'api'      && <ApiFlowView  analysis={analysis} onOpenFile={onOpenFile}/>}
        {activeView === 'stack'    && <StackView onOpenFile={onOpenFile}/>}
      </div>
    </section>
  )
}
