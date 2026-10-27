const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000
const QUERY_PAGE_SIZE = 1000

export function manilaDayBounds(now = Date.now()) {
  const day = new Date(now + MANILA_OFFSET_MS).toISOString().slice(0, 10)
  const start = Date.parse(`${day}T00:00:00+08:00`)
  return {
    day,
    start,
    end: start + 24 * 60 * 60 * 1000,
  }
}

export async function loadDailySensorRows(client, table, columns, bounds) {
  const rows = []
  for (let offset = 0; ;) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .gte('created_at', new Date(bounds.start).toISOString())
      .lt('created_at', new Date(bounds.end).toISOString())
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + QUERY_PAGE_SIZE - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    offset += data.length
  }
  return rows
}

export function readingsForField(readings, field) {
  return readings.filter((reading) => reading.field_name === field)
}
