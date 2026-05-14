import { useEffect, useState } from 'react'
import { Database, RefreshCw } from 'lucide-react'

type MigrateStatus = {
  migrated: boolean
  record_counts: {
    contractors: number
    workers: number
    certs: number
    cert_entries: number
  }
}

export function SettingsPage() {
  const [status, setStatus] = useState<MigrateStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [rerunning, setRerunning] = useState(false)
  const [rerunResult, setRerunResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/migrate/status')
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [])

  const rerunMigration = async () => {
    setRerunning(true)
    setRerunResult(null)
    try {
      const res = await fetch('/api/migrate/from-excel', { method: 'POST' })
      const data = await res.json()
      setRerunResult(data.ok ? `Migration complete — batch #${data.batch_id}` : data.error)
      const updated = await fetch('/api/migrate/status').then((r) => r.json())
      setStatus(updated)
    } catch (err) {
      setRerunResult(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setRerunning(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#e6edf3]">Settings</h2>
        <p className="text-sm text-[#8b949e] mt-1">Database status and migration controls.</p>
      </div>

      {/* DB info */}
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#30363d]">
          <Database size={16} className="text-amber-500" />
          <span className="text-sm font-medium text-[#e6edf3]">SQLite Database</span>
        </div>
        {loading ? (
          <p className="px-4 py-4 text-sm text-[#8b949e]">Loading…</p>
        ) : status ? (
          <div className="divide-y divide-[#30363d]">
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm text-[#8b949e]">Migration status</span>
              <span className={`text-sm font-medium ${status.migrated ? 'text-green-400' : 'text-amber-400'}`}>
                {status.migrated ? 'Migrated' : 'Not migrated'}
              </span>
            </div>
            {Object.entries(status.record_counts).map(([key, count]) => (
              <div key={key} className="flex justify-between px-4 py-3">
                <span className="text-sm text-[#8b949e] capitalize">{key.replace('_', ' ')}</span>
                <span className="text-sm font-semibold text-[#e6edf3]">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-red-400">Could not load status.</p>
        )}
      </div>

      {/* Re-run migration */}
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-3">
        <p className="text-sm font-medium text-[#e6edf3]">Re-run Excel Migration</p>
        <p className="text-xs text-[#8b949e]">
          Re-imports the source .xlsx workbook into SQLite. Existing records will be kept; new rows
          from the workbook are added.
        </p>
        <button
          type="button"
          onClick={rerunMigration}
          disabled={rerunning}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0d1117] hover:bg-amber-400 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={rerunning ? 'animate-spin' : ''} />
          {rerunning ? 'Running…' : 'Re-run migration'}
        </button>
        {rerunResult && (
          <p className="text-xs text-[#8b949e]">{rerunResult}</p>
        )}
      </div>
    </div>
  )
}
