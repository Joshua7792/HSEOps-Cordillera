import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, ChevronRight, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { api } from '../api'
import { ComplianceRing } from '../components/ComplianceRing'
import { ConfirmDialog } from '../components/ConfirmDialog'
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

const INPUT = 'w-full rounded border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#f59e0b] focus:outline-none'
const LABEL = 'block text-xs text-[#8b949e] mb-1'

export function WorkersPage() {
  const { t, i18n } = useTranslation()
  const { data, reload } = useDashboard()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [contractorFilter, setContractorFilter] = useState('all')
  const [sort, setSort] = useState<SortMode>('compliance-asc')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Add worker dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addContractorId, setAddContractorId] = useState('')
  const [addJobTitle, setAddJobTitle] = useState('')
  const [addStatus, setAddStatus] = useState('active')
  const [addSaving, setAddSaving] = useState(false)

  // Delete confirm
  const [deleteWorkerName, setDeleteWorkerName] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Lightweight lists for id resolution
  const { data: crudWorkers = [] } = useQuery({
    queryKey: ['crud-workers'],
    queryFn: api.listWorkers,
    staleTime: 60_000,
  })
  const { data: crudContractors = [] } = useQuery({
    queryKey: ['crud-contractors'],
    queryFn: api.listContractors,
    staleTime: 60_000,
  })

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

  async function handleAddWorker() {
    if (!addName.trim() || !addContractorId) return
    setAddSaving(true)
    try {
      await api.createWorker({
        name: addName.trim(),
        contractor_id: Number(addContractorId),
        job_title: addJobTitle.trim() || null,
        status: addStatus,
      })
      toast.success(`Worker "${addName.trim()}" added`)
      setAddOpen(false)
      setAddName('')
      setAddContractorId('')
      setAddJobTitle('')
      setAddStatus('active')
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['crud-workers'] })])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add worker')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleDeleteWorker() {
    if (!deleteWorkerName) return
    const match = crudWorkers.find((w) => w.name === deleteWorkerName)
    if (!match) { toast.error('Worker not found'); return }
    setDeleteLoading(true)
    try {
      await api.deleteWorker(match.id)
      toast.success(`Worker "${deleteWorkerName}" deleted`)
      setDeleteWorkerName(null)
      if (expanded === deleteWorkerName) setExpanded(null)
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['crud-workers'] })])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete worker')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <PageShell
        eyebrow={t('workers.eyebrow')}
        title={t('workers.title')}
        description={t('workers.description')}
        actions={
          <>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-sm text-[#e6edf3] hover:bg-[#30363d]"
            >
              <Plus size={14} />
              {t('crud.add_worker')}
            </button>
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
          </>
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
                    <th className="border-b border-[#30363d] bg-[#161b22] px-3 py-2" />
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
                          <td
                            className="border-b border-[#30363d] px-3 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setDeleteWorkerName(w.worker)}
                              title="Delete worker"
                              className="rounded p-1.5 text-[#8b949e] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${w.worker}-detail`}>
                            <td colSpan={7} className="border-b border-[#30363d] bg-[#0d1117] px-4 py-4">
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

      {/* Add Worker dialog */}
      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-[#e6edf3]">
                {t('crud.add_worker')}
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
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className={LABEL}>{t('crud.contractor_label')} *</label>
                <select
                  className={INPUT}
                  value={addContractorId}
                  onChange={(e) => setAddContractorId(e.target.value)}
                >
                  <option value="">Select contractor…</option>
                  {crudContractors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>{t('crud.job_title_label')}</label>
                <input
                  className={INPUT}
                  value={addJobTitle}
                  onChange={(e) => setAddJobTitle(e.target.value)}
                  placeholder="e.g. Electrician"
                />
              </div>
              <div>
                <label className={LABEL}>{t('crud.status_label')}</label>
                <select
                  className={INPUT}
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value)}
                >
                  <option value="active">{t('crud.status_active')}</option>
                  <option value="onboarding">{t('crud.status_onboarding')}</option>
                  <option value="inactive">{t('crud.status_inactive')}</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm text-[#e6edf3] hover:bg-[#30363d]">
                  {t('crud.cancel')}
                </button>
              </Dialog.Close>
              <button
                onClick={handleAddWorker}
                disabled={addSaving || !addName.trim() || !addContractorId}
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
        open={deleteWorkerName !== null}
        onOpenChange={(open) => { if (!open) setDeleteWorkerName(null) }}
        title={t('crud.delete_worker_title')}
        description={`${t('crud.delete_worker_desc')} Worker: "${deleteWorkerName}"`}
        onConfirm={handleDeleteWorker}
        loading={deleteLoading}
      />
    </>
  )
}
