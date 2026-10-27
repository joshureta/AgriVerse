import { ChevronLeft, ChevronRight } from 'lucide-react'
import '../styles/pagination.css'

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  if (currentPage <= 3) return [1, 2, 3, 4, 'ellipsis-end', totalPages]
  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }
  return [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages]
}

export default function Pagination({
  page = 1,
  totalPages = 1,
  onChange,
  disabled = false,
  hideOnSinglePage = false,
  className = '',
  ariaLabel = 'Pagination',
}) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1)
  const safeCurrentPage = Math.max(1, Math.min(safeTotalPages, Number(page) || 1))

  if (hideOnSinglePage && safeTotalPages <= 1) {
    return null
  }

  const items = getPaginationItems(safeCurrentPage, safeTotalPages)

  const handlePageClick = (p) => {
    if (disabled || p === safeCurrentPage) return
    onChange?.(p)
  }

  const handlePrev = () => {
    if (disabled || safeCurrentPage <= 1) return
    onChange?.(safeCurrentPage - 1)
  }

  const handleNext = () => {
    if (disabled || safeCurrentPage >= safeTotalPages) return
    onChange?.(safeCurrentPage + 1)
  }

  return (
    <nav className={`agri-pagination-container ${className}`.trim()} aria-label={ariaLabel}>
      {/* Floating Circular Previous Button */}
      <button
        type="button"
        className="agri-pagination-btn agri-pagination-prev"
        aria-label="Previous page"
        disabled={disabled || safeCurrentPage <= 1}
        onClick={handlePrev}
      >
        <ChevronLeft className="agri-pagination-icon" aria-hidden="true" />
      </button>

      {/* Capsule Pill Container */}
      <div className="agri-pagination-pill">
        {items.map((item, index) => {
          if (typeof item === 'string' && item.startsWith('ellipsis')) {
            return (
              <span key={`ellipsis-${index}`} className="agri-pagination-ellipsis" aria-hidden="true">
                …
              </span>
            )
          }

          const pageNum = Number(item)
          const isActive = pageNum === safeCurrentPage

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              className={`agri-pagination-num ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Page ${pageNum}`}
              disabled={disabled}
              onClick={() => handlePageClick(pageNum)}
            >
              {pageNum}
            </button>
          )
        })}
      </div>

      {/* Floating Circular Next Button */}
      <button
        type="button"
        className="agri-pagination-btn agri-pagination-next"
        aria-label="Next page"
        disabled={disabled || safeCurrentPage >= safeTotalPages}
        onClick={handleNext}
      >
        <ChevronRight className="agri-pagination-icon" aria-hidden="true" />
      </button>
    </nav>
  )
}
