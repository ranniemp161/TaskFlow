import { STATUS_OPTIONS, type Status, type Task } from "@/lib/types";

type Props = {
  task: Task;
  assigneeName?: string;
  busy: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, next: Status) => void;
};

export function TaskRow({
  task,
  assigneeName,
  busy,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const done = task.status === "done";
  return (
    <article className="task-row">
      <button
        className={"task-title " + (done ? "finished" : "")}
        onClick={() => onEdit(task)}
      >
        <span className={"task-dot " + task.status} aria-hidden="true">
          {done ? "✓" : ""}
        </span>
        <span>
          <strong>{task.title}</strong>
          {task.description && <small>{task.description}</small>}
        </span>
      </button>
      <select
        aria-label={"Status for " + task.title}
        className={"status-select " + task.status}
        value={task.status}
        disabled={busy}
        onChange={(event) => onStatusChange(task, event.target.value as Status)}
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <span className="assignee">{assigneeName || "Unassigned"}</span>
      <button
        className="delete-button"
        aria-label={"Delete " + task.title}
        onClick={() => onDelete(task)}
      >
        ×
      </button>
    </article>
  );
}
