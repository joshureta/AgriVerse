import agriverseWordmark from '../assets/agriverse-wordmark.png'
import sellerHero from '../assets/seller-dashboard-pineapple-crates.png'
import '../styles/admin-dashboard.css'
import '../styles/workspace-loading.css'

const adminLinks = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'User Management', path: '/admin/users' },
  { label: 'Task and Schedule', path: '/admin/tasks', nested: true },
  { label: 'Inventory', path: '/admin/inventory', nested: true },
  { label: 'Records', path: '/admin/records' },
  { label: 'Crop Health Monitoring', path: '/admin/monitoring/crop-health', nested: true },
  { label: 'Environmental Monitoring', path: '/admin/monitoring/environmental', nested: true },
  { label: 'Messages', path: '/admin/messages' },
  { label: 'Settings', path: '/admin/settings' },
]

const sellerLinks = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Inventory Management', path: 'inventory' },
  { label: 'Order Management', path: 'orders' },
]

function pageFor(path, seller) {
  if (seller) {
    if (path.endsWith('/inventory')) return { type: 'inventory', title: 'Inventory Management', active: 'inventory' }
    if (path.endsWith('/orders')) return { type: 'orders', title: 'Order Management', active: 'orders' }
    return { type: 'dashboard', title: 'Dashboard', active: 'dashboard' }
  }

  const pages = {
    '/admin': ['dashboard', 'Dashboard'],
    '/admin/users': ['users', 'User Management'],
    '/admin/users/edit': ['edit-user', 'Edit User Information'],
    '/admin/tasks': ['tasks', 'Task Assignment & Scheduling'],
    '/admin/inventory': ['inventory', 'Inventory Management'],
    '/admin/records': ['records', 'Farm records'],
    '/admin/monitoring/crop-health': ['crop-health', 'Crop Health Monitoring'],
    '/admin/monitoring/environmental': ['environmental', 'Real-Time Environmental Monitoring'],
    '/admin/messages': ['messages', 'Messages'],
    '/admin/settings': ['settings', 'Settings'],
  }
  const [type, title] = pages[path] || pages['/admin']
  return { type, title, active: type === 'edit-user' ? '/admin/users' : path }
}

function Bar({ width = '100%', height = 14, className = '' }) {
  return <span className={`workspace-loading-bar ${className}`} style={{ width, height }} />
}

function Circle({ size = 38 }) {
  return <span className="workspace-loading-circle" style={{ width: size, height: size }} />
}

function Panel({ children, className = '' }) {
  return <div className={`workspace-loading-panel ${className}`}>{children}</div>
}

function Heading({ title }) {
  return <div className="workspace-loading-heading"><h1>{title}</h1><Bar width="min(440px, 75%)" /></div>
}

function Table({ rows = 5, columns = 5 }) {
  return <Panel className="workspace-loading-table">
    <div className="workspace-loading-table-toolbar"><Bar width="28%" height={22} /><Bar width="25%" height={34} /></div>
    <div className="workspace-loading-table-scroll">
      <div className="workspace-loading-table-head" style={{ '--loading-columns': columns }}>{Array.from({ length: columns }, (_, index) => <Bar key={index} width={index === 0 ? '72%' : '58%'} height={12} />)}</div>
      {Array.from({ length: rows }, (_, row) => <div className="workspace-loading-table-row" style={{ '--loading-columns': columns }} key={row}>{Array.from({ length: columns }, (_, column) => <Bar key={column} width={column === 0 ? '78%' : column === columns - 1 ? '55%' : '66%'} height={14} />)}</div>)}
    </div>
    <div className="workspace-loading-pagination"><Bar width={110} /><Bar width={142} /></div>
  </Panel>
}

function DashboardPreview({ seller }) {
  return <>
    <div className="workspace-loading-hero" style={seller ? { backgroundImage: `linear-gradient(90deg, #fffef8 35%, rgba(255, 254, 248, .42)), url(${sellerHero})` } : undefined}>
      <div><Bar width={80} height={12} /><Bar width="min(310px, 75%)" height={42} /><Bar width="min(390px, 85%)" /></div>
    </div>
    <div className="workspace-loading-stats">{Array.from({ length: seller ? 3 : 4 }, (_, index) => <Panel key={index}><Bar width="52%" /><Bar width="68%" height={35} /><Bar width="78%" height={11} /></Panel>)}</div>
    <div className="workspace-loading-dashboard-grid"><Panel className="workspace-loading-chart"><Bar width="42%" height={20} /><div className="workspace-loading-chart-bars">{[45, 72, 58, 88, 64, 78, 52].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div></Panel><Panel className="workspace-loading-activity"><Bar width="55%" height={20} />{Array.from({ length: 4 }, (_, index) => <div key={index}><Circle size={32} /><Bar width="70%" /></div>)}</Panel></div>
  </>
}

function InventoryPreview() {
  return <><div className="workspace-loading-tabs"><Bar width={120} height={36} /><Bar width={120} height={36} /><Bar width={120} height={36} /></div><Panel className="workspace-loading-stock"><div><Bar width="45%" height={23} /><Bar width="75%" /></div><div>{[1, 2, 3].map((item) => <Panel key={item}><Circle size={36} /><Bar width="65%" /><Bar width="42%" height={25} /></Panel>)}</div></Panel><Table columns={6} rows={4} /></>
}

function MonitoringPreview({ environmental }) {
  if (environmental) return <><Panel className="workspace-loading-network"><Circle size={38} /><div><Bar width={210} height={20} /><Bar width={155} /></div></Panel><div className="workspace-loading-stats">{[1, 2, 3].map((item) => <Panel key={item}><Circle size={42} /><Bar width="60%" /><Bar width="40%" height={32} /></Panel>)}</div><div className="workspace-loading-two-column"><Panel className="workspace-loading-chart"><Bar width="45%" height={22} /><div className="workspace-loading-graph" /></Panel><Panel className="workspace-loading-chart"><Bar width="65%" height={22} /><div className="workspace-loading-graph" /></Panel></div></>
  return <><div className="workspace-loading-two-column"><Panel className="workspace-loading-photo"><div /><Bar width="52%" height={20} /><Bar width="85%" /></Panel><Panel className="workspace-loading-form"><Bar width="48%" height={21} />{[1, 2, 3, 4].map((item) => <div key={item}><Bar width="35%" height={12} /><Bar height={36} /></div>)}</Panel></div><Table columns={5} rows={3} /></>
}

function MessagesPreview() {
  return <Panel className="workspace-loading-messages"><div className="workspace-loading-conversations"><Bar width="62%" height={23} /><Bar height={35} />{[1, 2, 3, 4, 5].map((item) => <div key={item}><Circle size={42} /><span><Bar width="65%" /><Bar width="90%" height={11} /></span></div>)}</div><div className="workspace-loading-thread"><div><Circle size={40} /><Bar width={160} height={21} /></div><section><Bar width="48%" height={44} /><Bar width="56%" height={44} /><Bar width="40%" height={44} /></section><Bar height={42} /></div></Panel>
}

function SettingsPreview() {
  return <><div className="workspace-loading-tabs"><Bar width={150} height={38} /><Bar width={150} height={38} /><Bar width={150} height={38} /></div><Table columns={3} rows={5} /></>
}

function EditUserPreview() {
  return <Panel className="workspace-loading-edit-form"><div><Circle size={70} /><Bar width={180} height={24} /></div><section>{[1, 2, 3, 4, 5, 6].map((item) => <div key={item}><Bar width="38%" height={12} /><Bar height={40} /></div>)}</section><Bar width={140} height={40} /></Panel>
}

function Content({ type, seller }) {
  if (type === 'dashboard') return <DashboardPreview seller={seller} />
  if (type === 'inventory') return <InventoryPreview />
  if (type === 'crop-health' || type === 'environmental') return <MonitoringPreview environmental={type === 'environmental'} />
  if (type === 'messages') return <MessagesPreview />
  if (type === 'settings') return <SettingsPreview />
  if (type === 'edit-user') return <EditUserPreview />
  if (type === 'tasks') return <><div className="workspace-loading-tabs"><Bar width={140} height={38} /><Bar width={140} height={38} /><Bar width={140} height={38} /></div><Panel className="workspace-loading-filters"><Bar width="30%" height={37} /><Bar width="24%" height={37} /><Bar width="20%" height={37} /></Panel><Table columns={7} /></>
  if (type === 'records') return <><div className="workspace-loading-tabs"><Bar width={140} height={38} /><Bar width={140} height={38} /></div><Panel className="workspace-loading-filters"><Bar width="27%" height={37} /><Bar width="27%" height={37} /><Bar width="20%" height={37} /></Panel><Table columns={6} /></>
  if (type === 'orders') return <><div className="workspace-loading-tabs"><Bar width={110} height={38} /><Bar width={110} height={38} /><Bar width={110} height={38} /><Bar width={110} height={38} /></div><Panel className="workspace-loading-filters"><Bar width="33%" height={38} /><Bar width="24%" height={38} /></Panel><Table columns={6} /></>
  return <><Panel className="workspace-loading-filters"><Bar width="32%" height={38} /><Bar width="25%" height={38} /></Panel><Table columns={5} /></>
}

export default function WorkspaceLoading({ path, seller = false }) {
  const { type, title, active } = pageFor(path, seller)
  const links = seller ? sellerLinks : adminLinks

  return <main className={`admin-dashboard workspace-loading${seller ? ' seller-dashboard' : ''}`} aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
    <aside className="admin-sidebar workspace-loading-sidebar" aria-hidden="true">
      <div className="admin-logo"><img className="admin-logo-image" src={agriverseWordmark} alt="" /></div>
      <nav className="admin-nav">{links.map((link) => <span key={link.path} className={`${active === link.path ? 'is-active' : ''}${link.nested ? ' is-nested' : ''}`}><span className="workspace-loading-nav-icon" />{link.label}</span>)}</nav>
      <div className="admin-sidebar-footer"><span>{seller ? 'Seller workspace' : 'Administrator workspace'}</span><strong>AgriVerse</strong></div>
    </aside>
    <section className="admin-workspace">
      <header className="admin-topbar workspace-loading-topbar" aria-hidden="true"><Bar width={190} /><div><Circle size={28} /><Circle size={28} /><Circle size={38} /><Bar width={100} /></div></header>
      <div className="workspace-loading-content"><Heading title={title} /><Content type={type} seller={seller} /></div>
    </section>
  </main>
}
