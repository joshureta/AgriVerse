export function isCheckoutTransportError(error) {
  return error?.name === 'AbortError'
    || error?.name === 'TypeError'
    || /failed to fetch|fetch failed|networkerror|load failed/i.test(error?.message || '')
}

export async function retryCheckoutTransport(request, wait = () => new Promise((resolve) => setTimeout(resolve, 750))) {
  try {
    return await request()
  } catch (error) {
    if (!isCheckoutTransportError(error)) throw error
    await wait()
    return request()
  }
}
