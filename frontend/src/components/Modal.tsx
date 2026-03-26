import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
}

export default function Modal({
  title,
  onClose,
  children,
  className = '',
  overlayClassName = '',
}: ModalProps) {
  return (
    <div className={`modal-overlay ${overlayClassName}`.trim()} onClick={onClose}>
      <div className={`modal ${className}`.trim()} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
