import { useDialog } from "@/hooks/useDialog";
import type { Task } from "@/lib/types";
import { FormError } from "@/components/ui/Alerts";

type Props = {
  task: Task | null;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Explicit confirmation before a task is permanently deleted. */
export function DeleteTaskDialog({
  task,
  busy,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const ref = useDialog(task !== null);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onCancel();
      }}
    >
      <h2>Delete this task?</h2>
      <p className="dialog-description">
        “{task?.title}” will be permanently deleted.
      </p>
      <FormError message={error} />
      <div className="dialog-actions">
        <button className="secondary" disabled={busy} onClick={onCancel}>
          Keep task
        </button>
        <button className="danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Deleting…" : "Delete task"}
        </button>
      </div>
    </dialog>
  );
}
