import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ComplianceRing } from '../components/ComplianceRing'
import { PageShell } from '../components/PageShell'
import { StatusPill, StatusStackedBar } from '../components/StatusPill'
import { useDashboard } from '../context/DashboardContext'
import { formatDate, relativeDays, visualStatus } from '../lib/format'
import type { ExcelStatus } from '../types'

type SortMode = 'compliance-asc' | 'compliance-desc' | 'name' | 'urgent-desc'

type WorkerRow = {
  worker: string
  contractor: string
  jobTitle: string | null
  green: number
  yellow: number
  red: number
  blank: number
  total: number
  compliancePct: number
  certs: {
    name: string
    category: string
    status: ExcelStatus
    completedOn: string | null
    days: number | null
  }[]
}

const TILE_CLASSES: Record<string, string> = {
  green: 'border-[#22c55e] bg-[#22c55e]/10',
  yellow: 'border-[#eab308] bg-[#eab308]/10',
  orange: 'border-[#f97316] bg-[#f97316]/10',
  red: 'border-[#ef4444] bg-[#ef4444]/10',
  blank: 'border-[#30363d] bg-[#1c2128]',
}

export function WorkersPage() {
  const { t, i18n } = useTranslation()
  const { data } = useDashboard()
  const [search, setSearch] = useState('')
  const [contractorFilter, setContractorFilter] = useState('all')
  const [sort, setSort] = useState<SortMode>('compliance-asc')
  const [expanded, setExpanded] = useState<string | null>(null)

  const workers: WorkerRow[] = useMemo(() => {
    if (!data) return []
    const heatmap = data.heatmap
    return heatmap.rows.map((row) => {
      let g = 0, y = 0, r = 0, b = 0
      const certs = row.statuses.map((cell, idx) => {
        if (cell.status === 'green') g++
        else if (cell.status === 'yellow') y++
        else if (cell.status === 'red') r++
        else b++
        return {
          name: heatmap.cert_names[idx],
          category: heatmap.cert_categories[idx],
          status: cell.status,
          completedOn: cell.completed_on,
          days: cell.days_until_anniversary,
        }
      })
      const dated = g + y + r
      return {
        worker: row.worker,
        contractor: row.contractor,
        jobTitle: row.job_title,
        green: g,
        yellow: y,
        red: r,
        blank: b,
        total: certs.length,
        compliancePct: dated > 0 ? (g / dated) * 100 : 0,
        certs,
      }
    })
  }, [data])

  const contractors = useMemo(
    () => Array.from(new Set(workers.map((w) => w.contractor))).sort(),
    [workers],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = workers
    if (contractorFilter !== 'all') {
      list = list.filter((w) => w.contractor === contractorFilter)
    }
    if (q) {
      list = list.filter(
        (w) =>
          w.worker.toLowerCase().includes(q) ||
          w.contractor.toLowerCase().includes(q),
      )
    }
    const copy = [...list]
    switch (sort) {
      case 'compliance-asc':
        copy.sort((a, b) => a.compliancePct - b.compliancePct)
        break
      case 'compliance-desc':
        copy.sort((a, b) => b.compliancePct - a.compliancePct)
        break
      case 'name':
        copy.sort((a, b) => a.worker.localeCompare(b.worker))
        break
      case 'urgent-desc':
        copy.sort((a, b) => b.red - a.red)
        break
    }
    return copy
  }, [workers, search, contractorFilter, sort])

  return (
    <PageShell
      eyebrow={t('workers.eyebrow')}
      title={t('workers.title')}
      description={t('workers.description')}
      actions={
        <select
          aria-label={t('filter.sort_workers')}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
        >
          <option value="compliance-asc">{t('workers.sort_compliance_asc')}</option>
          <option value="compliance-desc">{t('workers.sort_compliance_desc')}</option>
          <option value="urgent-desc">{t('workers.sort_urgent_desc')}</option>
          <option value="name">{t('workers.sort_name')}</option>
        </select>
      }
    >
      <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded border border-[#30363d] bg-[#0d1117] px-3 py-1.5 focus-within:border-[#f59e0b]">
            <Search size={14} className="text-[#8b949e]" />
            <input
              type="search"
              placeholder={t('workers.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[180px] bg-transparent text-sm text-[#e6edf3] placeholder-[#484f58] outline-none"
            />
          </label>
          <select
            aria-label={t('filter.by_contractor')}
            value={contractorFilter}
            onChange={(e) => setContractorFilter(e.target.value)}
            className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
          >
            <option value="all">{t('actions.filter_contractor_all')}</option>
            {contractors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-[#8b949e]">
            {t('workers.result_count', { filtered: filtered.length, total: workers.length })}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="py-4 text-sm text-[#8b949e]">{t('workers.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                    <span className="sr-only">{t('workers.expand_row')}</span>
                  </th>
                  <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                    {t('workers.col_worker')}
                  </th>
                  <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                    {t('workers.col_contractor')}
                  </th>
                  <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                    {t('workers.col_compliance')}
                  </th>
                  <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                    {t('workers.col_status_mix')}
                  </th>
                  <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                    {t('workers.col_urgent')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const isOpen = expanded === w.worker
                  return (
                    <>
                      <tr
                        key={w.worker}
                        className={`cursor-pointer transition-colors hover:bg-[#1c2128] ${isOpen ? 'bg-[#1c2128]' : ''}`}
                        onClick={() => setExpanded(isOpen ? null : w.worker)}
                      >
                        <td className="border-b border-[#30363d] px-3 py-3 text-[#8b949e]">
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td className="border-b border-[#30363d] px-3 py-3">
                          <strong className="block text-[#e6edf3]">{w.worker}</strong>
                          {w.jobTitle && (
                            <small className="text-xs text-[#8b949e]">{w.jobTitle}</small>
                          )}
                        </td>
                        <td className="border-b border-[#30363d] px-3 py-3 text-[#e6edf3]">
                          {w.contractor}
                        </td>
                        <td className="border-b border-[#30363d] px-3 py-3">
                          <div className="flex items-center gap-2">
                            <ComplianceRing pct={w.compliancePct} size={36} />
                            <div className="flex flex-col">
                              <strong className="text-sm text-[#e6edf3]">
                                {w.compliancePct.toFixed(0)}%
                              </strong>
                              <small className="text-xs text-[#8b949e]">
                                {t('workers.dated_label', {
                                  green: w.green,
                                  total: w.green + w.yellow + w.red,
                                })}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-[#30363d] px-3 py-3">
                          <StatusStackedBar
                            green={w.green}
                            yellow={w.yellow}
                            red={w.red}
                            blank={w.blank}
                          />
                        </td>
                        <td
                          className={`border-b border-[#30363d] px-3 py-3 font-medium ${w.red > 0 ? 'text-[#ef4444]' : 'text-[#e6edf3]'}`}
                        >
                          {w.red}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${w.worker}-detail`}>
                          <td colSpan={6} className="border-b border-[#30363d] bg-[#0d1117] px-4 py-4">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                              {w.certs.map((c) => {
                                const visual = visualStatus(c.status, c.days)
                                return (
                                  <div
                                    key={c.name}
                                    className={`rounded border p-3 ${TILE_CLASSES[visual] ?? 'border-[#30363d] bg-[#1c2128]'}`}
                                  >
                                    <div className="mb-1 flex items-start justify-between gap-2">
                                      <strong className="text-xs leading-tight text-[#e6edf3]">
                                        {c.name}
                                      </strong>
                                      <StatusPill status={visual} />
                                    </div>
                                    <div className="flex flex-col gap-0.5 text-xs text-[#8b949e]">
                                      <span>{c.category}</span>
                                      <span>
                                        {c.completedOn
                                          ? t('workers.completed_on', {
                                              date: formatDate(c.completedOn, i18n.language),
                                            })
                                          : t('workers.no_date')}
                                      </span>
                                      <span>{relativeDays(c.days, t)}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  )
}
