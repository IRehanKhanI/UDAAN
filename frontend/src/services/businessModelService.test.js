import test from 'node:test'
import assert from 'node:assert/strict'
import { researchBusinessModel } from './businessModelService.js'

test('market research sends the project market, currency, and product purpose to the backend', async () => {
  const originalFetch = globalThis.fetch
  let request
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return { ok: true, status: 200, json: async () => ({ overview: {}, market_size: {}, unit_economics: {}, market_research: {} }) }
  }

  try {
    await researchBusinessModel('project-123', {
      purpose: 'Therapy chatbot for 24/7 guidance',
      market: 'India',
      currency: 'INR',
    })
    assert.match(request.url, /\/api\/projects\/drafts\/project-123\/business-model\/research\/$/)
    assert.equal(request.options.method, 'POST')
    assert.deepEqual(JSON.parse(request.options.body), {
      purpose: 'Therapy chatbot for 24/7 guidance',
      market: 'India',
      currency: 'INR',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
