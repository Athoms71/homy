'use client'

interface Props {
  message: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  message,
  confirmLabel = 'Confirmer',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] px-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-6 shadow-xl mb-0 pb-8 sm:pb-6">
        <p className="text-gray-800 font-medium text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm text-white ${
              confirmVariant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'
            } transition`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
