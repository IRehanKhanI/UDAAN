import { useState, useMemo, useRef } from 'react'
import {
  Search, Sliders, Eye, EyeOff, Sparkles, Move,
  CheckCircle2, Lock, ArrowUpRight, ShieldCheck, RefreshCw, ZoomIn, ZoomOut
} from 'lucide-react'

export default function MindMapCanvas({
  graphData,
  onNodeClick,
  onSaveGraph,
  projectIdea = '',
  selectedNodeId = null,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [nodeSpacing, setNodeSpacing] = useState(260)
  const [connectionOpacity, setConnectionOpacity] = useState(0.85)
  const [colorTheme, setColorTheme] = useState('coral') // 'coral' | 'amber' | 'lavender' | 'forest'
  const [showConnections, setShowConnections] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const themeColors = {
    coral: { primary: '#FFAAA6', accent: '#8E4B49', glow: 'rgba(255, 170, 166, 0.4)' },
    amber: { primary: '#FBE191', accent: '#705D1B', glow: 'rgba(251, 225, 145, 0.4)' },
    lavender: { primary: '#EAE4F8', accent: '#534342', glow: 'rgba(234, 228, 248, 0.4)' },
    forest: { primary: '#9FD8CB', accent: '#2A5D54', glow: 'rgba(159, 216, 203, 0.4)' },
  }[colorTheme]

  const nodes = useMemo(() => {
    const rawNodes = graphData?.nodes || []
    return rawNodes.map((node) => {
      // Adjust horizontal spacing dynamically via nodeSpacing slider
      let adjustedX = node.x
      if (node.category === 'milestone') {
        const factor = nodeSpacing / 260
        adjustedX = node.x * factor
      } else if (node.category === 'task') {
        const factor = nodeSpacing / 260
        adjustedX = node.x * factor
      }
      return {
        ...node,
        computedX: adjustedX,
        computedY: node.y,
        isMatched: !searchQuery.trim() ||
          node.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      }
    })
  }, [graphData, nodeSpacing, searchQuery])

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  const edges = useMemo(() => {
    const rawEdges = graphData?.edges || []
    return rawEdges.map((edge) => {
      const sourceNode = nodeMap.get(edge.source)
      const targetNode = nodeMap.get(edge.target)
      if (!sourceNode || !targetNode) return null

      const sx = sourceNode.computedX
      const sy = sourceNode.computedY
      const tx = targetNode.computedX
      const ty = targetNode.computedY

      // Smooth cubic bezier curved flow line
      const dy = ty - sy
      const c1x = sx
      const c1y = sy + dy * 0.45
      const c2x = tx
      const c2y = ty - dy * 0.45
      const pathD = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`

      const isConnectedToSelected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)

      return {
        ...edge,
        pathD,
        sx, sy, tx, ty,
        isConnectedToSelected,
      }
    }).filter(Boolean)
  }, [graphData, nodeMap, selectedNodeId])

  // Mouse pan handling
  const handleMouseDown = (e) => {
    if (e.target.closest('.controls-panel') || e.target.closest('.node-element')) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  return (
    <div
      className="relative w-full h-[650px] bg-[#141211] rounded-3xl overflow-hidden border border-[#2D2825] shadow-inner select-none cursor-grab active:cursor-grabbing font-['Plus_Jakarta_Sans']"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background ambient stars and grid glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#2D2825_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{
          background: themeColors.glow,
          top: '30%',
          left: '40%',
          transform: 'translate(-50%, -50%)',
        }}
      ></div>

      {/* Floating 3D Mind Map Control Panel (Inspired by Reference Design) */}
      <div className="controls-panel absolute top-5 left-5 z-20 w-80 bg-[#1D1B18]/90 backdrop-blur-md rounded-2xl p-4 border border-[#3D3631] shadow-2xl text-white space-y-3.5">
        <div className="flex items-center justify-between border-b border-[#332D29] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFAAA6] animate-pulse"></span>
            <span className="text-xs font-bold tracking-wide uppercase text-[#E5DFD9]">Mind Map Controls</span>
          </div>
          <span className="text-[10px] font-mono text-[#A89E96] bg-[#2A2522] px-2 py-0.5 rounded-full">Organic DAG</span>
        </div>

        {/* SEARCH NODES */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#A89E96]">Search Nodes</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#7C766F]" />
            <input
              type="text"
              placeholder="Type to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141211] text-xs text-white pl-8 pr-3 py-2 rounded-xl border border-[#3D3631] focus:outline-none focus:border-[#FFAAA6] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[10px] text-[#A89E96] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* NODE SPACING */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#A89E96] uppercase">
            <span>Node Spacing</span>
            <span className="font-mono text-white">{nodeSpacing}px</span>
          </div>
          <input
            type="range"
            min="180"
            max="380"
            value={nodeSpacing}
            onChange={(e) => setNodeSpacing(Number(e.target.value))}
            className="w-full accent-[#FFAAA6] cursor-pointer"
          />
        </div>

        {/* CONNECTION OPACITY */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#A89E96] uppercase">
            <span>Connection Opacity</span>
            <span className="font-mono text-white">{Math.round(connectionOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={connectionOpacity}
            onChange={(e) => setConnectionOpacity(Number(e.target.value))}
            className="w-full accent-[#FFAAA6] cursor-pointer"
          />
        </div>

        {/* COLOR THEME PILLS */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-wider uppercase text-[#A89E96]">Studio Theme</label>
          <div className="flex items-center gap-2">
            {[
              { id: 'coral', color: '#FFAAA6', label: 'Coral' },
              { id: 'amber', color: '#FBE191', label: 'Butter' },
              { id: 'lavender', color: '#EAE4F8', label: 'Lavender' },
              { id: 'forest', color: '#9FD8CB', label: 'Sage' },
            ].map(({ id, color, label }) => (
              <button
                key={id}
                onClick={() => setColorTheme(id)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                  colorTheme === id ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: color }}
                title={label}
              />
            ))}
          </div>
        </div>

        {/* TOGGLE BUTTONS */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowConnections(!showConnections)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-colors ${
              showConnections
                ? 'bg-[#2A2522] border-[#FFAAA6]/50 text-white'
                : 'bg-[#141211] border-[#332D29] text-[#7C766F]'
            }`}
          >
            {showConnections ? 'Connections: ON' : 'Connections: OFF'}
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-colors ${
              showLabels
                ? 'bg-[#2A2522] border-[#FFAAA6]/50 text-white'
                : 'bg-[#141211] border-[#332D29] text-[#7C766F]'
            }`}
          >
            {showLabels ? 'Labels: ON' : 'Labels: OFF'}
          </button>
        </div>
      </div>

      {/* Zoom / Reset Navigation Tool */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2 bg-[#1D1B18]/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-[#3D3631] text-white text-xs">
        <button
          onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.15))}
          className="p-1 hover:text-[#FFAAA6] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>
        <span className="font-mono text-[11px] text-[#A89E96]">{Math.round(zoomLevel * 100)}%</span>
        <button
          onClick={() => setZoomLevel(z => Math.min(2, z + 0.15))}
          className="p-1 hover:text-[#FFAAA6] transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>
        <button
          onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }) }}
          className="ml-1 px-2 py-0.5 rounded-lg bg-[#2A2522] hover:bg-[#3D3631] text-[10px] font-bold transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Total Nodes / Connections Stats Bar */}
      <div className="absolute bottom-5 left-5 z-10 hidden sm:flex items-center gap-4 bg-[#1D1B18]/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#332D29] text-[11px] text-[#A89E96]">
        <span>Total Nodes: <strong className="text-white">{nodes.length}</strong></span>
        <span>•</span>
        <span>Connections: <strong className="text-white">{edges.length}</strong></span>
        <span>•</span>
        <span className="text-[#FFAAA6] font-semibold">Active Studio Graph</span>
      </div>

      {/* SVG Canvas Area */}
      <svg
        className="w-full h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '50% 40%',
          transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
        }}
        viewBox="-700 -250 1400 950"
      >
        <defs>
          {/* Animated Glow Filter */}
          <filter id="node-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Linear Gradients for Flow Lines */}
          <linearGradient id="flow-gradient-coral" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFAAA6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FBE191" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="flow-gradient-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBE191" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#EAE4F8" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* 1. Curved Animated SVG Pipes / Edges */}
        {showConnections && (
          <g className="edges-layer" opacity={connectionOpacity}>
            {edges.map((edge) => {
              const isSelected = edge.isConnectedToSelected
              return (
                <g key={edge.id}>
                  {/* Subtle background glow pipe */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={isSelected ? themeColors.primary : edge.color}
                    strokeWidth={isSelected ? 5 : 2.5}
                    strokeOpacity={isSelected ? 0.9 : 0.4}
                  />
                  {/* Animated dasharray flow pipe */}
                  <path
                    d={edge.pathD}
                    fill="none"
                    stroke={isSelected ? '#FFFFFF' : edge.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={edge.animated || isSelected ? '6 6' : 'none'}
                    className={edge.animated || isSelected ? 'animate-flow-dash' : ''}
                  />
                  {showLabels && edge.label && (
                    <text
                      x={(edge.sx + edge.tx) / 2}
                      y={(edge.sy + edge.ty) / 2 - 6}
                      fill="#8E857E"
                      fontSize="9"
                      textAnchor="middle"
                      className="pointer-events-none font-mono"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )}

        {/* 2. Nodes Layer */}
        <g className="nodes-layer">
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId
            const isIdea = node.category === 'idea'
            const isPRD = node.category === 'prd'
            const isMilestone = node.category === 'milestone'
            const isTask = node.category === 'task'
            const isInsight = node.category === 'insight'

            const nodeRadius = isIdea ? 48 : isPRD ? 38 : isMilestone ? 32 : isInsight ? 26 : 22
            const nodeFill = isIdea
              ? '#8E4B49'
              : isPRD
              ? '#705D1B'
              : isMilestone
              ? node.color
              : isInsight
              ? '#FFAAA6'
              : '#2D2825'

            const opacity = node.isMatched ? 1 : 0.2

            return (
              <g
                key={node.id}
                className="node-element cursor-pointer group"
                transform={`translate(${node.computedX}, ${node.computedY})`}
                opacity={opacity}
                onClick={() => onNodeClick && onNodeClick(node)}
              >
                {/* Glow ring on hover/selected */}
                <circle
                  r={nodeRadius + (isSelected ? 10 : 6)}
                  fill="none"
                  stroke={isSelected ? '#FFFFFF' : themeColors.primary}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeDasharray={isSelected ? '4 4' : 'none'}
                  className={isSelected ? 'animate-spin-slow' : 'opacity-0 group-hover:opacity-80 transition-opacity'}
                />

                {/* Main Node Body Sphere */}
                <circle
                  r={nodeRadius}
                  fill={nodeFill}
                  stroke={isSelected ? '#FFFFFF' : '#141211'}
                  strokeWidth={3}
                  className="transition-transform duration-200 group-hover:scale-110 shadow-lg"
                  filter={isSelected ? 'url(#node-glow)' : undefined}
                />

                {/* Node Inner Icon / Status */}
                {isIdea && (
                  <text
                    y="4"
                    fill="#FFFFFF"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    🚀
                  </text>
                )}
                {isPRD && (
                  <text
                    y="4"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    PRD
                  </text>
                )}
                {isMilestone && (
                  <text
                    y="4"
                    fill="#1D1B18"
                    fontSize="11"
                    fontWeight="800"
                    textAnchor="middle"
                    className="pointer-events-none font-mono"
                  >
                    M{node.milestone_index}
                  </text>
                )}
                {isInsight && (
                  <text
                    y="4"
                    fill="#7A3C3A"
                    fontSize="10"
                    fontWeight="800"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    💡
                  </text>
                )}
                {isTask && (
                  <text
                    y="3"
                    fill="#FFAAA6"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none font-mono"
                  >
                    XP
                  </text>
                )}

                {/* Node Label Text */}
                {showLabels && (
                  <g transform={`translate(0, ${nodeRadius + 15})`}>
                    <rect
                      x={-(node.label.length * 4) - 8}
                      y="-10"
                      width={node.label.length * 8 + 16}
                      height="20"
                      rx="10"
                      fill="#1D1B18"
                      fillOpacity="0.85"
                      stroke="#3D3631"
                      strokeWidth="1"
                    />
                    <text
                      y="4"
                      fill={isSelected ? '#FFAAA6' : '#E5DFD9'}
                      fontSize="10"
                      fontWeight={isIdea || isMilestone ? '700' : '500'}
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
