export function ErrorAlert({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="alert error">
      {message}
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}

export function NoticeAlert({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div role="status" className="alert success">
      {message}
      <button aria-label="Dismiss notification" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

/** Inline error shown inside dialogs. */
export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="alert error">
      {message}
    </p>
  );
}
