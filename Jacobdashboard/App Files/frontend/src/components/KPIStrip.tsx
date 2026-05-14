import { AlertTriangle, Clock, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimatedCounter } from './AnimatedCounter'
import { ComplianceRing } from './ComplianceRing'
import { cn } from '../lib/cn'
import type { ExcelKPIs } from '../types'

type KPICardProps = {
  icon: ReactNode
  label: string
  value: number
  sub: string
  accent?: string
  decimals?: number
  suffix?: string
  ring?: number
}

function KPICard({ icon, label, value, sub, accent = '#e6edf3', decimals = 0, suffix = '', ring }: KPICardProps) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-[#30363d] bg-[#161b22] p-4">
      <div className="flex items-center justify-between">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </div>
        {ring !== undefined && <ComplianceRing pct={ring} size={40} strokeWidth={3} />}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#484f58]">{label}</p>
      <strong className={cn('text-2xl font-bold leading-none')} style={{ color: accent }}>
        <AnimatedCounter to={value} decimals={decimals} suffix={suffix} />
      </strong>
      <p className="text-xs text-[#8b949e]">{sub}</p>
    </article>
  )
}

export function KPIStrip({ kpis }: { kpis: ExcelKPIs }) {
  const { t } = useTranslation()
  const pct = kpis.overall_compliance_pct
  const complianceAccent = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444'

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KPICard
        icon={<Users size={16} />}
        label={t('kpi.active_workers')}
        value={kpis.active_workers}
        sub={t('kpi.active_workers_sub', {
          total: kpis.total_workers,
          contractors: kpis.total_contractors,
        })}
        accent="#f59e0b"
      />
      <KPICard
        icon={<ShieldCheck size={16} />}
        label={t('kpi.compliance')}
        value={pct}
        decimals={1}
        suffix="%"
        sub={t('kpi.compliance_sub', {
          green: kpis.green_count,
          dated: kpis.green_count + kpis.yellow_count + kpis.red_count,
        })}
        accent={complianceAccent}
        ring={pct}
      />
      <KPICard
        icon={<AlertTriangle size={16} />}
        label={t('kpi.urgent')}
        value={kpis.red_count}
        sub={t('kpi.urgent_sub')}
        accent={kpis.red_count > 0 ? '#ef4444' : '#22c55e'}
      />
      <KPICard
        icon={<Clock size={16} />}
        label={t('kpi.expiring')}
        value={kpis.yellow_count}
        sub={t('kpi.expiring_sub')}
        accent={kpis.yellow_count > 0 ? '#eab308' : '#22c55e'}
      />
    </section>
  )
}
