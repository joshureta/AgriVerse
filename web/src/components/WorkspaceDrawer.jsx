import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// The same navigation remains a sidebar on desktop and a modal drawer on mobile.
export default function WorkspaceDrawer({ open, setOpen, triggerRef, id, title, children }) {
  const drawerRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const media = window.matchMedia('(max-width: 1024px)')
    if (!media.matches) { setOpen(false); return undefined }
    const drawer = drawerRef.current
    const trigger = triggerRef.current
    const workspace = drawer.closest('.admin-dashboard')?.querySelector('.admin-workspace')
    const previousInert = workspace?.inert
    const previousOverflow = document.body.style.overflow
    if (workspace) workspace.inert = true
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function handleKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
      if (event.key !== 'Tab') return
      const items = [...drawer.querySelectorAll('a[href], button:not(:disabled)')].filter((item) => item.getClientRects().length)
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) {
        event.preventDefault(); first?.focus()
      }
    }
    function handleResize() { if (!media.matches) setOpen(false) }
    document.addEventListener('keydown', handleKey)
    media.addEventListener('change', handleResize)
    return () => {
      if (workspace) workspace.inert = previousInert
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      media.removeEventListener('change', handleResize)
      trigger?.focus()
    }
  }, [open, setOpen, triggerRef])

  return <>
    {open && <div className="workspace-drawer-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}
    <div className="workspace-drawer" id={id} ref={drawerRef}
      role={open ? 'dialog' : undefined} aria-modal={open ? true : undefined} aria-label={open ? title : undefined}>
      <header className="workspace-drawer-heading">
        <strong>{title}</strong>
        <button type="button" ref={closeRef} aria-label="Close navigation" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
      </header>
      {children}
    </div>
  </>
}
