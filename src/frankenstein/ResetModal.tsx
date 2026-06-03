import { useEffect } from 'react';

interface ResetModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetModal({ isOpen, onCancel, onConfirm }: ResetModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      aria-labelledby="reset-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-6">
        <h2
          id="reset-modal-title"
          className="text-lg font-semibold text-gray-100 mb-3"
        >
          Reset layout
        </h2>
        <p className="text-gray-300 text-sm mb-6">
          Are you sure you want to reset the layout? All players will be removed from the grid.
        </p>

        <div className="flex gap-3 justify-end">
          {/* Cancel button */}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-gray-200 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
          >
            Cancel
          </button>

          {/* Confirm button */}
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetModal;
