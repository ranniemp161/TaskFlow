export type User = { id: string; name: string; email: string };

export type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
};

export type Status = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  assigneeId: string | null;
  projectId: string;
  createdAt: string;
};

/** Which create/edit dialog is open. */
export type DialogKind = "user" | "project" | "task" | null;

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [
  Status,
  string,
][];

export const SORT_OPTIONS = [
  ["createdAt:desc", "Newest first"],
  ["createdAt:asc", "Oldest first"],
  ["title:asc", "Title A–Z"],
  ["updatedAt:desc", "Recently updated"],
] as const;

export const TASKS_PER_PAGE = 20;
