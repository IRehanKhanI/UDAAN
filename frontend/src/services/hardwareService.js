import { apiRequest } from './apiClient.js'

// ─── Indian Vendor Catalog ────────────────────────────────────────────────────
export const INDIAN_VENDORS = [
  {
    id: 'makerbazar',
    name: 'MakerBazar',
    tagline: 'Electronics & Maker Supplies',
    color: '#F97316',
    bg: '#FFF7ED',
    icon: '🟧',
    url: 'https://makerbazar.in',
    searchUrl: (query) => `https://makerbazar.in/search?q=${encodeURIComponent(query)}`,
    logo: 'https://makerbazar.in/favicon.ico',
  },
  {
    id: 'robocraze',
    name: 'Robocraze',
    tagline: 'Robotics & IoT Components',
    color: '#2563EB',
    bg: '#EFF6FF',
    icon: '🟦',
    url: 'https://robocraze.com',
    searchUrl: (query) => `https://robocraze.com/search?type=product&q=${encodeURIComponent(query)}`,
    logo: 'https://robocraze.com/favicon.ico',
  },
  {
    id: 'roboin',
    name: 'Roboin',
    tagline: 'Indian Robotics Distributor',
    color: '#16A34A',
    bg: '#F0FDF4',
    icon: '🟩',
    url: 'https://www.roboin.io',
    searchUrl: (query) => `https://www.roboin.io/?s=${encodeURIComponent(query)}`,
    logo: 'https://www.roboin.io/favicon.ico',
  },
  {
    id: 'indiahobby',
    name: 'IndiaHobbyStore',
    tagline: 'DIY Electronics & Kits',
    color: '#CA8A04',
    bg: '#FEFCE8',
    icon: '🟨',
    url: 'https://www.indiahobbystore.com',
    searchUrl: (query) => `https://www.indiahobbystore.com/search?q=${encodeURIComponent(query)}`,
    logo: 'https://www.indiahobbystore.com/favicon.ico',
  },
]

// ─── Fallback curated component catalog (shown while AI loads) ───────────────
export const COMPONENT_CATALOG = {
  microcontroller: {
    name: 'Arduino Uno R3',
    category: 'Microcontroller',
    icon: '🔲',
    color: '#2563EB',
    bg: '#EFF6FF',
    priceMin: 350,
    priceMax: 600,
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Arduino_Uno_-_R3.jpg',
    learnUrl: 'https://www.arduino.cc/en/Guide/ArduinoUno',
    description: 'Main controller board for your project logic',
  },
  'raspberry pi': {
    name: 'Raspberry Pi 4B',
    category: 'Single Board Computer',
    icon: '🍓',
    color: '#BE185D',
    bg: '#FDF2F8',
    priceMin: 3500,
    priceMax: 5500,
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Raspberry_Pi_4_Model_B_-_Side.jpg',
    learnUrl: 'https://www.raspberrypi.com/documentation/',
    description: 'Full Linux computer for advanced processing & AI',
  },
  sensor: {
    name: 'Generic Sensor Module',
    category: 'Sensor',
    icon: '📡',
    color: '#7C3AED',
    bg: '#F5F3FF',
    priceMin: 50,
    priceMax: 300,
    image: null,
    learnUrl: 'https://randomnerdtutorials.com/arduino-sensors/',
    description: 'Analog/digital sensing module',
  },
  motor: {
    name: 'DC Motor + Driver',
    category: 'Actuator',
    icon: '⚙️',
    color: '#D97706',
    bg: '#FFFBEB',
    priceMin: 80,
    priceMax: 400,
    image: null,
    learnUrl: 'https://lastminuteengineers.com/l298n-dc-stepper-driver-arduino-tutorial/',
    description: 'Motor with L298N/L293D driver module',
  },
}

// ─── API: Classify project domain via backend AI ─────────────────────────────
export async function classifyProjectDomain(idea, projectType = 'Startup') {
  try {
    const result = await apiRequest('/api/ideas/classify-domain/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, project_type: projectType }),
    })
    return {
      domain: result?.domain || 'software',
      confidence: result?.confidence || 0.8,
      reasoning: result?.reasoning || '',
      detected_keywords: result?.detected_keywords || [],
    }
  } catch {
    // Fallback to frontend heuristic if backend unavailable
    return classifyDomainFallback(idea)
  }
}

function classifyDomainFallback(idea = '') {
  const lower = idea.toLowerCase()
  const hwSignals = ['arduino', 'raspberry pi', 'esp8266', 'esp32', 'sensor', 'motor', 'servo', 'circuit', 'pcb', 'iot', 'drone', 'robot', 'electronics', '3d print', 'actuator', 'led', 'battery', 'prototype', 'embedded', 'hardware', 'rfid', 'bluetooth module', 'gpio', 'microcontroller', 'soldering', 'breadboard', 'resistor', 'capacitor']
  const swSignals = ['app', 'website', 'platform', 'dashboard', 'api', 'software', 'web app', 'mobile app', 'saas', 'backend', 'frontend', 'database', 'cloud', 'deployment', 'server']
  const hwScore = hwSignals.filter(k => lower.includes(k)).length
  const swScore = swSignals.filter(k => lower.includes(k)).length
  let domain = 'software'
  if (hwScore >= 2 && swScore >= 2) domain = 'hybrid'
  else if (hwScore >= 2) domain = 'hardware'
  return { domain, confidence: 0.7, reasoning: 'Detected via keyword analysis', detected_keywords: [] }
}

// ─── API: Generate Bill of Materials via backend AI ──────────────────────────
export async function generateBillOfMaterials(idea, understanding = {}) {
  try {
    const result = await apiRequest('/api/ideas/hardware-bom/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea,
        problem_statement: understanding.problem_statement || '',
        expected_outcome: understanding.expected_outcome || '',
      }),
    })
    return result?.components || []
  } catch {
    // Return illustrative fallback components
    return generateFallbackBOM(idea)
  }
}

function generateFallbackBOM(idea = '') {
  const lower = idea.toLowerCase()
  const components = []

  if (lower.includes('arduino') || lower.includes('microcontroller') || lower.includes('sensor') || lower.includes('iot')) {
    components.push({
      id: 'uc1',
      name: 'Arduino Uno R3',
      category: 'Microcontroller',
      quantity: 1,
      unit: 'pcs',
      priceMin: 350,
      priceMax: 600,
      currency: 'INR',
      icon: '🔲',
      color: '#2563EB',
      bg: '#EFF6FF',
      image: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Arduino_Uno_-_R3.jpg',
      description: 'Main controller for reading sensors and driving outputs',
      learnUrl: 'https://www.arduino.cc/en/Guide/ArduinoUno',
      searchQuery: 'Arduino Uno R3',
      required: true,
    })
  }

  if (lower.includes('raspberry') || lower.includes('camera') || lower.includes('ai') || lower.includes('linux')) {
    components.push({
      id: 'uc2',
      name: 'Raspberry Pi 4 (4GB)',
      category: 'Single Board Computer',
      quantity: 1,
      unit: 'pcs',
      priceMin: 4200,
      priceMax: 6000,
      currency: 'INR',
      icon: '🍓',
      color: '#BE185D',
      bg: '#FDF2F8',
      image: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Raspberry_Pi_4_Model_B_-_Side.jpg',
      description: 'Full Linux SBC for AI inference, camera, and connectivity',
      learnUrl: 'https://www.raspberrypi.com/documentation/',
      searchQuery: 'Raspberry Pi 4B',
      required: true,
    })
  }

  // Always add generic sensor + power if hardware project
  components.push(
    {
      id: 'ps1',
      name: 'Power Supply / Adapter (5V 3A)',
      category: 'Power',
      quantity: 1,
      unit: 'pcs',
      priceMin: 150,
      priceMax: 350,
      currency: 'INR',
      icon: '🔋',
      color: '#D97706',
      bg: '#FFFBEB',
      image: null,
      description: '5V DC regulated power for controller board',
      learnUrl: 'https://www.electronics-tutorials.ws/dccircuits/power-supply.html',
      searchQuery: '5V 3A power adapter',
      required: true,
    },
    {
      id: 'bb1',
      name: 'Breadboard + Jumper Wires Kit',
      category: 'Prototyping',
      quantity: 1,
      unit: 'kit',
      priceMin: 120,
      priceMax: 250,
      currency: 'INR',
      icon: '🧪',
      color: '#16A34A',
      bg: '#F0FDF4',
      image: null,
      description: '400-point breadboard + M-M/M-F/F-F jumper wire pack',
      learnUrl: 'https://www.instructables.com/How-to-Use-a-Breadboard/',
      searchQuery: 'breadboard jumper wires kit',
      required: true,
    },
    {
      id: 'res1',
      name: 'Resistor & Capacitor Assortment',
      category: 'Passive Components',
      quantity: 1,
      unit: 'kit',
      priceMin: 80,
      priceMax: 200,
      currency: 'INR',
      icon: '⚡',
      color: '#7C3AED',
      bg: '#F5F3FF',
      image: null,
      description: 'Assorted resistors (1Ω–1MΩ) and capacitors for circuits',
      learnUrl: 'https://www.electronics-tutorials.ws/resistor/resistor.html',
      searchQuery: 'resistor capacitor assortment kit',
      required: false,
    },
  )

  return components
}

// ─── Generate vendor search URL for a component ──────────────────────────────
export function getVendorLinks(componentName, vendorIds = null) {
  const vendors = vendorIds
    ? INDIAN_VENDORS.filter(v => vendorIds.includes(v.id))
    : INDIAN_VENDORS
  return vendors.map(v => ({
    ...v,
    link: v.searchUrl(componentName),
  }))
}

// ─── API: Live search components with images, prices & store links ───────────
export async function searchHardwareProducts(query) {
  try {
    const result = await apiRequest(`/api/ideas/hardware-search/?q=${encodeURIComponent(query)}`, {
      method: 'GET',
    })
    return result || { query, results: [], vendors: getVendorLinks(query) }
  } catch {
    return {
      query,
      results: [
        {
          name: query,
          category: 'Hardware Component',
          price_range: '₹150 – ₹850',
          image: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Arduino_Uno_-_R3.jpg',
          description: `Component matching "${query}" available across Indian electronic component stores.`,
          wiring_tip: 'Refer to component datasheet for pinout configuration and voltage limits.',
          learn_url: `https://www.google.com/search?q=${encodeURIComponent(query + ' arduino tutorial')}`,
          vendors: getVendorLinks(query).map(v => ({
            vendor: v.name,
            tagline: v.tagline,
            direct_search_url: v.link,
            color: v.color,
            bg: v.bg,
            badge: 'Direct Search',
          })),
        },
      ],
      vendors: getVendorLinks(query),
    }
  }
}

export function getComponentLiveImage(name = '', category = '') {
  const lower = `${name} ${category}`.toLowerCase()
  if (lower.includes('raspberry') || lower.includes('pi 4') || lower.includes('sbc')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Raspberry_Pi_4_Model_B_-_Side.jpg'
  }
  if (lower.includes('arduino') || lower.includes('uno') || lower.includes('nano')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/3/38/Arduino_Uno_-_R3.jpg'
  }
  if (lower.includes('esp32') || lower.includes('esp8266') || lower.includes('microcontroller') || lower.includes('wifi') || lower.includes('node')) {
    return 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600&auto=format&fit=crop&q=80'
  }
  if (lower.includes('sensor') || lower.includes('ultrasonic') || lower.includes('pir') || lower.includes('dht') || lower.includes('temperature') || lower.includes('humidity') || lower.includes('camera') || lower.includes('lidar') || lower.includes('gyro')) {
    return 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?w=600&auto=format&fit=crop&q=80'
  }
  if (lower.includes('motor') || lower.includes('servo') || lower.includes('actuator') || lower.includes('driver') || lower.includes('l298n') || lower.includes('relay') || lower.includes('pump')) {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'
  }
  return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80'
}

// ─── AI Business Model Recommendation ───────────────────────────────────────
export function predictBestRevenueModel({ idea = '', problem = '', outcome = '', domain = 'software', category = 'Startup', targetUsers = '' }) {
  const combined = `${idea} ${problem} ${outcome} ${targetUsers}`.toLowerCase()

  // 1. Grant / Prize funded: Student, college, hackathon, social impact, NGO, research
  if (
    category === 'College Project' ||
    category === 'Hackathon' ||
    combined.includes('student') ||
    combined.includes('college') ||
    combined.includes('university') ||
    combined.includes('sih') ||
    combined.includes('ssip') ||
    combined.includes('research paper') ||
    combined.includes('social impact') ||
    combined.includes('ngo') ||
    combined.includes('non-profit') ||
    combined.includes('rural')
  ) {
    return {
      modelId: 'grant',
      confidence: 0.94,
      badge: '★ AI Recommended Pick',
      title: 'Grant & Prize Funded',
      reasoning: `Recommended for ${category}: Enables building and validating your core MVP with non-dilutive government and institutional grants (SSIP, NIDHI PRAYAS, Smart India Hackathon) without premature monetization friction.`,
    }
  }

  // 2. Marketplace / Platform Commission: Multi-sided platforms, bookings, gig, commission
  const marketplaceKeywords = ['marketplace', 'platform', 'freelance', 'gig', 'broker', 'commission', 'booking', 'buyer', 'seller', 'e-commerce', 'store', 'listing', 'p2p', 'connect workers', 'hire', 'service provider', 'trade']
  if (marketplaceKeywords.some(kw => combined.includes(kw))) {
    return {
      modelId: 'marketplace',
      confidence: 0.91,
      badge: '★ AI Recommended Pick',
      title: 'Platform Commission (%)',
      reasoning: `Recommended for multi-sided platforms: Aligns revenue directly with transaction flow between buyers and sellers, taking a fee upon successful transactions.`,
    }
  }

  // 3. One-Time Hardware Sale: Pure hardware or hybrid physical kit
  if (domain === 'hardware' || (domain === 'hybrid' && (combined.includes('kit') || combined.includes('device') || combined.includes('gadget') || combined.includes('robot') || combined.includes('drone') || combined.includes('wearable') || combined.includes('smart') || combined.includes('lock') || combined.includes('plant')))) {
    return {
      modelId: 'one_time',
      confidence: 0.90,
      badge: '★ AI Recommended Pick',
      title: 'One-Time Hardware Sale',
      reasoning: `Recommended for physical hardware & IoT: Generates upfront cash-flow per unit sold (35–60% hardware margins) to cover bill of materials, assembly, and shipping.`,
    }
  }

  // 4. Freemium: Consumer app, developer tool, community, viral adoption
  const freemiumKeywords = ['consumer', 'mobile app', 'game', 'community', 'social', 'productivity', 'free tier', 'developer tool', 'cli', 'extension', 'personal']
  if (freemiumKeywords.some(kw => combined.includes(kw)) && !combined.includes('b2b') && !combined.includes('enterprise')) {
    return {
      modelId: 'freemium',
      confidence: 0.88,
      badge: '★ AI Recommended Pick',
      title: 'Freemium + Upgrade',
      reasoning: `Recommended for fast viral acquisition: Eliminates onboarding friction with free access to core utilities while monetizing power features.`,
    }
  }

  // 5. Default B2B / SaaS Subscription:
  return {
    modelId: 'subscription',
    confidence: 0.87,
    badge: '★ AI Recommended Pick',
    title: 'Subscription (SaaS)',
    reasoning: `Recommended for scalable software: Predictable recurring revenue (MRR/ARR) with high customer lifetime value and compounding software cash flows.`,
  }
}

