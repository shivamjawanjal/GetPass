import React from 'react';
import Modal from './Modal';
import { buttonDark, buttonPrimary, buttonSecondary } from '../../utils/uiStyles';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  loading = false,
  children,
}) => {
  const isDanger = type === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex items-start gap-4">
        <div
          className={`flex shrink-0 items-center justify-center rounded-md p-3 ${
            isDanger ? 'bg-slate-900 text-white' : 'bg-orange-700 text-white'
          }`}
        >
          {isDanger ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-relaxed text-slate-600">{message}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className={buttonSecondary}
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={isDanger ? buttonDark : buttonPrimary}
        >
          {loading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
