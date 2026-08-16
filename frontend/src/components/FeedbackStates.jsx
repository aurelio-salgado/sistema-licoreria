export function LoadingState({ message = 'Cargando…', fullPage = false }) {
  return (
    <div className={fullPage ? 'feedback-state feedback-state--full' : 'feedback-state'}>
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({
  title = 'Ocurrió un problema',
  message,
  actionLabel,
  onAction,
  fullPage = false,
}) {
  return (
    <div className={fullPage ? 'feedback-state feedback-state--full' : 'feedback-state'}>
      <span className="feedback-icon" aria-hidden="true">!</span>
      <h1>{title}</h1>
      {message && <p>{message}</p>}
      {actionLabel && onAction && (
        <button className="button button--primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
