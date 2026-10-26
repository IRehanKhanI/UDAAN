import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getDaysRemaining,
  getTimelineProgress,
  isTaskOverdue,
  formatDisplayDate,
} from './flightPlanUtils.js'

test('getDaysRemaining returns correct calculations for upcoming, today, and overdue deadlines', () => {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  const dueToday = getDaysRemaining(todayStr)
  assert.equal(dueToday.days, 0)
  assert.equal(dueToday.isDueToday, true)
  assert.equal(dueToday.isOverdue, false)
  assert.equal(dueToday.label, 'Due today')

  // Future deadline: +10 days
  const future = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)
  const fy = future.getFullYear()
  const fm = String(future.getMonth() + 1).padStart(2, '0')
  const fd = String(future.getDate()).padStart(2, '0')
  const futureStr = `${fy}-${fm}-${fd}`
  const futureRes = getDaysRemaining(futureStr)
  assert.ok(futureRes.days >= 9 && futureRes.days <= 11)
  assert.equal(futureRes.isOverdue, false)
  assert.ok(futureRes.label.includes('remaining'))

  // Past deadline: -5 days
  const past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5)
  const py = past.getFullYear()
  const pm = String(past.getMonth() + 1).padStart(2, '0')
  const pd = String(past.getDate()).padStart(2, '0')
  const pastStr = `${py}-${pm}-${pd}`
  const pastRes = getDaysRemaining(pastStr)
  assert.ok(pastRes.days <= -4 && pastRes.days >= -6)
  assert.equal(pastRes.isOverdue, true)
  assert.ok(pastRes.label.includes('overdue'))
})

test('getTimelineProgress accurately computes elapsed percentage clamped between 0 and 100', () => {
  const pastStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const progress = getTimelineProgress(pastStart, futureEnd)
  assert.ok(progress >= 45 && progress <= 55)

  // When deadline is in the past, progress is 100%
  const overdueEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  assert.equal(getTimelineProgress(pastStart, overdueEnd), 100)
})

test('isTaskOverdue detects overdue incomplete tasks and ignores completed tasks', () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const incompletePast = { target_date: yesterday }
  assert.equal(isTaskOverdue(incompletePast, false), true)

  // If task is completed, it should never be flagged as overdue
  assert.equal(isTaskOverdue(incompletePast, true), false)

  // Future task is not overdue
  const futureTask = { target_date: tomorrow }
  assert.equal(isTaskOverdue(futureTask, false), false)
})

test('formatDisplayDate formats valid dates and passes empty gracefully', () => {
  assert.equal(formatDisplayDate(''), '')
  assert.equal(formatDisplayDate(null), '')
  const formatted = formatDisplayDate('2026-11-20')
  assert.ok(formatted.includes('2026'))
  assert.ok(formatted.includes('Nov'))
})
