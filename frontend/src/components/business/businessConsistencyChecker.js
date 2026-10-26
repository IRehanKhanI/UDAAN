// businessConsistencyChecker.js - Deterministic Number Consistency Rules

export function runBusinessConsistencyChecks(modelData = {}) {
  const issues = []

  const overview = modelData.overview || {}
  const marketSize = modelData.market_size || {}
  const unitEconomics = modelData.unit_economics || {}
  const runwayAsk = modelData.runway_ask || {}

  const tam = Number(marketSize.tam_value) || 0
  const sam = Number(marketSize.sam_value) || 0
  const som = Number(marketSize.som_value) || 0

  const price = Number(unitEconomics.price_per_unit) || Number(overview.price_per_customer) || 0
  const cac = Number(unitEconomics.cac) || 0
  const ltv = Number(unitEconomics.ltv) || 0
  const costToServe = Number(unitEconomics.cost_to_serve) || 0

  const fundingNeeded = Number(runwayAsk.funding_needed) || Number(modelData.total_budget) || 0
  const monthlyBurn = Number(runwayAsk.monthly_burn) || Number(modelData.fixed_monthly_costs) || 0
  const statedRunway = Number(runwayAsk.runway_months) || 0

  // 1. Market Hierarchy (SOM <= SAM <= TAM)
  if (sam > 0 && som > sam) {
    issues.push({
      id: 'market_som_greater_than_sam',
      severity: 'error',
      tab: 'market_size',
      title: 'SOM exceeds SAM',
      description: `Serviceable Obtainable Market (SOM) cannot exceed your Serviceable Addressable Market (SAM).`,
      recommendation: 'Refine your target customer geography or market share assumptions.',
    })
  }

  if (tam > 0 && sam > tam) {
    issues.push({
      id: 'market_sam_greater_than_tam',
      severity: 'error',
      tab: 'market_size',
      title: 'SAM exceeds TAM',
      description: `Serviceable Addressable Market (SAM) cannot be larger than Total Addressable Market (TAM).`,
      recommendation: 'Check population and annual pricing inputs for TAM.',
    })
  }

  // 2. Unit Economics (LTV vs CAC)
  if (cac > 0 && ltv > 0) {
    const ltvCacRatio = ltv / cac
    if (ltvCacRatio < 1.0) {
      issues.push({
        id: 'unit_ltv_under_cac',
        severity: 'error',
        tab: 'unit_economics',
        title: 'Negative Unit Economics (LTV < CAC)',
        description: `Customer Acquisition Cost (CAC) is higher than Lifetime Value (LTV). You lose money on every acquired customer.`,
        recommendation: 'Increase retention/pricing or find organic distribution channels.',
      })
    } else if (ltvCacRatio < 3.0) {
      issues.push({
        id: 'unit_ltv_cac_ratio_low',
        severity: 'warning',
        tab: 'unit_economics',
        title: `Low LTV:CAC Ratio (${ltvCacRatio.toFixed(1)}x)`,
        description: `Healthy investor benchmarks require LTV:CAC to be at least 3.0x to allow for operational overhead and churn.`,
        recommendation: 'Optimize conversion funnels or introduce expansion tiers.',
      })
    }
  }

  if (price > 0 && costToServe >= price) {
    issues.push({
      id: 'unit_cost_exceeds_price',
      severity: 'error',
      tab: 'unit_economics',
      title: 'Cost to Serve Exceeds Selling Price',
      description: `Delivery / COGS cost is greater than or equal to selling price, resulting in zero or negative gross margins.`,
      recommendation: 'Reduce BOM component sourcing costs or revise customer price point.',
    })
  }

  // 3. Runway Math Mismatch
  if (monthlyBurn > 0 && fundingNeeded > 0) {
    const calculatedRunway = Math.round(fundingNeeded / monthlyBurn)
    if (statedRunway > 0 && Math.abs(statedRunway - calculatedRunway) > 1) {
      issues.push({
        id: 'runway_math_mismatch',
        severity: 'warning',
        tab: 'runway_ask',
        title: 'Runway Calculation Discrepancy',
        description: `Based on funding of ${fundingNeeded} and monthly burn of ${monthlyBurn}, your actual runway is ${calculatedRunway} months, but stated runway is ${statedRunway} months.`,
        recommendation: `Sync runway to ${calculatedRunway} months.`,
        fixValue: calculatedRunway,
      })
    }
  }

  // 4. Forecast vs Evidence Confidence Audit
  const confidenceItems = [
    marketSize.tam_confidence,
    marketSize.sam_confidence,
    marketSize.som_confidence,
    unitEconomics.cac_confidence,
    unitEconomics.ltv_confidence,
  ].filter(Boolean)

  const verifiedCount = confidenceItems.filter(c => c === 'verified').length
  const missingCount = confidenceItems.filter(c => c === 'missing').length

  if (confidenceItems.length > 0 && verifiedCount === 0) {
    issues.push({
      id: 'evidence_no_verified_data',
      severity: 'warning',
      tab: 'overview',
      title: 'Zero Primary Verified Evidence',
      description: 'All key business numbers currently rely on AI estimates or unverified hypotheses.',
      recommendation: 'Conduct user discovery interviews or attach verified citations to strengthen investor credibility.',
    })
  }

  if (missingCount >= 2) {
    issues.push({
      id: 'evidence_missing_fields',
      severity: 'info',
      tab: 'unit_economics',
      title: `${missingCount} Data Points Lacking Evidence`,
      description: 'Several financial assumptions are tagged as "Not enough data".',
      recommendation: 'Complete customer acquisition tests to fill in field metrics.',
    })
  }

  return issues
}
