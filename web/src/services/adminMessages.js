import { supabase } from '../lib/supabase.js'

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

async function readAccessToken(refresh = false) {
  const result = refresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession()
  if (result.error) throw new Error(result.error.message)
  const token = result.data.session?.access_token
  if (!token) throw new Error('Your session has ended. Please sign in again.')
  return token
}

async function apiRequest(path, options = {}, retry = true) {
  const token = await readAccessToken()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (response.status === 401 && retry) {
      await readAccessToken(true)
      return apiRequest(path, options, false)
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
    return body
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The backend did not respond. Make sure it is running on port 5000.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function loadAdminConversations() {
  const body = await apiRequest('/api/admin/messages')
  return body.conversations || []
}

export async function loadAdminConversation(conversationId) {
  const body = await apiRequest(`/api/admin/messages/${conversationId}`)
  return { conversation: body.conversation, messages: body.messages || [] }
}

export async function sendAdminMessage(conversationId, text) {
  const body = await apiRequest(`/api/admin/messages/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body: text }),
  })
  return body.message
}

export async function setAdminTyping(conversationId, isTyping) {
  return apiRequest(`/api/admin/messages/${conversationId}/typing`, {
    method: 'POST',
    body: JSON.stringify({ is_typing: isTyping }),
  })
}
