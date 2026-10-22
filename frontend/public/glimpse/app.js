import { requestGlimpse } from './ai-service.js'
import { buildPreviewDocument, validateWebsite } from './preview.js'
import { downloadWebsiteZip } from './export.js'

const state = {
  conversation: [],
  website: null,
  previousWebsite: null,
  generating: false,
  selectedDevice: 'desktop',
  selectedCodeFile: 'html',
  mvpPrompt: '',
  lastRequest: null,
}

const elements = {
  messages: document.querySelector('#messages'),
  prompt: document.querySelector('#prompt-input'),
  send: document.querySelector('#send-button'),
  preview: document.querySelector('#site-preview'),
  previewStage: document.querySelector('#preview-stage'),
  welcome: document.querySelector('#welcome'),
  loading: document.querySelector('#loading'),
  loadingTitle: document.querySelector('#loading-title'),
  previewStatus: document.querySelector('#preview-status'),
  previewAddress: document.querySelector('#preview-address'),
  previewError: document.querySelector('#preview-error'),
  chatError: document.querySelector('#chat-error'),
  codeButton: document.querySelector('#code-button'),
  exportButton: document.querySelector('#export-button'),
  mvpButton: document.querySelector('#mvp-button'),
  codeDialog: document.querySelector('#code-dialog'),
  mvpDialog: document.querySelector('#mvp-dialog'),
  codeContent: document.querySelector('#code-content'),
  codeFilename: document.querySelector('#code-filename'),
  mvpContent: document.querySelector('#mvp-content'),
  mvpLoading: document.querySelector('#mvp-loading'),
  mvpStatus: document.querySelector('#mvp-status'),
  copyMvp: document.querySelector('#copy-mvp-button'),
  toast: document.querySelector('#toast'),
}

let toastTimer

function appendMessage(role, content, { error = false, retry = null } = {}) {
  const item = document.createElement('div')
  item.className = `message ${role}${error ? ' error-message' : ''}`
  item.textContent = content
  elements.messages.append(item)
  if (retry) {
    const retryRow = document.createElement('div')
    retryRow.className = 'message retry-row'
    const button = document.createElement('button')
    button.className = 'retry-button'
    button.type = 'button'
    button.textContent = 'Retry request'
    button.addEventListener('click', () => void submitPrompt(retry, true))
    retryRow.append(button)
    elements.messages.append(retryRow)
  }
  elements.messages.scrollTop = elements.messages.scrollHeight
}

function setBusy(busy, action = 'generate') {
  state.generating = busy
  elements.send.disabled = busy
  elements.prompt.disabled = busy
  elements.send.querySelector('span').textContent = busy
    ? (action === 'edit' ? 'Updating' : 'Building')
    : (state.website ? 'Send' : 'Build')
  elements.loading.hidden = !busy
  elements.loadingTitle.textContent = action === 'edit' ? 'Updating your website' : 'Building your website'
  if (busy) {
    elements.previewError.hidden = true
    elements.chatError.hidden = true
  }
}

function updateWorkspaceControls() {
  const hasWebsite = Boolean(state.website)
  elements.codeButton.disabled = !hasWebsite
  elements.exportButton.disabled = !hasWebsite
  elements.mvpButton.disabled = !hasWebsite || state.generating
  if (!state.generating) elements.send.querySelector('span').textContent = hasWebsite ? 'Send' : 'Build'
}

async function submitPrompt(value = elements.prompt.value, isRetry = false) {
  const prompt = String(value || '').trim()
  if (!prompt || state.generating) return

  const action = state.website ? 'edit' : 'generate'
  state.lastRequest = prompt
  if (isRetry && state.conversation.at(-1)?.role === 'assistant') {
    state.conversation.pop()
    if (state.conversation.at(-1)?.role === 'user' && state.conversation.at(-1).content === prompt) {
      state.conversation.pop()
    }
  }
  if (!isRetry) {
    appendMessage('user', prompt)
    state.conversation.push({ role: 'user', content: prompt })
  }
  elements.prompt.value = ''
  const history = (!isRetry ? state.conversation.slice(0, -1) : state.conversation).slice(-8)
  setBusy(true, action)
  updateWorkspaceControls()
  const thinking = document.createElement('div')
  thinking.className = 'thinking'
  thinking.setAttribute('aria-label', action === 'edit' ? 'Updating website' : 'Generating website')
  thinking.innerHTML = '<i></i><i></i><i></i>'
  elements.messages.append(thinking)
  elements.messages.scrollTop = elements.messages.scrollHeight

  try {
    const result = await requestGlimpse(action, prompt, history, state.website)
    const website = validateWebsite(result)
    const documentSource = buildPreviewDocument(website)
    state.previousWebsite = state.website
    state.website = website
    elements.preview.srcdoc = documentSource
    elements.preview.dataset.device = state.selectedDevice
    elements.preview.hidden = false
    elements.welcome.hidden = true
    elements.previewAddress.textContent = website.title
    elements.previewStatus.textContent = action === 'edit' ? 'Website updated' : 'Website generated'
    elements.previewError.hidden = true
    const summary = [
      website.explanation,
      ...(website.assumptions?.length ? [`Assumptions: ${website.assumptions.join(' · ')}`] : []),
    ].join('\n\n')
    appendMessage('assistant', summary)
    state.conversation.push({ role: 'assistant', content: summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The website could not be generated. Your current preview is unchanged.'
    elements.previewError.textContent = message
    elements.previewError.hidden = false
    elements.chatError.textContent = message
    elements.chatError.hidden = false
    appendMessage('assistant', message, { error: true, retry: prompt })
    state.conversation.push({ role: 'assistant', content: message })
  } finally {
    thinking.remove()
    setBusy(false)
    updateWorkspaceControls()
    elements.prompt.focus()
  }
}

function showToast(message) {
  elements.toast.textContent = message
  elements.toast.classList.add('visible')
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 2600)
}

function currentCode() {
  if (!state.website) return ''
  return state.website[state.selectedCodeFile] || ''
}

function showCodeFile(file) {
  state.selectedCodeFile = file
  const names = { html: 'index.html', css: 'styles.css', js: 'script.js' }
  document.querySelectorAll('[data-code-tab]').forEach((tab) => {
    const active = tab.dataset.codeTab === file
    tab.classList.toggle('active', active)
    tab.setAttribute('aria-selected', String(active))
  })
  elements.codeFilename.textContent = names[file]
  elements.codeContent.textContent = currentCode()
}

async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const temporary = document.createElement('textarea')
      temporary.value = text
      temporary.style.position = 'fixed'
      temporary.style.opacity = '0'
      document.body.append(temporary)
      temporary.select()
      const copied = document.execCommand('copy')
      temporary.remove()
      if (!copied) throw new Error('Clipboard access was denied.')
    }
    showToast(successMessage)
  } catch {
    showToast('Copy failed. Select and copy the text manually.')
  }
}

async function createMvpPrompt() {
  if (!state.website || state.generating) return
  elements.mvpContent.textContent = ''
  elements.mvpStatus.textContent = ''
  elements.copyMvp.disabled = true
  elements.mvpLoading.hidden = false
  elements.mvpDialog.showModal()
  try {
    const result = await requestGlimpse(
      'mvp_prompt',
      '',
      state.conversation.slice(-8),
      state.website,
    )
    if (typeof result.mvp_prompt !== 'string' || !result.mvp_prompt.trim()) {
      throw new Error('The AI did not return a complete MVP prompt. Please retry.')
    }
    state.mvpPrompt = result.mvp_prompt
    elements.mvpContent.textContent = result.mvp_prompt
    elements.copyMvp.disabled = false
  } catch (error) {
    elements.mvpStatus.textContent = error.message || 'Could not generate the MVP prompt.'
  } finally {
    elements.mvpLoading.hidden = true
  }
}

elements.send.addEventListener('click', () => void submitPrompt())
elements.prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void submitPrompt()
  }
})
document.querySelectorAll('.example').forEach((button) => {
  button.addEventListener('click', () => void submitPrompt(button.dataset.prompt))
})
document.querySelectorAll('.device-button').forEach((button) => {
  button.addEventListener('click', () => {
    state.selectedDevice = button.dataset.device
    document.querySelectorAll('.device-button').forEach((item) => {
      const active = item === button
      item.classList.toggle('selected', active)
      item.setAttribute('aria-pressed', String(active))
    })
    elements.preview.dataset.device = state.selectedDevice
  })
})
document.querySelector('#refresh-button').addEventListener('click', () => {
  if (state.website) elements.preview.srcdoc = buildPreviewDocument(state.website)
})
document.querySelector('#fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await elements.previewStage.requestFullscreen()
  } catch {
    showToast('Fullscreen is unavailable in this browser.')
  }
})
elements.codeButton.addEventListener('click', () => {
  if (!state.website) return
  showCodeFile(state.selectedCodeFile)
  elements.codeDialog.showModal()
})
document.querySelectorAll('[data-code-tab]').forEach((tab) => {
  tab.addEventListener('click', () => showCodeFile(tab.dataset.codeTab))
})
document.querySelector('#copy-code-button').addEventListener('click', () => {
  void copyText(currentCode(), 'File copied to clipboard.')
})
elements.exportButton.addEventListener('click', async () => {
  if (!state.website) return
  try {
    await downloadWebsiteZip(state.website)
    showToast('Website source ZIP downloaded.')
  } catch {
    showToast('Could not create the ZIP. Please retry.')
  }
})
elements.mvpButton.addEventListener('click', () => void createMvpPrompt())
elements.copyMvp.addEventListener('click', () => {
  if (state.mvpPrompt) void copyText(state.mvpPrompt, 'MVP prompt copied to clipboard.')
})
document.querySelectorAll('.close-dialog').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close())
})
for (const dialog of [elements.codeDialog, elements.mvpDialog]) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
}

updateWorkspaceControls()
