import { ChevronRight } from 'lucide-react'

// items: [{ label, href }] — the last item is the current page and renders as plain text.
// Styles live in styles/Buyer/deliveryProgress.css (on phones only the parent link shows).
export default function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {isLast
                ? <span aria-current="page">{item.label}</span>
                : <a href={item.href}>{item.label}</a>}
              {!isLast && <ChevronRight aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
