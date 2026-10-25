import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Heart, Sparkles, Lightbulb, Compass, Hammer, Users, Rocket, RefreshCw } from 'lucide-react'

const PHASE_CONFIGS = [
  {
    phase: 0,
    name: 'Pillars & Purpose',
    icon: Lightbulb,
    badgeColor: '#FF6B6B',
    bgColor: '#FFF0F0',
    tips: [
      'Define success clearly so your roadmap has a target!',
      'Who hurts the most without this? Build for them first.',
      'Simplicity wins every time! Keep the core idea punchy.',
      'One killer feature is better than ten mediocre ones.',
    ],
  },
  {
    phase: 1,
    name: 'Market Discovery',
    icon: Compass,
    badgeColor: '#F59E0B',
    bgColor: '#FEF3C7',
    tips: [
      'Competitors validate that a real market exists!',
      'Look for the gap that incumbents are too slow to fill.',
      'Talk to 5 potential users before writing serious code.',
      'Price for value delivered, not just cost plus margin.',
    ],
  },
  {
    phase: 2,
    name: 'Tech Architecture',
    icon: Hammer,
    badgeColor: '#10B981',
    bgColor: '#D1FAE5',
    tips: [
      'Choose boring technology where possible, ship fast!',
      'Your schema is your contract — design models cleanly.',
      'Decouple frontend from backend with robust REST APIs.',
      'Git commit early and often — build verifiable milestones.',
    ],
  },
  {
    phase: 3,
    name: 'Team & Schedule',
    icon: Users,
    badgeColor: '#8B5CF6',
    bgColor: '#EDE9FE',
    tips: [
      'Clear owners mean fewer stalled decisions.',
      'Estimate buffer time: things always take 20% longer.',
      'Celebrate tiny milestones to keep momentum sky-high.',
      'Pair up on tricky architecture — two heads win.',
    ],
  },
  {
    phase: 4,
    name: 'Flight Plan & Roadmap',
    icon: Rocket,
    badgeColor: '#EC4899',
    bgColor: '#FCE7F3',
    tips: [
      'Milestone 1 is your foundation — get that MVP deployed!',
      'Track test results directly against milestone proofs.',
      'Ready for liftoff! Follow your flight plan step by step.',
      'Ship early to real testers — perfection is the enemy of launch.',
    ],
  },
]

const CHARACTER_MODELS = [
  { id: 'female-a', name: 'Sam (Lead)', path: '/models/character-female-a.glb' },
  { id: 'male-a', name: 'Alex (Lead)', path: '/models/character-male-a.glb' },
  { id: 'female-d', name: 'Maya (Creator)', path: '/models/character-female-d.glb' },
  { id: 'male-c', name: 'Zack (Architect)', path: '/models/character-male-c.glb' },
  { id: 'female-b', name: 'Taylor (Dev)', path: '/models/character-female-b.glb' },
  { id: 'male-b', name: 'Jordan (Dev)', path: '/models/character-male-b.glb' },
]

export default function Interactive3DCharacter({
  phase = 0,
  size = 'lg', // 'lg' | 'overview' | 'md' | 'sm'
  modelIndex = 0,
  showBubble = true,
  className = '',
}) {
  const mountRef = useRef(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [showHearts, setShowHearts] = useState(false)
  const [selectedModel, setSelectedModel] = useState(modelIndex)
  const [currentActionName, setCurrentActionName] = useState('idle')
  const [loaded, setLoaded] = useState(false)

  // Keep selectedModel synced if modelIndex changes
  useEffect(() => {
    setSelectedModel(modelIndex)
  }, [modelIndex])

  const config = PHASE_CONFIGS[phase] || PHASE_CONFIGS[0]
  const currentTip = config.tips[tipIndex % config.tips.length]

  // Refs for Three.js instance data
  const sceneRef = useRef(null)
  const mixerRef = useRef(null)
  const actionsRef = useRef({})
  const currentActionRef = useRef(null)
  const characterRef = useRef(null)
  const targetRotationY = useRef(0)
  const isPointerDown = useRef(false)
  const previousPointerX = useRef(0)
  const idleTimerRef = useRef(null)

  // Trigger exciting animation on click/poke
  const triggerReaction = useCallback(() => {
    setShowHearts(true)
    setTimeout(() => setShowHearts(false), 1400)
    setTipIndex(prev => prev + 1)

    const actions = actionsRef.current
    if (!actions) return

    // Pick reaction animation
    const reactions = ['jump', 'emote-yes', 'pick-up', 'interact-right']
    const choice = reactions[Math.floor(Math.random() * reactions.length)]
    const targetClip = actions[choice] || actions['jump'] || actions['emote-yes']

    if (targetClip && mixerRef.current) {
      const active = currentActionRef.current
      if (active && active !== targetClip) {
        targetClip.reset()
        targetClip.setLoop(THREE.LoopOnce, 1)
        targetClip.clampWhenFinished = true
        targetClip.fadeIn(0.2).play()
        active.fadeOut(0.2)
        currentActionRef.current = targetClip
        setCurrentActionName(choice)

        const onFinished = (e) => {
          if (e.action === targetClip) {
            mixerRef.current?.removeEventListener('finished', onFinished)
            const idle = actions['idle']
            if (idle) {
              idle.reset()
              idle.setLoop(THREE.LoopRepeat)
              idle.fadeIn(0.3).play()
              targetClip.fadeOut(0.3)
              currentActionRef.current = idle
              setCurrentActionName('idle')
            }
          }
        }
        mixerRef.current.addEventListener('finished', onFinished)
      }
    }
  }, [])

  // Switch between models
  const cycleModel = useCallback((e) => {
    e.stopPropagation()
    setSelectedModel(prev => (prev + 1) % CHARACTER_MODELS.length)
  }, [])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = size === 'sm' ? 140 : size === 'overview' ? 220 : size === 'lg' ? 280 : 220
    const height = size === 'sm' ? 150 : size === 'overview' ? 240 : size === 'lg' ? 300 : 240

    // Setup Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0.58, 2.05)
    camera.lookAt(0, 0.42, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7f2, 2.2)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.8)
    keyLight.position.set(2.5, 4, 3)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 1024
    keyLight.shadow.mapSize.height = 1024
    keyLight.shadow.bias = -0.001
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xffd5cc, 1.4)
    fillLight.position.set(-2.5, 2, 1)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0)
    rimLight.position.set(0, 3, -3)
    scene.add(rimLight)

    // Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x1d1b18,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = -Math.PI / 2
    shadowMesh.position.y = 0.005
    scene.add(shadowMesh)

    // GLTFLoader
    const loader = new GLTFLoader()
    const modelInfo = CHARACTER_MODELS[selectedModel] || CHARACTER_MODELS[0]
    let mixer = null
    let active = true

    loader.load(
      modelInfo.path,
      (gltf) => {
        if (!active) return
        const model = gltf.scene
        characterRef.current = model

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            if (child.material) {
              child.material.roughness = 0.75
              child.material.metalness = 0.05
            }
          }
        })

        // Center model feet at origin
        model.position.set(0, 0, 0)
        scene.add(model)

        // Setup Animation Mixer
        mixer = new THREE.AnimationMixer(model)
        mixerRef.current = mixer

        const actions = {}
        gltf.animations.forEach((clip) => {
          actions[clip.name] = mixer.clipAction(clip)
        })
        actionsRef.current = actions

        // Start with Idle
        const idle = actions['idle'] || actions[Object.keys(actions)[0]]
        if (idle) {
          idle.play()
          currentActionRef.current = idle
          setCurrentActionName('idle')
        }

        setLoaded(true)
      },
      undefined,
      (err) => {
        console.warn('Error loading Kenney character model:', err)
      }
    )

    // Periodic smooth animation timer ("after few seconds it does some smooth animations")
    const scheduleNextIdleAction = () => {
      idleTimerRef.current = setTimeout(() => {
        if (!active || !mixerRef.current || !actionsRef.current) return

        const actions = actionsRef.current
        const idle = actions['idle']
        const available = ['emote-yes', 'interact-right', 'jump', 'pick-up', 'interact-left']
        const randomClipName = available[Math.floor(Math.random() * available.length)]
        const action = actions[randomClipName]

        if (action && idle && currentActionRef.current === idle) {
          action.reset()
          action.setLoop(THREE.LoopOnce, 1)
          action.clampWhenFinished = true
          action.fadeIn(0.25).play()
          idle.fadeOut(0.25)
          currentActionRef.current = action
          setCurrentActionName(randomClipName)

          const onDone = (e) => {
            if (e.action === action) {
              mixerRef.current?.removeEventListener('finished', onDone)
              idle.reset()
              idle.setLoop(THREE.LoopRepeat)
              idle.fadeIn(0.3).play()
              action.fadeOut(0.3)
              currentActionRef.current = idle
              setCurrentActionName('idle')
              scheduleNextIdleAction()
            }
          }
          mixerRef.current.addEventListener('finished', onDone)
        } else {
          scheduleNextIdleAction()
        }
      }, 5000 + Math.random() * 3000)
    }

    scheduleNextIdleAction()

    // Render loop
    const clock = new THREE.Clock()
    let animationFrameId = null

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const delta = clock.getDelta()

      if (mixer) {
        mixer.update(delta)
      }

      if (characterRef.current) {
        // Smoothly lerp towards target rotation (mouse tracking)
        characterRef.current.rotation.y = THREE.MathUtils.lerp(
          characterRef.current.rotation.y,
          targetRotationY.current,
          0.08
        )
      }

      renderer.render(scene, camera)
    }
    animate()

    // Interactive mouse / touch events
    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1

      if (isPointerDown.current) {
        const deltaX = e.clientX - previousPointerX.current
        targetRotationY.current += deltaX * 0.02
        previousPointerX.current = e.clientX
      } else {
        // Soft head/body follow mouse
        targetRotationY.current = x * 0.55
      }
    }

    const handlePointerDown = (e) => {
      isPointerDown.current = true
      previousPointerX.current = e.clientX
    }

    const handlePointerUp = () => {
      isPointerDown.current = false
    }

    const handlePointerLeave = () => {
      isPointerDown.current = false
      targetRotationY.current = 0
    }

    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      active = false
      cancelAnimationFrame(animationFrameId)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('pointerleave', handlePointerLeave)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [size, selectedModel])

  return (
    <div className={`relative select-none flex flex-col items-center ${className}`}>
      {/* Speech Bubble */}
      {showBubble && (
        <div
          onClick={triggerReaction}
          className="mb-2 max-w-[220px] p-3 rounded-2xl bg-white border-2 shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 transition-all text-left relative group z-20"
          style={{ borderColor: config.badgeColor }}
          title="Click to interact & get more launch tips!"
        >
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1D1B18] truncate">
              {config.name}
            </span>
            <button
              type="button"
              onClick={cycleModel}
              title="Switch 3D character"
              className="text-[9px] font-bold text-[#8E4B49] bg-[#FFF0EB] hover:bg-[#FFE0D6] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={8} />
              <span>Outfit</span>
            </button>
          </div>
          <p className="text-[11px] font-semibold text-[#3D3A37] leading-snug">
            "{currentTip}"
          </p>
          <span className="text-[9px] text-[#A09890] block mt-1 font-medium">
            Tap character to play with me ✨
          </span>

          {/* Pointer triangle */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px]"
            style={{ borderTopColor: config.badgeColor }}
          />
        </div>
      )}

      {/* Floating hearts on click */}
      {showHearts && (
        <div className="absolute top-2 flex items-center gap-1 animate-bounce pointer-events-none z-30">
          <Heart size={18} fill="#FF6B6B" className="text-[#FF6B6B]" />
          <Sparkles size={16} className="text-[#FFD93D]" />
        </div>
      )}

      {/* 3D WebGL Canvas Container */}
      <div
        onClick={triggerReaction}
        className={`cursor-pointer transition-transform duration-300 relative group ${
          size === 'sm' ? 'w-[140px] h-[150px]' : size === 'overview' ? 'w-[220px] h-[240px]' : size === 'lg' ? 'w-[280px] h-[300px]' : 'w-[220px] h-[240px]'
        }`}
        title="I am your interactive 3D companion! Click or drag to rotate me!"
      >
        <div
          ref={mountRef}
          className="w-full h-full flex items-center justify-center overflow-hidden"
        />

        {/* Action badge pill */}
        {loaded && currentActionName !== 'idle' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/90 border border-[#EFEAE4] text-[#8E4B49] shadow-xs">
              {currentActionName}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
