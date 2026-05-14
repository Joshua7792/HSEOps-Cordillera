import * as Dialog from '@radix-ui/react-dialog'
import { Building2, FileText, LayoutDashboard, Search, Settings, Upload, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDashboard } from '../context/DashboardContext'

type Item = {
  id: string
  label: string
  sub: string
  icon: React.ReactNode
  action: () => void
}

const NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: <LayoutDashboard size={14} /> },
  { label: 'Workers', path: '/workers', icon: <Users size={14} /> },
  { label: 'Contractors', path: '/contractors', icon: <Building2 size={14} /> },
  { label: 'Action Center', path: '/actions', icon: <FileText size={14} /> },
  { label: 'Heatmap', path: '/heatmap', icon: <LayoutDashboard size={14} /> },
  { label: 'Certifications', path: '/certifications', icon: <FileText size={14} /> },
  { label: 'Import PDFs', path: '/import', icon: <Upload size={14} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={14} /> },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data } = useDashboard()

  // Global Cmd/Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Reset query + selection on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase()

    const navItems: Item[] = NAV_ITEMS.map((n) => ({
      id: `nav-${n.path}`,
      label: n.label,
      sub: 'Navigate',
      icon: n.icon,
      action: () => { navigate(n.path); setOpen(false) },
    }))

    const workerItems: Item[] =
      data?.workers?.map((w) => ({
        id: `worker-${w.name}`,
        label: w.name,
        sub: `Worker · ${w.contractor}`,
        icon: <Users size={14} />,
        action: () => { navigate('/workers'); setOpen(false) },
      })) ?? []

    const contractorItems: Item[] =
      data?.contractors?.map((c) => ({
        id: `contractor-${c.name}`,
        label: c.name,
        sub: `Contractor · ${c.worker_count} workers`,
        icon: <Building2 size={14} />,
        action: () => { navigate('/contractors'); setOpen(false) },
      })) ?? []

    const all = [...navItems, ...workerItems, ...contractorItems]
    if (!q) return all
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sub.toLowerCase().includes(q),
    )
  }, [query, data, navigate])

  // Keep active index in bounds when results change
  useEffect(() => {
    setActiveIdx((prev) => Math.min(prev, Math.max(0, items.length - 1)))
  }, [items])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((prev) => Math.min(prev + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[activeIdx]?.action()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl focus:outline-none"
          onKeyDown={handleKeyDown}
          aria-label="Command palette"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-[#30363d] px-4 py-3">
            <Search size={16} className="shrink-0 text-[#8b949e]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
              placeholder="Search pages, workers, contractors…"
              className="flex-1 bg-transparent text-sm text-[#e6edf3] placeholder-[#484f58] outline-none"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[#8b949e] hover:text-[#e6edf3]"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Results */}
          <ul className="max-h-80 overflow-y-auto py-2" role="listbox">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[#8b949e]">No results</li>
            ) : (
              items.map((item, idx) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={activeIdx === idx}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${
                    activeIdx === idx
                      ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
                      : 'text-[#e6edf3] hover:bg-[#1c2128]'
                  }`}
                  onClick={item.action}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className={activeIdx === idx ? 'text-[#f59e0b]' : 'text-[#8b949e]'}>
                    {item.icon}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-[#8b949e]">{item.sub}</span>
                  </div>
                  {activeIdx === idx && (
                    <kbd className="ml-auto rounded border border-[#30363d] bg-[#1c2128] px-1.5 py-0.5 text-xs text-[#8b949e]">
                      ↵
                    </kbd>
                  )}
                </li>
              ))
            )}
          </ul>

          {/* Footer hint */}
          <div className="border-t border-[#30363d] px-4 py-2 text-xs text-[#484f58]">
            <kbd className="rounded border border-[#30363d] px-1">↑↓</kbd> navigate ·{' '}
            <kbd className="rounded border border-[#30363d] px-1">↵</kbd> select ·{' '}
            <kbd className="rounded border border-[#30363d] px-1">esc</kbd> close
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
