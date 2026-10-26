import { apiRequest } from './apiClient.js'

export const generateBusinessModel = (projectId, domain) => apiRequest(
  `/api/projects/drafts/${encodeURIComponent(projectId)}/business-model/generate/`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain }) },
)

export const researchBusinessModel = (projectId, { purpose, market, currency }) => apiRequest(
  `/api/projects/drafts/${encodeURIComponent(projectId)}/business-model/research/`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose, market, currency }) },
)

export const saveBusinessModel = (projectId, plan) => apiRequest(
  `/api/projects/drafts/${encodeURIComponent(projectId)}/business-model/`,
  { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) },
)

export function calculateBusinessMetrics({ totalBudget, fixedMonthlyCosts, monthlyMarketing, monthlyCustomers, averageRevenuePerCustomer }) {
  const monthlyBurn = Math.max(0, fixedMonthlyCosts) + Math.max(0, monthlyMarketing)
  const monthlyRevenue = Math.max(0, monthlyCustomers) * Math.max(0, averageRevenuePerCustomer)
  return {
    monthlyBurn,
    monthlyRevenue,
    contributionMargin: monthlyRevenue - monthlyBurn,
    runwayMonths: monthlyBurn ? totalBudget / monthlyBurn : 24,
    breakevenMonths: monthlyRevenue > monthlyBurn ? 0 : null,
  }
}

export function getBusinessGuardrails({ runwayMonths, marketing, mvpValidation, techInfrastructure }) {
  const warnings = []
  if (runwayMonths < 6) warnings.push('Runway is below the six-month safety threshold.')
  if (marketing > mvpValidation + techInfrastructure) {
    warnings.push('Marketing is larger than product development before MVP validation.')
  }
  return { warnings, viable: warnings.length === 0 }
}
