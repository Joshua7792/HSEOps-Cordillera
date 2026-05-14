import * as AlertDialog from '@radix-ui/react-alert-dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  loading?: boolean
  confirmLabel?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  confirmLabel = 'Delete',
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
          <AlertDialog.Title className="mb-2 text-base font-semibold text-[#e6edf3]">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mb-6 text-sm text-[#8b949e]">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                className="rounded border border-[#30363d] bg-[#21262d] px-4 py-2 text-sm text-[#e6edf3] hover:bg-[#30363d] disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="rounded bg-[#ef4444] px-4 py-2 text-sm font-medium text-white hover:bg-[#dc2626] disabled:opacity-50"
              >
                {loading ? 'Deleting…' : confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
