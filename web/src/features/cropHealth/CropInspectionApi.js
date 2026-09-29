import { supabase } from '../../lib/supabase.js'

/** Keeps authentication and HTTP details out of the page component. */
export class CropInspectionApi {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
  }

  async request(path, options = {}) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) throw new Error('Your session has expired. Please sign in again.')

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'Unable to complete the inspection request.')
    return body
  }

  list() {
    return this.request('/api/ai/crop-inspections')
  }

  analyze(payload) {
    return this.request('/api/ai/crop-diagnosis', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  delete(id) {
    return this.request(`/api/ai/crop-inspections/${id}`, { method: 'DELETE' })
  }
}
