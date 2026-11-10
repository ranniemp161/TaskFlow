import type { FormEvent } from "react";
import { useDialog } from "@/hooks/useDialog";
import type { DialogKind, Task, User } from "@/lib/types";
import { FormError } from "@/components/ui/Alerts";
import { ProjectFields, TaskFields, UserFields } from "./FormFields";

export type FormValues = Record<string, string>;

const COPY = {
  user: {
    title: "Add a person",
    description: "People can own projects and be assigned tasks.",
    submit: "Add person",
  },
  project: {
    title: "Create a project",
    description: "Give related work a place to live.",
    submit: "Create project",
  },
  task: {
    title: "Add a task",
    description: "Make the next step clear and actionable.",
    submit: "Create task",
  },
};

type Props = {
  kind: DialogKind;
  /** Task being edited; null when creating. */
  editing: Task | null;
  users: User[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
};

/** One native dialog that hosts the person, project and task forms. */
export function FormDialog({
  kind,
  editing,
  users,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const ref = useDialog(kind !== null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: FormValues = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      values[key] = String(value).trim();
    });
    onSubmit(values);
  }

  const copy = kind ? COPY[kind] : null;
  const isEdit = kind === "task" && editing !== null;

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      {kind && copy && (
        <form onSubmit={handleSubmit} key={kind + (editing?.id || "")}>
          <div className="dialog-heading">
            <h2>{isEdit ? "Edit task" : copy.title}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Close dialog"
              disabled={busy}
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <p className="dialog-description">{copy.description}</p>
          <FormError message={error} />
          <fieldset disabled={busy}>
            {kind === "user" && <UserFields />}
            {kind === "project" && <ProjectFields users={users} />}
            {kind === "task" && <TaskFields users={users} editing={editing} />}
          </fieldset>
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : copy.submit}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
