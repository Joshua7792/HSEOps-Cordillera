import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageShell } from '../components/PageShell'
import { StatusPill } from '../components/StatusPill'
import { useDashboard } from '../context/DashboardContext'
import { formatDate, relativeDays, visualStatus } from '../lib/format'
import type { ExcelVisualStatus } from '../types'

type StatusFilter = 'all' | Extract<ExcelVisualStatus, 'yellow' | 'orange' | 'red'>
type WorkerStatusFilter = 'active' | 'inactive' | 'onboarding' | 'all'
type DaysBucket = 'all' | 'past' | 'le7' | 'le30' | 'le60'
const ACTION_ROWS_PER_PAGE = 15

function isActiveWorkerStatus(status: string | undefined) {
  const normalized = (status ?? 'active').toLowerCase()
  return normalized === 'active'
}

function workerStatusLabel(status: string | undefined, t: ReturnType<typeof useTranslation>['t']) {
  const normalized = (status ?? 'active').toLowerCase()
  if (normalized === 'active') return t('actions.worker_status_active')
  if (normalized === 'onboarding') return t('actions.worker_status_onboarding')
  if (normalized === 'inactive') return t('actions.worker_status_inactive')
  return status ?? t('actions.worker_status_active')
}

export function ActionsPage() {
  const { t, i18n } = useTranslation()
  const { data } = useDashboard()
  const [contractorFilter, setContractorFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [workerStatusFilter, setWorkerStatusFilter] = useState<WorkerStatusFilter>('active')
  const [daysBucket, setDaysBucket] = useState<DaysBucket>('all')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const items = data?.action_list ?? []

  const scopedItems = useMemo(
    () =>
      workerStatusFilter === 'all'
        ? items
        : items.filter((i) => (i.worker_status ?? 'active').toLowerCase() === workerStatusFilter),
    [items, workerStatusFilter],
  )

  const contractors = useMemo(
    () => Array.from(new Set(scopedItems.map((i) => i.contractor))).sort(),
    [scopedItems],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scopedItems.filter((i) => {
      if (contractorFilter !== 'all' && i.contractor !== contractorFilter) return false
      const displayStatus = visualStatus(i.status, i.days_until_anniversary)
      if (statusFilter !== 'all' && displayStatus !== statusFilter) return false
      if (
        q &&
        !i.worker.toLowerCase().includes(q) &&
        !i.cert_name.toLowerCase().includes(q) &&
        !workerStatusLabel(i.worker_status, t).toLowerCase().includes(q)
      ) {
        return false
      }
      const d = i.days_until_anniversary
      if (daysBucket !== 'all') {
        if (d === null || d === undefined) return false
        if (daysBucket === 'past' && d >= 0) return false
        if (daysBucket === 'le7' && (d < 0 || d > 7)) return false
        if (daysBucket === 'le30' && (d < 0 || d > 30)) return false
        if (daysBucket === 'le60' && (d < 0 || d > 60)) return false
      }
      return true
    })
  }, [scopedItems, contractorFilter, statusFilter, daysBucket, search, t])

  const overdueCount = filtered.filter(
    (i) => visualStatus(i.status, i.days_until_anniversary) === 'red',
  ).length
  const urgentCount = filtered.filter(
    (i) => visualStatus(i.status, i.days_until_anniversary) === 'orange',
  ).length
  const yellowCount = filtered.filter(
    (i) => visualStatus(i.status, i.days_until_anniversary) === 'yellow',
  ).length
  const currentPageCount = Math.max(1, Math.ceil(filtered.length / ACTION_ROWS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, currentPageCount)
  const paged = filtered.slice(
    (safeCurrentPage - 1) * ACTION_ROWS_PER_PAGE,
    safeCurrentPage * ACTION_ROWS_PER_PAGE,
  )

  return (
    <PageShell
      eyebrow={t('actions.eyebrow')}
      title={t('actions.title')}
      description={t('actions.description')}
    >
      <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
        {/* Summary row */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('actions.showing')}</p>
            <strong className="text-[#e6edf3]">
              {t('actions.showing_value', { filtered: filtered.length, total: scopedItems.length })}
            </strong>
          </div>
          <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('status.overdue')}</p>
            <strong className="text-[#ef4444]">{overdueCount}</strong>
          </div>
          <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('status.urgent')}</p>
            <strong className="text-[#f97316]">{urgentCount}</strong>
          </div>
          <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('status.renew_soon')}</p>
            <strong className="text-[#eab308]">{yellowCount}</strong>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded border border-[#30363d] bg-[#0d1117] px-3 py-1.5 focus-within:border-[#f59e0b]">
            <Search size={14} className="text-[#8b949e]" />
            <input
              type="search"
              placeholder={t('actions.search_placeholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="min-w-[180px] bg-transparent text-sm text-[#e6edf3] placeholder-[#484f58] outline-none"
            />
          </label>
          <select
            aria-label={t('filter.by_contractor')}
            value={contractorFilter}
            onChange={(e) => {
              setContractorFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
          >
            <option value="all">{t('actions.filter_contractor_all')}</option>
            {contractors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label={t('filter.by_worker_status')}
            value={workerStatusFilter}
            onChange={(e) => {
              setWorkerStatusFilter(e.target.value as WorkerStatusFilter)
              setCurrentPage(1)
            }}
            className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
          >
            <option value="active">{t('actions.filter_worker_status_active')}</option>
            <option value="inactive">{t('actions.filter_worker_status_inactive')}</option>
            <option value="onboarding">{t('actions.filter_worker_status_onboarding')}</option>
            <option value="all">{t('actions.filter_worker_status_all')}</option>
          </select>
          <select
            aria-label={t('filter.by_cert_status')}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter)
              setCurrentPage(1)
            }}
            className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
          >
            <option value="all">{t('actions.filter_status_all')}</option>
            <option value="red">{t('actions.filter_status_red')}</option>
            <option value="orange">{t('actions.filter_status_orange')}</option>
            <option value="yellow">{t('actions.filter_status_yellow')}</option>
          </select>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', t('actions.filter_days_any')],
                ['past', t('actions.filter_days_past')],
                ['le7', t('actions.filter_days_le7')],
                ['le30', t('actions.filter_days_le30')],
                ['le60', t('actions.filter_days_le60')],
              ] as [DaysBucket, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  daysBucket === key
                    ? 'bg-[#f59e0b] text-[#0d1117]'
                    : 'bg-[#1c2128] text-[#8b949e] hover:bg-[#30363d] hover:text-[#e6edf3]'
                }`}
                onClick={() => {
                  setDaysBucket(key)
                  setCurrentPage(1)
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-4 text-sm text-[#8b949e]">{t('actions.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {[
                    t('actions.col_status'),
                    t('actions.col_worker'),
                    t('actions.col_contractor'),
                    t('actions.col_cert'),
                    t('actions.col_completed'),
                    t('actions.col_anniversary'),
                    t('actions.col_days'),
                  ].map((col) => (
                    <th
                      key={col}
                      className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((item, idx) => (
                  <tr
                    key={`${item.worker}-${item.cert_name}-${idx}`}
                    className="transition-colors hover:bg-[#1c2128]"
                  >
                    <td className="border-b border-[#30363d] px-3 py-3">
                      <StatusPill status={visualStatus(item.status, item.days_until_anniversary)} />
                    </td>
                    <td className="border-b border-[#30363d] px-3 py-3">
                      <strong className="block text-[#e6edf3]">{item.worker}</strong>
                      <span
                        className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          isActiveWorkerStatus(item.worker_status)
                            ? 'bg-[#22c55e]/10 text-[#22c55e]'
                            : 'bg-[#484f58]/20 text-[#8b949e]'
                        }`}
                      >
                        {workerStatusLabel(item.worker_status, t)}
                      </span>
                    </td>
                    <td className="border-b border-[#30363d] px-3 py-3 text-[#8b949e]">
                      {item.contractor}
                    </td>
                    <td className="border-b border-[#30363d] px-3 py-3">
                      <span className="block text-[#e6edf3]">{item.cert_name}</span>
                      <span className="text-xs text-[#8b949e]">{item.cert_category}</span>
                    </td>
                    <td className="border-b border-[#30363d] px-3 py-3 text-[#8b949e]">
                      {formatDate(item.completed_on, i18n.language)}
                    </td>
                    <td className="border-b border-[#30363d] px-3 py-3 text-[#8b949e]">
                      {formatDate(item.anniversary, i18n.language)}
                    </td>
                    <td className="border-b border-[#30363d] px-3 py-3 font-medium text-[#e6edf3]">
                      {relativeDays(item.days_until_anniversary, t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentPageCount > 1 && (
              <div
                className="mt-4 flex flex-wrap gap-1.5"
                aria-label={t('pagination.label')}
              >
                {Array.from({ length: currentPageCount }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                      safeCurrentPage === page
                        ? 'bg-[#f59e0b] text-[#0d1117]'
                        : 'bg-[#1c2128] text-[#8b949e] hover:bg-[#30363d] hover:text-[#e6edf3]'
                    }`}
                    onClick={() => setCurrentPage(page)}
                    aria-current={safeCurrentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </PageShell>
  )
}
