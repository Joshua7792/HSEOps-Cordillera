import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'

import { api } from '../api'
import type { ImportBatch } from '../types'
import { cn } from '../lib/cn'
import { formatDate } from '../lib/format'

type QueueItem = {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'failed'
  batch?: ImportBatch
  error?: string
}

function BatchStatusIcon({ status }: { status: ImportBatch['status'] }) {
  if (status === 'success') return <CheckCircle size={16} className="text-green-400" />
  if (status === 'failed') return <XCircle size={16} className="text-red-400" />
  return <Clock size={16} className="text-amber-400" />
}

export function ImportPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [history, setHistory] = useState<ImportBatch[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const processFile = async (item: QueueItem) => {
    setQueue((q) => q.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i)))
    try {
      const batch = await api.importPdf(item.file)
      setQueue((q) =>
        q.map((i) =>
          i.id === item.id
            ? { ...i, status: batch.status === 'failed' ? 'failed' : 'success', batch }
            : i,
        ),
      )
    } catch (err) {
      setQueue((q) =>
        q.map((i) =>
          i.id === item.id
            ? { ...i, status: 'failed', error: err instanceof Error ? err.message : String(err) }
            : i,
        ),
      )
    }
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newItems: QueueItem[] = acceptedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
      }))
      setQueue((q) => [...q, ...newItems])
      newItems.forEach(processFile)
    },
    [],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const data = await api.getImportHistory()
      setHistory(data)
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#e6edf3]">Import Certifications</h2>
        <p className="text-sm text-[#8b949e] mt-1">
          Drop Anejo 3 PDF files to import worker certification data.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-amber-500 bg-amber-500/5'
            : 'border-[#30363d] hover:border-[#484f58] hover:bg-[#161b22]',
        )}
      >
        <input {...getInputProps()} />
        <Upload size={36} className="mx-auto mb-3 text-[#484f58]" />
        {isDragActive ? (
          <p className="text-sm text-amber-400 font-medium">Drop the PDFs here…</p>
        ) : (
          <>
            <p className="text-sm text-[#8b949e]">
              Drag &amp; drop Anejo 3 PDFs here, or click to browse
            </p>
            <p className="text-xs text-[#484f58] mt-1">Only .pdf files accepted</p>
          </>
        )}
      </div>

      {/* Upload queue */}
      <AnimatePresence>
        {queue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#484f58]">
              Queue
            </h3>
            {queue.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-md bg-[#161b22] border border-[#30363d] px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#e6edf3] truncate">{item.file.name}</p>
                  {item.batch && (
                    <p className="text-xs text-[#8b949e]">
                      +{item.batch.records_added} added, ~{item.batch.records_updated} updated
                      {item.batch.warnings.length > 0 && (
                        <span className="ml-2 text-amber-400">
                          <AlertTriangle size={10} className="inline mr-0.5" />
                          {item.batch.warnings.length} warning{item.batch.warnings.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  )}
                  {item.error && <p className="text-xs text-red-400">{item.error}</p>}
                </div>
                <div className="shrink-0">
                  {item.status === 'uploading' ? (
                    <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  ) : item.status === 'success' ? (
                    <CheckCircle size={16} className="text-green-400" />
                  ) : item.status === 'failed' ? (
                    <XCircle size={16} className="text-red-400" />
                  ) : (
                    <Clock size={16} className="text-[#484f58]" />
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#484f58]">
            Import History
          </h3>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors disabled:opacity-50"
          >
            {historyLoading ? 'Loading…' : 'Load history'}
          </button>
        </div>
        {history && (
          <div className="rounded-md border border-[#30363d] overflow-hidden">
            {history.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#8b949e] text-center">No import history yet.</p>
            ) : (
              history.map((batch, i) => (
                <div
                  key={batch.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    i < history.length - 1 && 'border-b border-[#30363d]',
                  )}
                >
                  <BatchStatusIcon status={batch.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e6edf3] truncate">
                      {batch.filename ?? batch.batch_type}
                    </p>
                    <p className="text-xs text-[#8b949e]">
                      {formatDate(batch.imported_at)} · +{batch.records_added} added ·{' '}
                      {batch.records_updated} updated
                    </p>
                  </div>
                  {batch.warnings.length > 0 && (
                    <span className="text-[10px] text-amber-400 border border-amber-900 rounded px-1.5 py-0.5">
                      {batch.warnings.length}w
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
