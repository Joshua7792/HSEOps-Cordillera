import { Mail, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageShell } from '../components/PageShell'
import { StatusStackedBar } from '../components/StatusPill'
import { useDashboard } from '../context/DashboardContext'

type SortMode = 'compliance-asc' | 'compliance-desc' | 'workers-desc' | 'name'

export function ContractorsPage() {
  const { t } = useTranslation()
  const { data } = useDashboard()
  const [sort, setSort] = useState<SortMode>('compliance-asc')
  const contractors = data?.contractors ?? []

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

  return (
    <PageShell
      eyebrow={t('contractors.eyebrow')}
      title={t('contractors.title')}
      description={t('contractors.description')}
      actions={
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
                <header>
                  <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                    {c.specialty ?? t('contractors.default_specialty')}
                  </p>
                  <h3 className="text-base font-semibold text-[#e6edf3]">{c.name}</h3>
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
                  {c.notes && (
                    <p className="flex items-center gap-1.5 text-[#8b949e]">
                      <Phone size={12} /> {c.notes}
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
