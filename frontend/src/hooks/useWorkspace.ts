import { useEffect, useState } from "react";
import { allPages, api, errorMessage } from "@/lib/api";
import {
  STATUS_LABELS,
  TASKS_PER_PAGE,
  type Project,
  type Status,
  type Task,
  type User,
} from "@/lib/types";

export type TaskInput = {
  title: string;
  description: string;
  assigneeId: string | null;
  status?: Status;
};

/**
 * Owns the workspace data (people, projects, tasks), list controls
 * (filter, sort, page) and every API mutation. Components stay presentational.
 *
 * Mutations that belong to a dialog (add/save/delete) throw on failure so the
 * dialog can show the error; changeStatus reports errors in the page alert.
 */
export function useWorkspace() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  const project = projects.find((item) => item.id === projectId);
  const owner = users.find((person) => person.id === project?.ownerId);

  // People and projects: loaded on start and on Retry.
  useEffect(() => {
    let active = true;
    Promise.all([allPages<User>("users"), allPages<Project>("projects")])
      .then(([people, records]) => {
        if (!active) return;
        setUsers(people);
        setProjects(records);
        setProjectId((current) =>
          records.some((item) => item.id === current)
            ? current
            : records[0]?.id || "",
        );
        setError("");
        setReady(true);
      })
      .catch((err) => {
        if (active) {
          setError(errorMessage(err));
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  // Tasks for the selected project, filter, sort and page.
  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const [sortBy, order] = sort.split(":");
    const query = new URLSearchParams({
      projectId,
      page: String(page),
      limit: String(TASKS_PER_PAGE),
      sortBy,
      order,
    });
    if (status) query.set("status", status);
    api<Task[]>("tasks?" + query)
      .then((rows) => {
        if (active) {
          setTasks(rows);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, status, sort, page, revision]);

  function reloadTasks() {
    setLoading(true);
    setRevision((value) => value + 1);
  }

  async function withBusy<T>(action: () => Promise<T>): Promise<T> {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  }

  // ---- Navigation and list controls ----

  function chooseProject(id: string) {
    setProjectId(id);
    setTasks([]);
    setPage(1);
    setLoading(true);
    setRevision((value) => value + 1);
    setNotice("");
  }

  function filterByStatus(value: string) {
    setStatus(value);
    setPage(1);
    setLoading(true);
    setRevision((current) => current + 1);
  }

  function changeSort(value: string) {
    setSort(value);
    setPage(1);
    setLoading(true);
  }

  function goToPage(next: number) {
    setPage(next);
    setLoading(true);
  }

  function retry() {
    setRefresh((value) => value + 1);
    if (projectId) reloadTasks();
  }

  // ---- Mutations ----

  const addUser = (input: { name: string; email: string }) =>
    withBusy(async () => {
      const user = await api<User>("users", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setUsers((current) => [...current, user]);
      setNotice(
        "Person added. You can now choose them as a project owner or assignee.",
      );
    });

  const addProject = (input: {
    name: string;
    description: string;
    ownerId: string;
  }) =>
    withBusy(async () => {
      const created = await api<Project>("projects", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setProjects((current) => [...current, created]);
      chooseProject(created.id);
      setStatus("");
      setNotice("Project created. Add your first task.");
    });

  /** Creates a task in the selected project, or updates `existing`. */
  const saveTask = (
    { status: nextStatus, ...input }: TaskInput,
    existing: Task | null,
  ) =>
    withBusy(async () => {
      const body = existing
        ? { ...input, status: nextStatus }
        : { ...input, projectId };
      await api<Task>(existing ? "tasks/" + existing.id : "tasks", {
        method: existing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setNotice(existing ? "Task updated." : "Task created.");
      reloadTasks();
    });

  const changeStatus = (task: Task, next: Status) =>
    withBusy(async () => {
      try {
        await api("tasks/" + task.id, {
          method: "PATCH",
          body: JSON.stringify({ status: next }),
        });
        setNotice("Task moved to " + STATUS_LABELS[next].toLowerCase() + ".");
        reloadTasks();
      } catch (err) {
        setError(errorMessage(err));
      }
    });

  const deleteTask = (task: Task) =>
    withBusy(async () => {
      await api("tasks/" + task.id, { method: "DELETE" });
      setNotice("Task deleted.");
      // Deleting the last task on a page steps back to the previous page.
      if (tasks.length === 1 && page > 1) goToPage(page - 1);
      else reloadTasks();
    });

  return {
    users,
    projects,
    projectId,
    project,
    owner,
    tasks,
    ready,
    loading,
    error,
    notice,
    status,
    sort,
    page,
    busy,
    chooseProject,
    filterByStatus,
    changeSort,
    goToPage,
    retry,
    dismissNotice: () => setNotice(""),
    addUser,
    addProject,
    saveTask,
    changeStatus,
    deleteTask,
  };
}
