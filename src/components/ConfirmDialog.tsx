import { Modal } from './Modal';

// En enkel bekreftelsesdialog i appen, brukt i stedet for window.confirm()
// slik at bekreftelser er konsekvente med resten av grensesnittet.
export function ConfirmDialog({
  title = 'Bekreft',
  message,
  confirmLabel = 'Bekreft',
  danger,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <button className="btn btn-sm" onClick={onCancel}>
            Avbryt
          </button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{message}</p>
    </Modal>
  );
}
