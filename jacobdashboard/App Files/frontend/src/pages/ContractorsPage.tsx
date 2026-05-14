import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Mail, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { api } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageShell } from '../components/PageShell'
import { StatusStackedBar } from '../components/StatusPill'
import { useDashboard } from '../context/DashboardContext'

type SortMode = 'compliance-asc' | 'compliance-desc' | 'workers-desc' | 'name'

const INPUT = 'w-full rounded border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:border-[#f59e0b] focus:outline-none'
const LABEL = 'block text-xs text-[#8b949e] mb-1'

export function ContractorsPage() {
  const { t } = useTranslation()
  const { data, reload } = useDashboard()
  const queryClient = useQueryClient()
  const [sort, setSort] = useState<SortMode>('compliance-asc')
  const contractors = data?.contractors ?? []

  // Add contractor dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addSpecialty, setAddSpecialty] = useState('')
  const [addContact, setAddContact] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  // Delete confirm
  const [deleteContractorName, setDeleteContractorName] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { data: crudContractors = [] } = useQuery({
    queryKey: ['crud-contractors'],
    queryFn: api.listContractors,
    staleTime: 60_000,
  })

  const sorted = useMemo(() => {
    const copy = [...contractors]
    switch (sort) {
      case 'compliance-asc':
        copy.sort((a, b) => a.compliance_pct - b.compliance_pct)
        break
      case 'compliance-desc':
        copy.sort((a, b) => b.compliance_pct - a.compliance_pct)
        break
      case 'workers-desc':
        copy.sort((a, b) => b.worker_count - a.worker_count)
        break
      case 'name':
        copy.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    return copy
  }, [contractors, sort])

  async function handleAddContractor() {
    if (!addName.trim()) return
    setAddSaving(true)
    try {
      await api.createContractor({
        name: addName.trim(),
        specialty: addSpecialty.trim() || null,
        primary_contact: addContact.trim() || null,
      })
      toast.success(`Contractor "${addName.trim()}" added`)
      setAddOpen(false)
      setAddName('')
      setAddSpecialty('')
      setAddContact('')
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['crud-contractors'] })])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contractor')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleDeleteContractor() {
    if (!deleteContractorName) return
    const match = crudContractors.find((c) => c.name === deleteContractorName)
    if (!match) { toast.error('Contractor not found'); return }
    setDeleteLoading(true)
    try {
      await api.deleteContractor(match.id)
      toast.success(`Contractor "${deleteContractorName}" deleted`)
      setDeleteContractorName(null)
      await Promise.all([reload(), queryClient.invalidateQueries({ queryKey: ['crud-contractors'] })])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contractor')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <PageShell
        eyebrow={t('contractors.eyebrow')}
        title={t('contractors.title')}
        description={t('contractors.description')}
        actions={
          <>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-sm text-[#e6edf3] hover:bg-[#30363d]"
            >
              <Plus size={14} />
              {t('crud.add_contractor')}
            </button>
            <select
              aria-label={t('filter.sort_contractors')}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded border border-[#30363d] bg-[#161b22] px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="compliance-asc">{t('contractors.sort_compliance_asc')}</option>
              <option value="compliance-desc">{t('contractors.sort_compliance_desc')}</option>
              <option value="workers-desc">{t('contractors.sort_workers_desc')}</option>
              <option value="name">{t('contractors.sort_name')}</option>
            </select>
          </>
        }
      >
        {sorted.length === 0 ? (
          <p className="py-4 text-sm text-[#8b949e]">{t('contractors.empty')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((c) => {
              const borderLeft =
                c.compliance_pct >= 90
                  ? 'border-l-[#22c55e]'
                  : c.compliance_pct >= 70
                    ? 'border-l-[#eab308]'
                    : 'border-l-[#ef4444]'
              return (
                <article
                  key={c.name}
                  className={`flex flex-col gap-4 rounded-lg border border-[#30363d] border-l-4 ${borderLeft} bg-[#161b22] p-5`}
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                        {c.specialty ?? t('contractors.default_specialty')}
                      </p>
                      <h3 className="text-base font-semibold text-[#e6edf3]">{c.name}</h3>
                    </div>
                    <button
                      onClick={() => setDeleteContractorName(c.name)}
                      title="Delete contractor"
                      className="rounded p-1.5 text-[#8b949e] hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </header>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8b949e]">
                        {t('contractors.card_workers')}
                      </p>
                      <strong className="text-[#e6edf3]">{c.worker_count}</strong>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8b949e]">
                        {t('contractors.card_current')}
                      </p>
                      <strong className="text-[#22c55e]">{c.green_count}</strong>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8b949e]">
                        {t('contractors.card_soon')}
                      </p>
                      <strong className="text-[#eab308]">{c.yellow_count}</strong>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8b949e]">
                        {t('contractors.card_urgent')}
                      </p>
                      <strong className="text-[#ef4444]">{c.red_count}</strong>
                    </div>
                  </div>

                  <StatusStackedBar
                    green={c.green_count}
                    yellow={c.yellow_count}
                    red={c.red_count}
                    blank={c.blank_count}
                    showLabels
                  />

                  <div className="flex flex-col gap-1.5 text-sm">
                    {c.weakest_cert && (
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wider text-[#8b949e]">
                          {t('contractors.weakest')}
                        </span>
                        <strong className="text-[#e6edf3]">{c.weakest_cert}</strong>
                      </div>
                    )}
                    {c.primary_contact && (
                      <p className="flex items-center gap-1.5 text-[#8b949e]">
                        <Mail size={12} /> {c.primary_contact}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </PageShell>

      {/* Add Contractor dialog */}
      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="text-base font-semibold text-[#e6edf3]">
                {t('crud.add_contractor')}
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
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className={LABEL}>{t('crud.specialty_label')}</label>
                <input
                  className={INPUT}
                  value={addSpecialty}
                  onChange={(e) => setAddSpecialty(e.target.value)}
                  placeholder="e.g. Electrical, Civil"
                />
              </div>
              <div>
                <label className={LABEL}>{t('crud.primary_contact_label')}</label>
                <input
                  className={INPUT}
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value)}
                  placeholder="Contact name or email"
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
                onClick={handleAddContractor}
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
        open={deleteContractorName !== null}
        onOpenChange={(open) => { if (!open) setDeleteContractorName(null) }}
        title={t('crud.delete_contractor_title')}
        description={`${t('crud.delete_contractor_desc')} Contractor: "${deleteContractorName}"`}
        onConfirm={handleDeleteContractor}
        loading={deleteLoading}
      />
    </>
  )
}
