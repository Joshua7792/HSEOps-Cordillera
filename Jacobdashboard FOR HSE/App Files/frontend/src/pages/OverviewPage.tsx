import { ArrowRight, TrendingDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { KPIStrip } from '../components/KPIStrip'
import { PageShell } from '../components/PageShell'
import { StatusPill, StatusStackedBar } from '../components/StatusPill'
import { useDashboard } from '../context/DashboardContext'
import { STATUS_COLOR, formatDate, relativeDays, visualStatus } from '../lib/format'

export function OverviewPage() {
  const { t, i18n } = useTranslation()
  const { data } = useDashboard()
  if (!data) return null

  const { kpis, action_list, contractors, cert_demand, issues } = data

  const donutData = [
    { name: t('status.current'), value: kpis.green_count, key: 'green' as const },
    { name: t('status.renew_soon'), value: kpis.yellow_count, key: 'yellow' as const },
    { name: t('status.urgent'), value: kpis.red_count, key: 'red' as const },
    { name: t('status.missing'), value: kpis.blank_count, key: 'blank' as const },
  ].filter((d) => d.value > 0)
  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0)

  const weakestContractors = [...contractors]
    .sort((a, b) => a.compliance_pct - b.compliance_pct)
    .slice(0, 5)

  const weakestCerts = [...cert_demand]
    .sort((a, b) => a.coverage_pct - b.coverage_pct)
    .slice(0, 5)

  const topActions = action_list.slice(0, 5)

  return (
    <PageShell
      eyebrow={t('overview.eyebrow')}
      title={t('overview.title')}
      description={t('overview.description')}
    >
      <KPIStrip kpis={kpis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Compliance donut */}
        <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
          <header className="mb-4">
            <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
              {t('overview.compliance_eyebrow')}
            </p>
            <h3 className="text-base font-semibold text-[#e6edf3]">{t('overview.compliance_title')}</h3>
          </header>
          {donutTotal === 0 ? (
            <p className="py-4 text-sm text-[#8b949e]">{t('overview.compliance_empty')}</p>
          ) : (
            <div className="flex flex-col items-center gap-4 lg:flex-row">
              <div className="w-full">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={56}
                      outerRadius={92}
                      paddingAngle={2}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.key} fill={STATUS_COLOR[d.key]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex shrink-0 flex-col gap-2 text-sm">
                {donutData.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span
                      style={{ background: STATUS_COLOR[d.key] }}
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    />
                    <span className="text-[#e6edf3]">{d.name}</span>
                    <strong className="ml-1 text-[#e6edf3]">{d.value}</strong>
                    <span className="text-xs text-[#8b949e]">
                      {((d.value / donutTotal) * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Contractor leaderboard */}
        <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                {t('overview.leaderboard_eyebrow')}
              </p>
              <h3 className="text-base font-semibold text-[#e6edf3]">{t('overview.leaderboard_title')}</h3>
            </div>
            <Link
              to="/contractors"
              className="flex items-center gap-1 text-sm text-[#f59e0b] hover:text-[#fbbf24]"
            >
              {t('overview.see_all')} <ArrowRight size={14} />
            </Link>
          </header>
          {weakestContractors.length === 0 ? (
            <p className="py-4 text-sm text-[#8b949e]">{t('overview.leaderboard_empty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#30363d]">
              {weakestContractors.map((c) => {
                const workersLabel =
                  c.worker_count === 1
                    ? t('overview.leaderboard_workers', { count: c.worker_count })
                    : t('overview.leaderboard_workers_plural', { count: c.worker_count })
                return (
                  <li key={c.name} className="flex items-center gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <strong className="truncate text-sm text-[#e6edf3]">{c.name}</strong>
                      <span className="truncate text-xs text-[#8b949e]">
                        {workersLabel} · {c.weakest_cert ?? '—'}
                      </span>
                    </div>
                    <div className="w-28 shrink-0">
                      <StatusStackedBar
                        green={c.green_count}
                        yellow={c.yellow_count}
                        red={c.red_count}
                        blank={c.blank_count}
                      />
                    </div>
                    <strong className="w-14 shrink-0 text-right text-sm text-[#e6edf3]">
                      {c.compliance_pct.toFixed(1)}%
                    </strong>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top urgent items snapshot */}
        <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                {t('overview.actions_eyebrow')}
              </p>
              <h3 className="text-base font-semibold text-[#e6edf3]">{t('overview.actions_title')}</h3>
            </div>
            <Link
              to="/actions"
              className="flex items-center gap-1 text-sm text-[#f59e0b] hover:text-[#fbbf24]"
            >
              {t('overview.actions_open')} <ArrowRight size={14} />
            </Link>
          </header>
          {topActions.length === 0 ? (
            <p className="py-4 text-sm text-[#8b949e]">{t('overview.actions_empty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#30363d]">
              {topActions.map((item, idx) => (
                <li
                  key={`${item.worker}-${item.cert_name}-${idx}`}
                  className="flex items-start gap-3 py-2.5"
                >
                  <StatusPill status={visualStatus(item.status, item.days_until_anniversary)} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-sm text-[#e6edf3]">{item.worker}</strong>
                    <span className="text-xs text-[#8b949e]">{item.contractor}</span>
                    <p className="mt-0.5 truncate text-xs text-[#e6edf3]">{item.cert_name}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end text-right">
                    <span className="text-xs text-[#e6edf3]">
                      {relativeDays(item.days_until_anniversary, t)}
                    </span>
                    <small className="text-xs text-[#8b949e]">
                      {formatDate(item.anniversary, i18n.language)}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Worst-covered certs */}
        <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="mb-0.5 text-xs uppercase tracking-wider text-[#8b949e]">
                {t('overview.gaps_eyebrow')}
              </p>
              <h3 className="text-base font-semibold text-[#e6edf3]">{t('overview.gaps_title')}</h3>
            </div>
            <Link
              to="/certifications"
              className="flex items-center gap-1 text-sm text-[#f59e0b] hover:text-[#fbbf24]"
            >
              {t('overview.see_all')} <ArrowRight size={14} />
            </Link>
          </header>
          {weakestCerts.length === 0 ? (
            <p className="py-4 text-sm text-[#8b949e]">{t('overview.gaps_empty')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[#30363d]">
              {weakestCerts.map((c) => (
                <li key={c.cert_name} className="flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-sm text-[#e6edf3]">{c.cert_name}</strong>
                    <span className="text-xs text-[#8b949e]">{c.cert_category}</span>
                  </div>
                  <div className="w-28 shrink-0">
                    <StatusStackedBar
                      green={c.green}
                      yellow={c.yellow}
                      red={c.red}
                      blank={c.blank}
                    />
                  </div>
                  <strong className="flex w-14 shrink-0 items-center justify-end gap-1 text-sm text-[#ef4444]">
                    <TrendingDown size={13} /> {c.coverage_pct.toFixed(0)}%
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {issues.length > 0 && (
        <section className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/5 p-5">
          <header className="mb-3">
            <strong className="text-sm text-[#ef4444]">{t('overview.issues_title')}</strong>
          </header>
          <ul className="list-inside list-disc space-y-1 text-sm text-[#e6edf3]">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  )
}
