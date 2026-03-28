import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  error,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-dialog">
        <div
          className={`confirm-dialog-icon ${
            tone === 'danger' ? 'is-danger' : 'is-warning'
          }`}
          aria-hidden="true"
        >
          {tone === 'danger' ? '!' : '?'}
        </div>
        <div className="confirm-dialog-copy">
          <p>{message}</p>
        </div>
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-warning'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
