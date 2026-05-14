import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useDashboard } from '../context/DashboardContext'
import { RefreshBar } from './RefreshBar'

type PageShellProps = {
  title: string
  eyebrow: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  showRefreshBar?: boolean
}

export function PageShell({
  title,
  eyebrow,
  description,
  actions,
  children,
  showRefreshBar = true,
}: PageShellProps) {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useDashboard()

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#8b949e]">
        {t('loading.fetching')}
      </div>
    )
  }

  if (error && !data) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-lg border border-red-900 bg-[#161b22] p-8 text-center">
        <AlertTriangle size={24} className="text-red-400" />
        <h3 className="text-lg font-semibold text-[#e6edf3]">{t('error.title')}</h3>
        <p className="text-sm text-[#8b949e]">{error}</p>
        <button
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0d1117] hover:bg-amber-400 transition-colors"
          onClick={() => reload()}
          type="button"
        >
          {t('error.retry')}
        </button>
      </section>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-5">
      {showRefreshBar && <RefreshBar />}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#484f58]">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 text-xl font-semibold text-[#e6edf3]">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[#8b949e]">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
