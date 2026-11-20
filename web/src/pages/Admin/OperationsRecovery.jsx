import { useEffect } from 'react'

// Redirects the legacy recovery route to task management.
export default function OperationsRecovery() {
  // Sends visits to the old route to the current tasks page.
  useEffect(() => {
    window.location.replace('/admin/tasks')
  }, [])

  return null
}
