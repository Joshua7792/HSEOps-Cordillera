import {
  AlertTriangle,
  BriefcaseBusiness,
  Download,
  Grid3x3,
  LayoutDashboard,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

import { cn } from '../lib/cn'
import { useDashboard } from '../context/DashboardContext'
import { useTheme } from '../context/ThemeContext'

type ShellLayoutProps = {
  children: ReactNode
}

export function ShellLayout({ children }: ShellLayoutProps) {
  const { t, i18n } = useTranslation()
  const { data } = useDashboard()
  const { theme, toggle: toggleTheme } = useTheme()

  const navigation = [
    { to: '/', label: t('nav.overview'), icon: LayoutDashboard, end: true },
    { to: '/actions', label: t('nav.actions'), icon: AlertTriangle, badge: data?.kpis.red_count },
    { to: '/contractors', label: t('nav.contractors'), icon: BriefcaseBusiness },
    { to: '/workers', label: t('nav.workers'), icon: Users },
    { to: '/certifications', label: t('nav.certifications'), icon: ShieldCheck },
    { to: '/heatmap', label: t('nav.heatmap'), icon: Grid3x3 },
    { to: '/import', label: 'Import', icon: Download },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  const lang = i18n.language?.startsWith('es') ? 'es' : 'en'

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1117]">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-[#30363d] bg-[#161b22] shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#30363d]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-[#0d1117] font-bold text-sm shrink-0">
            CO
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8b949e]">
              {t('app.brand_eyebrow')}
            </p>
            <h1 className="text-sm font-semibold text-[#e6edf3] truncate leading-tight">
              {t('app.brand_title')}
            </h1>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2 py-3 flex-1 overflow-y-auto">
          {navigation.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[#1c2128] text-amber-400 font-medium'
                    : 'text-[#8b949e] hover:bg-[#1c2128] hover:text-[#e6edf3]',
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {badge != null && badge > 0 && (
                <span className="ml-auto rounded-full bg-red-900 px-1.5 py-0.5 text-[10px] font-semibold text-red-400 leading-none">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* At-a-glance stats */}
        {data && (
          <div className="mx-2 mb-2 rounded-md bg-[#0d1117] border border-[#30363d] p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#484f58]">
              {t('app.at_a_glance')}
            </p>
            {[
              { label: t('app.stat_workers'), value: data.kpis.active_workers },
              { label: t('app.stat_contractors'), value: data.kpis.total_contractors },
              {
                label: t('app.stat_compliance'),
                value: `${data.kpis.overall_compliance_pct.toFixed(1)}%`,
              },
              {
                label: t('app.stat_urgent'),
                value: data.kpis.red_count,
                danger: data.kpis.red_count > 0,
              },
            ].map(({ label, value, danger }) => (
              <div key={label} className="flex justify-between items-center py-0.5">
                <span className="text-xs text-[#8b949e]">{label}</span>
                <strong className={cn('text-xs font-semibold', danger ? 'text-red-400' : 'text-[#e6edf3]')}>
                  {value}
                </strong>
              </div>
            ))}
          </div>
        )}

        {/* Language + theme prefs */}
        <div className="mx-2 mb-3 rounded-md bg-[#0d1117] border border-[#30363d] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#484f58]">
              {t('app.language')}
            </span>
            <div className="flex rounded overflow-hidden border border-[#30363d]">
              {(['en', 'es'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => i18n.changeLanguage(code)}
                  className={cn(
                    'px-2 py-0.5 text-xs transition-colors',
                    lang === code
                      ? 'bg-amber-500 text-[#0d1117] font-semibold'
                      : 'text-[#8b949e] hover:text-[#e6edf3]',
                  )}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#484f58]">
              {t('app.theme')}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors"
            >
              {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
              <span>{theme === 'dark' ? t('app.theme_light') : t('app.theme_dark')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#0d1117]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
