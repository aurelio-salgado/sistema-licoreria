import { useEffect, useId, useRef } from 'react'

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading catalog-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ status }) {
  return <span className={`badge badge--${status}`}>{status === 'activo' ? 'Activo' : 'Inactivo'}</span>
}

export function FormField({ label, name, error, help, children }) {
  return (
    <label className="form-field" htmlFor={name}>
      <span>{label}</span>
      {children}
      {help && <span className="form-help">{help}</span>}
      {error && <span className="form-message--error">{error}</span>}
    </label>
  )
}

export function Pagination({ pagination, onPageChange, disabled }) {
  const page = pagination?.page ?? 1
  const totalPages = Math.max(pagination?.total_pages ?? 0, 1)

  return (
    <div className="pagination" aria-label="Paginación">
      <span>{pagination?.total ?? 0} registros</span>
      <div>
        <button className="button button--secondary" type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
        <span aria-live="polite">Página {page} de {totalPages}</span>
        <button className="button button--secondary" type="button" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
      </div>
    </div>
  )
}

export function Modal({ title, children, onClose, footer, busy = false }) {
  const titleId = useId()
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeButtonRef} className="icon-button modal-close" type="button" aria-label="Cerrar diálogo" disabled={busy} onClick={onClose}>×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel, tone = 'danger', busy, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel} busy={busy} footer={
      <>
        <button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={`button button--${tone}`} type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Guardando…' : confirmLabel}</button>
      </>
    }>
      <p className="confirm-message">{message}</p>
    </Modal>
  )
}

export function EmptyState({ message }) {
  return <div className="empty-state"><strong>Sin resultados</strong><p>{message}</p></div>
}
