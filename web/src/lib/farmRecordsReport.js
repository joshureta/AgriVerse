const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000

function manilaDate(value) {
  return new Date(new Date(value).getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10)
}

function periodStart(period, now) {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth()
  const day = local.getUTCDate()
  const mondayOffset = (local.getUTCDay() + 6) % 7
  const start = period === 'week' ? Date.UTC(year, month, day - mondayOffset)
    : period === 'year' ? Date.UTC(year, 0, 1)
      : Date.UTC(year, month, 1)
  return new Date(start - MANILA_OFFSET_MS)
}

function cell(value) {
  return String(value ?? '').trim() || '—'
}

function count(value) {
  return value.toLocaleString('en-PH')
}

function dateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date)
}

function section(title, columns, rows) {
  return { title, columns, rows: rows.length ? rows : [["No records for this period", ...columns.slice(1).map(() => '—')]] }
}

function taskDetails(tasks, kind) {
  if (kind === 'fertilization' || kind === 'pestaction') return [section(
    kind === 'fertilization' ? 'Fertilizer applications' : 'Pest and disease actions',
    ['Field', 'Date', kind === 'fertilization' ? 'Fertilizer' : 'Pesticide', 'Amount used'],
    tasks.map((task) => [cell(task.field), dateTime(task.completed_at), cell(task.inventory_item?.item_name),
      task.inventory_quantity ? `${task.inventory_quantity} ${task.inventory_item?.unit?.abbreviation || ''}`.trim() : '—']),
  )]
  if (kind === 'inspection') return [
    section('Inspection findings', ['Field', 'Date', 'Crop condition', 'Pest / disease observed'], tasks.map((task) => [
      cell(task.field), dateTime(task.completed_at), cell(task.details?.crop_condition), cell(task.details?.pest_observed),
    ])),
    section('Recommended actions', ['Field', 'Date', 'Recommendation'], tasks.map((task) => [
      cell(task.field), dateTime(task.completed_at), cell(task.details?.recommended_action),
    ])),
  ]
  if (kind === 'harvesting') return [section('Harvest counts by size', ['Field', 'Date', 'Small / Medium / Large', 'Damaged'], tasks.map((task) => [
    cell(task.field), dateTime(task.completed_at),
    [task.harvest_small_count, task.harvest_medium_count, task.harvest_large_count].map((value) => value ?? '—').join(' / '),
    cell(task.harvest_damaged_count),
  ]))]
  if (kind === 'stockcheck') return [section('Stock count results', ['Location', 'Date', 'Counted', 'Good', 'Non-saleable', 'Unaccounted for'], tasks.map((task) => {
    const summary = task.stock_check_summary
    return [
      cell(task.field), dateTime(task.completed_at),
      ...(summary ? [summary.counted, summary.good, summary.non_saleable, summary.unaccounted].map((value) => `${value} pcs`) : ['—', '—', '—', '—']),
    ]
  }))]
  return []
}

export function buildFarmRecordsReport({ tasks = [], orders = [], category, kind, period }, now = new Date()) {
  const delivery = kind === 'delivery'
  const source = delivery ? orders : tasks
  const timestamp = (item) => delivery ? item.delivery_scheduled_at : item.completed_at
  const dated = source.filter((item) => timestamp(item) && !Number.isNaN(new Date(timestamp(item)).getTime()))
  const start = period === 'all' ? null : periodStart(period, now)
  const selected = period === 'all' ? source : dated.filter((item) => new Date(timestamp(item)) >= start && new Date(timestamp(item)) <= now)
  const earliest = dated.reduce((min, item) => {
    const time = new Date(timestamp(item)).getTime()
    return Math.min(min, time)
  }, now.getTime())
  const startDate = start ? manilaDate(start) : manilaDate(earliest)
  const latest = dated.reduce((max, item) => Math.max(max, new Date(timestamp(item)).getTime()), now.getTime())
  const endDate = manilaDate(period === 'all' ? latest : now)
  const title = `${category} Report`

  if (delivery) {
    const statusCounts = new Map()
    for (const order of selected) {
      const status = cell(order.delivery_assignment_status || 'assigned').replaceAll('_', ' ')
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
    }
    return {
      type: 'farm-records-delivery', period, title, field: 'All delivery areas', startDate, endDate,
      generatedAt: now.toISOString(), hasData: selected.length > 0,
      summary: [
        { label: 'Delivery records', value: count(selected.length) },
        { label: 'Drivers', value: count(new Set(selected.map((order) => order.assigned_driver?.full_name).filter(Boolean)).size) },
        { label: 'Customers', value: count(new Set(selected.map((order) => order.delivery_full_name).filter(Boolean)).size) },
      ],
      sections: [
        section('Delivery status', ['Status', 'Count'], [...statusCounts].map(([status, total]) => [status, count(total)])),
        section('Delivery records', ['Order', 'Driver', 'Customer', 'Scheduled window'], selected.map((order) => [
          cell(order.order_number), cell(order.assigned_driver?.full_name), cell(order.delivery_full_name), dateTime(order.delivery_scheduled_at),
        ])),
        section('Delivery details', ['Order', 'Address', 'Status', 'Insights'], selected.map((order) => [
          cell(order.order_number),
          cell([order.delivery_barangay, order.delivery_city_municipality, order.delivery_province, order.delivery_region].filter(Boolean).join(', ')),
          cell(order.delivery_assignment_status || 'assigned').replaceAll('_', ' '), cell(order.delivery_proof_notes),
        ])),
      ],
    }
  }

  const byField = new Map()
  for (const task of selected) byField.set(cell(task.field), (byField.get(cell(task.field)) || 0) + 1)
  return {
    type: `farm-records-${kind}`, period, title, field: 'All fields', startDate, endDate,
    generatedAt: now.toISOString(), hasData: selected.length > 0,
    summary: [
      { label: 'Completed records', value: count(selected.length) },
      { label: 'Fields', value: count(byField.size) },
      { label: 'Farm workers', value: count(new Set(selected.map((task) => task.assigned_worker?.full_name).filter(Boolean)).size) },
    ],
    sections: [
      section('Completed work by field', ['Field', 'Records'], [...byField].sort(([a], [b]) => a.localeCompare(b)).map(([field, total]) => [field, count(total)])),
      ...taskDetails(selected, kind),
    ],
  }
}
