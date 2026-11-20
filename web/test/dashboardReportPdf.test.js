import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildDashboardReportPdf } from '../src/lib/dashboardReportPdf.js'

test('dashboard report PDF keeps a long table across pages', async () => {
  const report = {
    title: 'Farm Operations Report',
    startDate: '2026-11-01',
    endDate: '2026-11-17',
    field: 'All fields',
    generatedAt: '2026-11-17T08:00:00.000Z',
    summary: [
      { label: 'Scheduled tasks', value: '42' },
      { label: 'Completed', value: '38' },
      { label: 'Awaiting review', value: '4' },
    ],
    sections: [{
      title: 'Tasks by activity',
      columns: ['Activity', 'Scheduled', 'Completed', 'Awaiting review'],
      rows: Array.from({ length: 35 }, (_, index) => [`Activity ${index + 1}`, '2', '1', '1']),
    }],
    notes: ['Counts reflect recorded scheduled tasks.'],
    hasData: true,
  }
  const logoBytes = await readFile(new URL('../src/assets/Jtoledologo.png', import.meta.url))
  const pdf = await buildDashboardReportPdf(report, logoBytes)
  const bytes = new Uint8Array(pdf.output('arraybuffer'))
  assert.ok(pdf.getNumberOfPages() >= 2)
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-')
  assert.match(new TextDecoder().decode(bytes), /Activity 35/)
  assert.ok(bytes.length > 8000)
})
