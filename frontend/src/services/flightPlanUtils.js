export function createStarterFlightPlan(projectName = 'your project') {
  return {
    summary: `A practical first roadmap for shaping, building, and validating ${projectName}. Adjust each step as you learn more.`,
    milestones: [
      {
        title: 'Define the first version',
        outcome: 'Agree on the first useful version and how you will know it works.',
        tasks: ['Choose the main user and problem to solve', 'Write down the essential first-version features', 'Set one clear success measure'],
      },
      {
        title: 'Validate the approach',
        outcome: 'Check the riskiest assumptions before committing to a full build.',
        tasks: ['List the assumptions that could change the direction', 'Review existing alternatives and constraints', 'Talk to potential users or test a simple concept'],
      },
      {
        title: 'Build the first working version',
        outcome: 'Deliver an end-to-end version of the core experience.',
        tasks: ['Sketch the main user flow', 'Build the smallest complete core flow', 'Test the flow and fix the most important issues'],
      },
      {
        title: 'Review and plan the next iteration',
        outcome: 'Use feedback and results to decide what to improve next.',
        tasks: ['Share the first version with target users', 'Collect feedback against the success measure', 'Prioritize the next improvements'],
      },
    ],
  }
}

export function createStarterHardwareFlightPlan(projectName = 'your hardware project') {
  return {
    summary: `A practical hardware build roadmap for ${projectName} — from BOM sourcing to final assembly and testing.`,
    milestones: [
      {
        title: 'Requirements & Component Sourcing',
        category: 'Planning',
        outcome: 'Finalize BOM, order all components, set up workspace',
        tasks: [
          'Define project requirements, constraints & success metrics',
          'Create complete Bill of Materials (BOM) with quantities',
          'Order components from MakerBazar / Robocraze / Roboin',
          'Set up workbench: soldering station, multimeter, power supply',
        ],
      },
      {
        title: 'Breadboard Prototype & Firmware',
        category: 'Hardware Build',
        outcome: 'Working breadboard prototype with all core sensors and actuators functional',
        tasks: [
          'Assemble circuit on breadboard following wiring diagram',
          'Write and flash firmware / control code',
          'Test each sensor and actuator independently',
          'Integrate all modules into a single working prototype',
        ],
      },
      {
        title: 'PCB / Enclosure Design',
        category: 'Engineering',
        outcome: 'Custom PCB layout or 3D-printed enclosure ready for fabrication',
        tasks: [
          'Design PCB schematic in KiCad or EasyEDA',
          'Order PCB fabrication (JLCPCB / PCBWay)',
          'Design 3D-printed enclosure in Fusion360 / TinkerCAD',
          'Assemble final PCB and verify all connections',
        ],
      },
      {
        title: 'Testing, Documentation & Launch',
        category: 'Delivery',
        outcome: 'Fully tested product with user manual and demo video',
        tasks: [
          'Conduct stress, edge-case, and safety testing',
          'Write user manual and assembly guide',
          'Record demo video / presentation',
          'Package product and prepare for delivery or showcase',
        ],
      },
    ],
  }
}

export function createStarterHybridFlightPlan(projectName = 'your IoT project') {
  return {
    summary: `A hybrid hardware + software roadmap for ${projectName} — building both the physical device and digital platform in parallel.`,
    milestones: [
      {
        title: 'System Design & Component Sourcing',
        category: 'Architecture',
        outcome: 'Complete system architecture, BOM ordered, tech stack chosen',
        tasks: [
          'Design end-to-end system architecture (hardware ↔ cloud ↔ app)',
          'Finalize BOM and order hardware components',
          'Set up software development environment and repository',
          'Define API contract between hardware and backend',
        ],
      },
      {
        title: 'Hardware Prototype + Backend Scaffold',
        category: 'Parallel Build',
        outcome: 'Functional sensor prototype and basic backend API live',
        tasks: [
          'Build breadboard prototype and test all sensors',
          'Write firmware / embedded code for data collection',
          'Scaffold backend API (REST/MQTT) for data ingestion',
          'Set up cloud database schema for time-series sensor data',
        ],
      },
      {
        title: 'Integration & Frontend Dashboard',
        category: 'Integration',
        outcome: 'Hardware talks to backend; data visible in live dashboard',
        tasks: [
          'Connect firmware to backend via WiFi/BLE/LoRa',
          'Build real-time frontend dashboard for sensor visualization',
          'Test end-to-end data flow: sensor → cloud → dashboard',
          'Add auth, user accounts, and device management',
        ],
      },
      {
        title: 'Testing, Polish & Launch',
        category: 'Delivery',
        outcome: 'Production-ready system deployed with documentation',
        tasks: [
          'Conduct hardware stress tests and software load tests',
          'Design and fabricate final enclosure / PCB',
          'Deploy backend to cloud (AWS / Railway / Render)',
          'Write documentation, demo video, and showcase materials',
        ],
      },
    ],
  }
}

export function createStarterFlightPlanByDomain(domain = 'software', projectName = 'your project') {
  if (domain === 'hardware') return createStarterHardwareFlightPlan(projectName)
  if (domain === 'hybrid') return createStarterHybridFlightPlan(projectName)
  return createStarterFlightPlan(projectName)
}



export function hasActionableFlightPlan(plan) {
  return Array.isArray(plan?.milestones)
    && plan.milestones.length > 0
    && plan.milestones.some(milestone => Array.isArray(milestone.tasks) && milestone.tasks.some(task => (typeof task === 'string' && task.trim()) || (task && typeof task.title === 'string' && task.title.trim())))
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.valueOf())) return dateStr
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getDaysRemaining(deadlineStr) {
  if (!deadlineStr) return null
  let target
  if (typeof deadlineStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(deadlineStr.trim())) {
    const parts = deadlineStr.trim().split('T')[0].split('-').map(Number)
    target = new Date(parts[0], parts[1] - 1, parts[2])
  } else {
    const d = new Date(deadlineStr)
    if (Number.isNaN(d.valueOf())) return null
    target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const today = new Date()
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffTime = target.getTime() - current.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  return {
    days: diffDays,
    isOverdue: diffDays < 0,
    isDueToday: diffDays === 0,
    label:
      diffDays < 0
        ? `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`
        : diffDays === 0
        ? 'Due today'
        : `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`,
  }
}

export function getTimelineProgress(startDateStr, deadlineStr) {
  if (!startDateStr || !deadlineStr) return null
  const start = new Date(startDateStr).getTime()
  const end = new Date(deadlineStr).getTime()
  const now = Date.now()
  if (end <= start) return 100
  const elapsed = now - start
  const total = end - start
  const pct = Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
  return pct
}

export function isTaskOverdue(task, isCompleted) {
  if (isCompleted) return false
  if (!task?.target_date) return false
  const target = new Date(task.target_date)
  if (Number.isNaN(target.valueOf())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target < today
}
