import { useEffect } from 'react'

export default function OperationsRecovery() {
  useEffect(() => {
    window.location.replace('/admin/tasks')
  }, [])

  return null
}
