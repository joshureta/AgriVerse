const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 16
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const HEADER_HEIGHT = 60
const CONTENT_START = HEADER_HEIGHT + 10
const GREEN = [25, 108, 53]
const DARK = [21, 61, 37]
const MUTED = [91, 108, 94]
const PALE = [239, 247, 232]
// The report logo is flattened onto the header green so PDF viewers never paint transparent pixels black.
const LOGO_URL = new URL('../assets/jtoledo-report-logo.jpg', import.meta.url)

async function loadLogo() {
  const response = await fetch(LOGO_URL)
  if (!response.ok) throw new Error('Unable to load the JToledo Trading logo.')
  return new Uint8Array(await response.arrayBuffer())
}

function displayDate(date) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(`${date}T00:00:00+08:00`))
}

function displayTimestamp(value) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))
}

function writeHeader(doc, report, logo) {
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, PAGE_WIDTH, 43, 'F')
  doc.addImage(logo, 'JPEG', (PAGE_WIDTH - 55) / 2, 1, 55, 41)
  doc.setFillColor(...GREEN)
  doc.rect(0, 43, PAGE_WIDTH, HEADER_HEIGHT - 43, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(report.title, PAGE_WIDTH / 2, 54, { align: 'center' })
  doc.setTextColor(...DARK)
}

export async function buildDashboardReportPdf(report, logoBytes = null) {
  const { jsPDF } = await import('jspdf')
  const logo = logoBytes || await loadLogo()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = CONTENT_START

  function nextPage(requiredHeight) {
    if (y + requiredHeight <= PAGE_HEIGHT - 22) return
    doc.addPage()
    writeHeader(doc, report, logo)
    y = CONTENT_START
  }

  writeHeader(doc, report, logo)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`Period: ${displayDate(report.startDate)} - ${displayDate(report.endDate)}`, MARGIN, y)
  y += 6
  doc.text(`Field: ${report.field}    Generated: ${displayTimestamp(report.generatedAt)}`, MARGIN, y)
  y += 12

  const cards = report.summary || []
  const cardGap = 4
  const cardWidth = (CONTENT_WIDTH - cardGap * (cards.length - 1)) / Math.max(cards.length, 1)
  if (cards.length) {
    nextPage(30)
    cards.forEach((card, index) => {
      const x = MARGIN + index * (cardWidth + cardGap)
      doc.setFillColor(...PALE)
      doc.roundedRect(x, y, cardWidth, 26, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(doc.splitTextToSize(card.label, cardWidth - 8).slice(0, 2), x + 4, y + 7)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(card.value.length > 15 ? 10 : 13)
      doc.setTextColor(...DARK)
      doc.text(doc.splitTextToSize(card.value, cardWidth - 8).slice(0, 2), x + 4, y + 20)
    })
    y += 34
  }

  if (!report.hasData) {
    nextPage(20)
    doc.setFillColor(248, 249, 245)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 17, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text('No recorded data is available for the selected report and period.', MARGIN + 5, y + 10)
    y += 25
  }

  for (const section of report.sections || []) {
    nextPage(28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...DARK)
    doc.text(section.title, MARGIN, y)
    y += 6

    const widths = section.columns.map((_, index) => {
      if (section.columns.length === 1) return CONTENT_WIDTH
      return index === 0 ? CONTENT_WIDTH * 0.3 : CONTENT_WIDTH * 0.7 / (section.columns.length - 1)
    })
    const drawTableHeader = () => {
      nextPage(9)
      doc.setFillColor(...GREEN)
      doc.rect(MARGIN, y, CONTENT_WIDTH, 9, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      let x = MARGIN
      section.columns.forEach((column, index) => {
        doc.text(doc.splitTextToSize(String(column), widths[index] - 4).slice(0, 2), x + 2, y + 4)
        x += widths[index]
      })
      y += 9
    }
    drawTableHeader()

    for (const [rowIndex, row] of section.rows.entries()) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const cells = row.map((cell, index) => doc.splitTextToSize(String(cell ?? '-'), widths[index] - 4))
      const height = Math.max(9, ...cells.map((lines) => lines.length * 4 + 4))
      if (y + height > PAGE_HEIGHT - 22) {
        doc.addPage()
        writeHeader(doc, report, logo)
        y = CONTENT_START
        drawTableHeader()
      }
      doc.setFillColor(...(rowIndex % 2 ? [255, 255, 255] : [247, 250, 245]))
      doc.rect(MARGIN, y, CONTENT_WIDTH, height, 'F')
      doc.setTextColor(...DARK)
      let x = MARGIN
      cells.forEach((lines, index) => {
        doc.text(lines, x + 2, y + 5)
        x += widths[index]
      })
      y += height
    }
    y += 10
  }

  if (report.notes?.length) {
    nextPage(20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK)
    doc.text('Notes', MARGIN, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    for (const note of report.notes) {
      const lines = doc.splitTextToSize(note, CONTENT_WIDTH)
      nextPage(lines.length * 4 + 4)
      doc.text(lines, MARGIN, y)
      y += lines.length * 4 + 4
    }
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(220, 230, 218)
    doc.line(MARGIN, PAGE_HEIGHT - 17, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 17)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text('Source: AgriVerse recorded farm data', MARGIN, PAGE_HEIGHT - 12)
    doc.text(`${page} / ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12, { align: 'right' })
  }
  return doc
}

export async function downloadDashboardReportPdf(report) {
  const pdf = await buildDashboardReportPdf(report)
  const filename = `agriverse-${report.type}-${report.period}-${report.endDate}.pdf`
  pdf.save(filename)
}
