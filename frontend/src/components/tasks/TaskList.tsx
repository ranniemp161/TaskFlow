import type { Status, Task, User } from "@/lib/types";
import { TaskRow } from "./TaskRow";

type Props = {
  tasks: Task[];
  users: User[];
  loading: boolean;
  busy: boolean;
  /** Active status filter ("" = all); used for the empty-state message. */
  status: string;
  page: number;
  onAddTask: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, next: Status) => void;
};

export function TaskList({
  tasks,
  users,
  loading,
  busy,
  status,
  page,
  onAddTask,
  ...rowHandlers
}: Props) {
  return (
    <div
      aria-busy={loading}
      className={loading ? "task-list loading" : "task-list"}
    >
      {loading ? (
        <div className="empty">
          <span className="loader" />
          <p>Loading tasks…</p>
        </div>
      ) : !tasks.length ? (
        <EmptyTasks status={status} page={page} onAddTask={onAddTask} />
      ) : (
        <>
          <div className="list-heading">
            <span>Task</span>
            <span>Status</span>
            <span>Assignee</span>
            <span />
          </div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              assigneeName={users.find((u) => u.id === task.assigneeId)?.name}
              busy={busy}
              {...rowHandlers}
            />
          ))}
        </>
      )}
    </div>
  );
}

function EmptyTasks({
  status,
  page,
  onAddTask,
}: {
  status: string;
  page: number;
  onAddTask: () => void;
}) {
  const [title, hint] = status
    ? ["No tasks with this status.", "Choose another filter or add a task."]
    : page > 1
      ? ["No more tasks.", "Go back to the previous page."]
      : [
          "Your next step starts here.",
          "Add a task to get this project moving.",
        ];

  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        ☷
      </span>
      <h2>{title}</h2>
      <p>{hint}</p>
      <button className="secondary" onClick={onAddTask}>
        + Add task
      </button>
    </div>
  );
}
