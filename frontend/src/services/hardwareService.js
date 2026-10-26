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
    let domains = result?.domains
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      if (result?.domain === 'hardware') domains = ['physical']
      else if (result?.domain === 'hybrid') domains = ['digital', 'physical']
      else if (result?.domain === 'services') domains = ['services']
      else domains = ['digital']
    }
    return {
      domains,
      domain: result?.domain || (domains.includes('physical') ? (domains.length > 1 ? 'hybrid' : 'hardware') : 'software'),
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
  const digitalSignals = [
    'app', 'website', 'web', 'saas', 'api', 'apis', 'platform', 'ai tool', 'software',
    'dashboard', 'database', 'cloud', 'portal', 'mobile app', 'ios', 'android', 'flutter',
    'react', 'frontend', 'backend', 'fullstack', 'cli', 'extension', 'crm', 'cms',
    'algorithm', 'bot', 'deep learning', 'machine learning', 'nlp', 'llm', 'chatgpt'
  ]
  const physicalSignals = [
    'arduino', 'raspberry pi', 'rpi', 'esp8266', 'esp32', 'sensor', 'sensors', 'motor', 'motors',
    'servo', 'circuit', 'pcb', 'iot', 'drone', 'drones', 'robot', 'robotics', 'electronics',
    '3d print', '3d printing', 'actuator', 'led', 'battery', 'prototype', 'embedded', 'hardware',
    'wearable', 'cane', 'stick', 'rfid', 'bluetooth module', 'gpio', 'microcontroller',
    'breadboard', 'ultrasonic', 'gps', 'buzzer', 'accelerometer', 'gyroscope', 'relay',
    'camera module', 'clothing brand', 'apparel', 'fashion brand', 't-shirt', 'hoodie',
    'garment', 'textile', 'fabric', 'manufactur', 'manufacturing', 'custom-made', 'physical product',
    'device', 'gadget', 'merchandise'
  ]
  const servicesSignals = [
    'retail', 'shop', 'shops', 'store', 'stores', 'clothing store', 'e-commerce', 'ecommerce',
    'agency', 'agencies', 'consulting', 'consultant', 'freelanc', 'freelancer', 'marketplace',
    'service business', 'services', 'salon', 'restaurant', 'cafe', 'bakery', 'catering',
    'delivery service', 'logistics', 'maintenance', 'repair', 'studio', 'contractor',
    'outsourc', 'escrow', 'cleaning', 'brokerage', 'coaching', 'tutoring', 'boutique'
  ]

  const foundDigital = digitalSignals.filter(k => lower.includes(k))
  const foundPhysical = physicalSignals.filter(k => lower.includes(k))
  const foundServices = servicesSignals.filter(k => lower.includes(k))

  const domains = []
  if (foundDigital.length > 0) domains.push('digital')
  if (foundPhysical.length > 0) domains.push('physical')
  if (foundServices.length > 0) domains.push('services')

  if (domains.length === 0) {
    domains.push('digital')
  }

  let domain = 'software'
  if (domains.includes('physical') && (domains.includes('digital') || domains.includes('services'))) {
    domain = 'hybrid'
  } else if (domains.includes('physical')) {
    domain = 'hardware'
  } else {
    domain = 'software'
  }

  const parts = []
  if (domains.includes('digital')) parts.push(`Digital Products (${foundDigital.slice(0, 2).join(', ') || 'software/platform'})`)
  if (domains.includes('physical')) parts.push(`Physical Products (${foundPhysical.slice(0, 2).join(', ') || 'hardware/goods'})`)
  if (domains.includes('services')) parts.push(`Businesses & Services (${foundServices.slice(0, 2).join(', ') || 'commerce/services'})`)

  const reasoning = `Detected signals for ${parts.join(' and ')}.`
  return {
    domains,
    domain,
    confidence: 0.85,
    reasoning,
    detected_keywords: [...foundDigital, ...foundPhysical, ...foundServices].slice(0, 10),
  }
}

// ─── API: Generate Bill of Materials via backend AI ──────────────────────────
export async function generateBillOfMaterials(ideaOrProject, understanding = {}) {
  const ideaText = typeof ideaOrProject === 'string'
    ? ideaOrProject
    : (ideaOrProject?.idea || ideaOrProject?.title || ideaOrProject?.name || ideaOrProject?.description || '')
  const problemStatement = understanding?.problem_statement || (typeof ideaOrProject === 'object' ? (ideaOrProject?.description || '') : '') || ''
  const expectedOutcome = understanding?.expected_outcome || (typeof ideaOrProject === 'object' ? (ideaOrProject?.outcome || '') : '') || ''

  try {
    const result = await apiRequest('/api/ideas/hardware-bom/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea: ideaText,
        problem_statement: problemStatement,
        expected_outcome: expectedOutcome,
      }),
    })
    return result?.components || []
  } catch {
    // Return illustrative fallback components
    return generateFallbackBOM(ideaText)
  }
}

function generateFallbackBOM(idea = '') {
  const lower = String(idea || '').toLowerCase()
  const components = []

  if (lower.includes('arduino') || lower.includes('microcontroller') || lower.includes('sensor') || lower.includes('iot') || lower.includes('stick') || lower.includes('cane')) {
    components.push({
      id: 'uc1',
      name: 'Arduino Uno R3 (ATmega328P)',
      category: 'Microcontroller',
      quantity: 1,
      unit: 'pcs',
      priceMin: 450,
      priceMax: 650,
      unit_price: 450,
      total_price: 450,
      currency: 'INR',
      icon: '🔲',
      color: '#2563EB',
      bg: '#EFF6FF',
      image: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Arduino_Uno_-_R3.jpg',
      description: 'Industry-standard microcontroller board for reading sensor inputs and controlling outputs.',
      wiring_tip: 'Power via 5V USB cable or external 9V battery with 2.1mm DC barrel connector.',
      learnUrl: 'https://www.arduino.cc/en/Guide/ArduinoUno',
      searchQuery: 'Arduino Uno R3',
      required: true,
      availability: 'In Stock (MakerBazar)',
      vendors: [
        { vendor: 'MakerBazar', tagline: 'Default Maker Store', is_default: true, direct_search_url: 'https://makerbazar.in/search?q=Arduino+Uno+R3', availability: 'In Stock (MakerBazar)', color: '#F97316' },
        { vendor: 'Robocraze', tagline: 'Robotics & IoT India', is_default: false, direct_search_url: 'https://robocraze.com/search?type=product&q=Arduino+Uno+R3', availability: 'In Stock', color: '#2563EB' },
        { vendor: 'Roboin', tagline: 'Indian Robotics Distributor', is_default: false, direct_search_url: 'https://www.roboin.io/?s=Arduino+Uno+R3', availability: 'In Stock', color: '#16A34A' },
      ],
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
export function predictBestRevenueModel({ idea = '', problem = '', outcome = '', domain = 'software', domains = [], category = 'Startup', targetUsers = '' } = {}) {
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
      title: 'Grant Funded',
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

  // 3. One-Time Hardware / Physical Product Sale: Pure hardware, physical products or hybrid kit
  const isPhysical = (Array.isArray(domains) && domains.includes('physical')) || domain === 'hardware' || (domain === 'hybrid' && (combined.includes('kit') || combined.includes('device') || combined.includes('gadget') || combined.includes('robot') || combined.includes('drone') || combined.includes('wearable') || combined.includes('smart') || combined.includes('lock') || combined.includes('plant') || combined.includes('clothing') || combined.includes('apparel') || combined.includes('product')))
  if (isPhysical) {
    return {
      modelId: 'one_time',
      confidence: 0.90,
      badge: '★ AI Recommended Pick',
      title: 'One-Time Product / Hardware Sale',
      reasoning: `Recommended for physical products & hardware: Generates upfront cash-flow per unit sold (35–60% margins) to cover materials, manufacturing, assembly, and shipping.`,
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

