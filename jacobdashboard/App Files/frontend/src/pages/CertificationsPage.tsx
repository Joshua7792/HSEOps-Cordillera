import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { api } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageShell } from '../components/PageShell'
import { StatusPill, StatusStackedBar } from '../components/StatusPill'
import { useDashboard } from '../context/DashboardContext'
import { formatDate, relativeDays } from '../lib/format'

type SortMode = 'coverage-asc' | 'coverage-desc' | 'name' | 'urgent-desc'
type WorkerStatusFilter = 'active' | 'inactive' | 'onboarding' | 'all'
const CURRENT_ROWS_PER_PAGE = 15
const INPUT = 'w-full rounded border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#f59e0b] focus:outline-none'
const LABEL = 'block text-xs text-[#8b949e] mb-1'

type CurrentCertRow = {
  contractor: string
  worker: string
  worker_status: string
  cert_name: string
  cert_category: string
  completed_on: string | null
  anniversary: string | null
  days_until_anniversary: number | null
}

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

export function CertificationsPage() {
  const { t, i18n } = useTranslation()
  const { data, reload } = useDashboard()
  const queryClient = useQueryClient()
  const [sort, setSort] = useState<SortMode>('coverage-asc')

  // Add cert dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [addValidity, setAddValidity] = useState('1')
  const [addSaving, setAddSaving] = useState(false)

  // Delete confirm
  const [deleteCertName, setDeleteCertName] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { data: crudCerts = [] } = useQuery({
    queryKey: ['crud-certs'],
    queryFn: api.listCerts,
    staleTime: 60_000,
  })
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [contractorFilter, setContractorFilter] = useState('all')
  const [workerStatusFilter, setWorkerStatusFilter] = useState<WorkerStatusFilter>('active')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const certs = data?.cert_demand ?? []
  const currentRows = useMemo<CurrentCertRow[]>(
    () =>
      (data?.workers ?? []).flatMap((worker) =>
        worker.certs
          .filter((cert) => cert.status === 'green')
          .map((cert) => ({
            contractor: worker.contractor,
            worker: worker.name,
            worker_status: worker.status,
            cert_name: cert.cert_name,
            cert_category: cert.cert_category,
            completed_on: cert.completed_on,
            anniversary: cert.anniversary,
            days_until_anniversary: cert.days_until_anniversary,
          })),
      ),
    [data?.workers],
  )

  const scopedCurrentRows = useMemo(
    () =>
      workerStatusFilter === 'all'
        ? currentRows
        : currentRows.filter(
            (row) => (row.worker_status ?? 'active').toLowerCase() === workerStatusFilter,
          ),
    [currentRows, workerStatusFilter],
  )

  const currentContractors = useMemo(
    () => Array.from(new Set(scopedCurrentRows.map((row) => row.contractor))).sort(),
    [scopedCurrentRows],
  )

  const filteredCurrentRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scopedCurrentRows.filter((row) => {
      if (contractorFilter !== 'all' && row.contractor !== contractorFilter) return false
      if (
        q &&
        !row.worker.toLowerCase().includes(q) &&
        !row.cert_name.toLowerCase().includes(q) &&
        !workerStatusLabel(row.worker_status, t).toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [scopedCurrentRows, contractorFilter, search, t])

  const filteredCurrentWorkers = useMemo(
    () => new Set(filteredCurrentRows.map((row) => row.worker)).size,
    [filteredCurrentRows],
  )
  const filteredCurrentContractors = useMemo(
    () => new Set(filteredCurrentRows.map((row) => row.contractor)).size,
    [filteredCurrentRows],
  )
  const currentPageCount = Math.max(
    1,
    Math.ceil(filteredCurrentRows.length / CURRENT_ROWS_PER_PAGE),
  )
  const safeCurrentPage = Math.min(currentPage, currentPageCount)
  const pagedCurrentRows = filteredCurrentRows.slice(
    (safeCurrentPage - 1) * CURRENT_ROWS_PER_PAGE,
    safeCurrentPage * CURRENT_ROWS_PER_PAGE,
  )

  const categories = useMemo(
    () => Array.from(new Set(certs.map((c) => c.cert_category))).sort(),
    [certs],
  )

  const sorted = useMemo(() => {
    let list = certs
    if (categoryFilter !== 'all') {
      list = list.filter((c) => c.cert_category === categoryFilter)
    }
    const copy = [...list]
    switch (sort) {
      case 'coverage-asc':
        copy.sort((a, b) => a.coverage_pct - b.coverage_pct)
        break
      case 'coverage-desc':
        copy.sort((a, b) => b.coverage_pct - a.coverage_pct)
        break
      case 'urgent-desc':
        copy.sort((a, b) => b.red - a.red)
        break
      case 'name':
        copy.sort((a, b) => a.cert_name.localeCompare(b.cert_name))
        break
    }
    return copy
  }, [certs, sort, categoryFilter])

  async function handleAddCert() {
    if (!addName.trim()) return
    setAddSaving(true)
    try {
      await api.createCert({
        name: addName.trim(),
        category: addCategory.trim() || null,
        validity_years: addValidity ? Number(addValidity) : 1,
      })
      toast.success(`Certification "${addName.trim()}" added`)
      setAddOpen(false)
      setAddName('')
      setAddCategory('')
      setAddValidity('1')
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['crud-certs'] })])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add certification')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleDeleteCert() {
    if (!deleteCertName) return
    const match = crudCerts.find((c) => c.name === deleteCertName)
    if (!match) { toast.error('Certification not found'); return }
    setDeleteLoading(true)
    try {
      await api.deleteCert(match.id)
      toast.success(`Certification "${deleteCertName}" deleted`)
      setDeleteCertName(null)
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['crud-certs'] })])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete certification')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
    <PageShell
      eyebrow={t('certifications.eyebrow')}
      title={t('certifications.title')}
      description={t('certifications.description')}
      actions={
        <>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-sm text-[#e6edf3] hover:bg-[#30363d]"
          >
            <Plus size={14} />
            {t('crud.add_cert')}
          </button>
          <select
            aria-label={t('filter.by_category')}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
          >
            <option value="all">{t('certifications.filter_category_all')}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label={t('filter.sort_certs')}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
          >
            <option value="coverage-asc">{t('certifications.sort_coverage_asc')}</option>
            <option value="coverage-desc">{t('certifications.sort_coverage_desc')}</option>
            <option value="urgent-desc">{t('certifications.sort_urgent_desc')}</option>
            <option value="name">{t('certifications.sort_name')}</option>
          </select>
        </>
      }
    >
      {sorted.length === 0 ? (
        <p className="py-4 text-sm text-[#8b949e]">{t('certifications.empty')}</p>
      ) : (
        <>
          {/* Current certifications section */}
          <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
            <header className="mb-4">
              <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                {t('certifications.current_eyebrow')}
              </p>
              <h3 className="text-base font-semibold text-[#e6edf3]">
                {t('certifications.current_title')}
              </h3>
            </header>

            {/* Summary row */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('actions.showing')}</p>
                <strong className="text-[#e6edf3]">
                  {t('actions.showing_value', {
                    filtered: filteredCurrentRows.length,
                    total: scopedCurrentRows.length,
                  })}
                </strong>
              </div>
              <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('status.current')}</p>
                <strong className="text-[#22c55e]">{filteredCurrentRows.length}</strong>
              </div>
              <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('app.stat_workers')}</p>
                <strong className="text-[#e6edf3]">{filteredCurrentWorkers}</strong>
              </div>
              <div className="rounded border border-[#30363d] bg-[#1c2128] px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-[#8b949e]">{t('app.stat_contractors')}</p>
                <strong className="text-[#e6edf3]">{filteredCurrentContractors}</strong>
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
                {currentContractors.map((contractor) => (
                  <option key={contractor} value={contractor}>
                    {contractor}
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
            </div>

            {filteredCurrentRows.length === 0 ? (
              <p className="py-4 text-sm text-[#8b949e]">{t('certifications.current_empty')}</p>
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
                    {pagedCurrentRows.map((item, idx) => (
                      <tr
                        key={`${item.worker}-${item.cert_name}-${idx}`}
                        className="transition-colors hover:bg-[#1c2128]"
                      >
                        <td className="border-b border-[#30363d] px-3 py-3">
                          <StatusPill status="green" />
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
                  <div className="mt-4 flex flex-wrap gap-1.5" aria-label={t('pagination.label')}>
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

          {/* Full cert catalog section */}
          <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
            <header className="mb-4">
              <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                {t('certifications.list_eyebrow')}
              </p>
              <h3 className="text-base font-semibold text-[#e6edf3]">
                {t('certifications.list_title', { count: sorted.length })}
              </h3>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                      {t('certifications.col_cert')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                      {t('certifications.col_category')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                      {t('certifications.col_status_mix')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#22c55e]">
                      {t('certifications.col_current')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#eab308]">
                      {t('certifications.col_soon')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#ef4444]">
                      {t('certifications.col_urgent')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                      {t('certifications.col_missing')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2 text-left text-xs uppercase tracking-wider text-[#8b949e]">
                      {t('certifications.col_coverage')}
                    </th>
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => (
                    <tr key={c.cert_name} className="transition-colors hover:bg-[#1c2128]">
                      <td className="border-b border-[#30363d] px-3 py-3">
                        <strong className="text-[#e6edf3]">{c.cert_name}</strong>
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3 text-[#8b949e]">
                        {c.cert_category}
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3">
                        <StatusStackedBar
                          green={c.green}
                          yellow={c.yellow}
                          red={c.red}
                          blank={c.blank}
                        />
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3 text-[#e6edf3]">
                        {c.green}
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3 text-[#e6edf3]">
                        {c.yellow}
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3 text-[#e6edf3]">
                        {c.red}
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3 text-[#e6edf3]">
                        {c.blank}
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3">
                        <strong className="text-[#e6edf3]">{c.coverage_pct.toFixed(0)}%</strong>
                      </td>
                      <td className="border-b border-[#30363d] px-3 py-3">
                        <button
                          onClick={() => setDeleteCertName(c.cert_name)}
                          title="Delete certification"
                          className="rounded p-1.5 text-[#8b949e] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageShell>

    {/* Add Cert dialog */}
    <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-[#e6edf3]">
              {t('crud.add_cert')}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[#8b949e] hover:text-[#e6edf3]">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className={LABEL}>{t('crud.name_label')} *</label>
              <input
                className={INPUT}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. First Aid"
              />
            </div>
            <div>
              <label className={LABEL}>{t('crud.category_label')}</label>
              <input
                className={INPUT}
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                placeholder="e.g. Safety, Technical"
              />
            </div>
            <div>
              <label className={LABEL}>{t('crud.validity_years_label')}</label>
              <input
                type="number"
                min="1"
                max="10"
                className={INPUT}
                value={addValidity}
                onChange={(e) => setAddValidity(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button className="rounded border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm text-[#e6edf3] hover:bg-[#30363d]">
                {t('crud.cancel')}
              </button>
            </Dialog.Close>
            <button
              onClick={handleAddCert}
              disabled={addSaving || !addName.trim()}
              className="rounded bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#0d1117] hover:bg-[#d97706] disabled:opacity-50"
            >
              {addSaving ? t('crud.saving') : t('crud.save')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    {/* Delete confirm */}
    <ConfirmDialog
      open={deleteCertName !== null}
      onOpenChange={(open) => { if (!open) setDeleteCertName(null) }}
      title={t('crud.delete_cert_title')}
      description={`${t('crud.delete_cert_desc')} Cert: "${deleteCertName}"`}
      onConfirm={handleDeleteCert}
      loading={deleteLoading}
    />
    </>
  )
}
