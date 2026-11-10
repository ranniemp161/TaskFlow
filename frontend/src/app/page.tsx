"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

type User = { id: string; name: string; email: string };
type Project = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
};
type Status = "todo" | "in_progress" | "done";
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  assigneeId: string | null;
  projectId: string;
  createdAt: string;
};
type Modal = "user" | "project" | "task" | null;
const labels: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...options,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = response.status === 204 ? undefined : await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(". ")
        : data?.message || "Request failed. Please retry.",
    );
  return data as T;
}
async function allPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const batch = await api<T[]>(path + "?limit=100&page=" + page);
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
}
function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please retry.";
}

export default function Home() {
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
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const project = projects.find((item) => item.id === projectId);

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
          setError(message(err));
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const [sortBy, order] = sort.split(":");
    const query = new URLSearchParams({
      projectId,
      page: String(page),
      limit: "20",
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
        if (active) setError(message(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, status, sort, page, revision]);

  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (deleting) deleteDialog.current?.showModal();
    else deleteDialog.current?.close();
  }, [deleting]);

  function open(kind: Modal, task: Task | null = null) {
    setFormError("");
    setEditing(task);
    setModal(kind);
  }
  function reloadTasks() {
    setLoading(true);
    setRevision((value) => value + 1);
  }
  function chooseProject(id: string) {
    setProjectId(id);
    setTasks([]);
    setPage(1);
    setLoading(true);
    setRevision((value) => value + 1);
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) || "").trim();
    setBusy(true);
    setFormError("");
    try {
      if (modal === "user") {
        const user = await api<User>("users", {
          method: "POST",
          body: JSON.stringify({ name: text("name"), email: text("email") }),
        });
        setUsers((current) => [...current, user]);
        setNotice(
          "Person added. You can now choose them as a project owner or assignee.",
        );
      } else if (modal === "project") {
        const created = await api<Project>("projects", {
          method: "POST",
          body: JSON.stringify({
            name: text("name"),
            description: text("description"),
            ownerId: text("ownerId"),
          }),
        });
        setProjects((current) => [...current, created]);
        chooseProject(created.id);
        setStatus("");
        setNotice("Project created. Add your first task.");
      } else {
        const input = {
          title: text("title"),
          description: text("description"),
          assigneeId: text("assigneeId") || null,
        };
        const body = editing
          ? { ...input, status: text("status") }
          : { ...input, projectId };
        await api<Task>(editing ? "tasks/" + editing.id : "tasks", {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(body),
        });
        setNotice(editing ? "Task updated." : "Task created.");
        reloadTasks();
      }
      setModal(null);
    } catch (err) {
      setFormError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(task: Task, next: Status) {
    setBusy(true);
    try {
      await api("tasks/" + task.id, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setNotice("Task moved to " + labels[next].toLowerCase() + ".");
      reloadTasks();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function removeTask() {
    if (!deleting) return;
    setBusy(true);
    setFormError("");
    try {
      await api("tasks/" + deleting.id, { method: "DELETE" });
      setDeleting(null);
      setNotice("Task deleted.");
      if (tasks.length === 1 && page > 1) {
        setPage(page - 1);
        setLoading(true);
      } else reloadTasks();
    } catch (err) {
      setFormError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon" aria-hidden="true">
            ✓
          </span>
          TaskFlow
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">W</span>
          <div>
            My workspace<small>Local workspace</small>
          </div>
        </div>
        <div className="rail-heading">
          <h2>Projects</h2>
          <button
            className="icon-button"
            aria-label="Create project"
            onClick={() => open(users.length ? "project" : "user")}
          >
            +
          </button>
        </div>
        <nav aria-label="Projects">
          {projects.map((item) => (
            <button
              key={item.id}
              className={
                "project-link " + (projectId === item.id ? "selected" : "")
              }
              onClick={() => chooseProject(item.id)}
              aria-current={projectId === item.id ? "page" : undefined}
            >
              <span aria-hidden="true">▣</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        {ready && !projects.length && (
          <p className="rail-empty">Your projects will appear here.</p>
        )}
        <button
          className="rail-add"
          onClick={() => open(users.length ? "project" : "user")}
        >
          + New project
        </button>
        <div className="sidebar-footer">
          <button onClick={() => open("user")}>
            + Add person <span>{users.length}</span>
          </button>
          <p>Small steps. Steady progress.</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            {project?.name || "Getting started"}
          </span>
          <span className="local-tag">
            <i /> Local MVP
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="section-label">Project workspace</p>
              <h1>{project?.name || "Make room for your next idea."}</h1>
              <p className="description">
                {project?.description ||
                  (project
                    ? "Turn the next step into a finished task."
                    : "Create a project, break it into tasks, and keep work moving.")}
              </p>
            </div>
            {project && (
              <button className="primary" onClick={() => open("task")}>
                + Add task
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button
                onClick={() => {
                  setRefresh((value) => value + 1);
                  if (projectId) reloadTasks();
                }}
              >
                Retry
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {!ready ? (
            <div className="empty">
              <span className="loader" />
              <h2>Opening your workspace…</h2>
            </div>
          ) : !project ? (
            <section className="welcome">
              <div className="welcome-mark" aria-hidden="true">
                ✓
              </div>
              <h2>A little structure goes a long way.</h2>
              <p>
                Start with a person, give your project a name, and add the first
                thing you want to get done.
              </p>
              <div className="setup-steps">
                <div className={users.length ? "complete" : ""}>
                  <b>1</b>
                  <span>
                    Add a person
                    <small>
                      {users.length
                        ? "Ready to own a project"
                        : "Choose who the work belongs to"}
                    </small>
                  </span>
                </div>
                <div>
                  <b>2</b>
                  <span>
                    Create a project<small>Keep related work together</small>
                  </span>
                </div>
                <div>
                  <b>3</b>
                  <span>
                    Add your tasks<small>One clear next step at a time</small>
                  </span>
                </div>
              </div>
              <button
                className="primary"
                onClick={() => open(users.length ? "project" : "user")}
              >
                {users.length
                  ? "Create your first project"
                  : "Add your first person"}
              </button>
            </section>
          ) : (
            <>
              <div className="project-meta">
                <span className="avatar">
                  {users
                    .find((person) => person.id === project.ownerId)
                    ?.name.slice(0, 1) || "?"}
                </span>
                <span>
                  Owned by{" "}
                  <strong>
                    {users.find((person) => person.id === project.ownerId)
                      ?.name || "Unknown person"}
                  </strong>
                </span>
              </div>
              <section className="task-section" aria-label="Project tasks">
                <div className="toolbar">
                  <div className="tabs" aria-label="Filter tasks by status">
                    {[["", "All tasks"], ...Object.entries(labels)].map(
                      ([value, label]) => (
                        <button
                          key={value}
                          aria-pressed={status === value}
                          className={status === value ? "active" : ""}
                          onClick={() => {
                            setStatus(value);
                            setPage(1);
                            setLoading(true);
                            setRevision((current) => current + 1);
                          }}
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                  <label className="sort">
                    Sort{" "}
                    <select
                      value={sort}
                      onChange={(event) => {
                        setSort(event.target.value);
                        setPage(1);
                        setLoading(true);
                      }}
                    >
                      <option value="createdAt:desc">Newest first</option>
                      <option value="createdAt:asc">Oldest first</option>
                      <option value="title:asc">Title A–Z</option>
                      <option value="updatedAt:desc">Recently updated</option>
                    </select>
                  </label>
                </div>
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
                    <div className="empty">
                      <span className="empty-icon" aria-hidden="true">
                        ☷
                      </span>
                      <h2>
                        {status
                          ? "No tasks with this status."
                          : page > 1
                            ? "No more tasks."
                            : "Your next step starts here."}
                      </h2>
                      <p>
                        {status
                          ? "Choose another filter or add a task."
                          : page > 1
                            ? "Go back to the previous page."
                            : "Add a task to get this project moving."}
                      </p>
                      <button
                        className="secondary"
                        onClick={() => open("task")}
                      >
                        + Add task
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="list-heading">
                        <span>Task</span>
                        <span>Status</span>
                        <span>Assignee</span>
                        <span />
                      </div>
                      {tasks.map((task) => (
                        <article className="task-row" key={task.id}>
                          <button
                            className={
                              "task-title " +
                              (task.status === "done" ? "finished" : "")
                            }
                            onClick={() => open("task", task)}
                          >
                            <span
                              className={"task-dot " + task.status}
                              aria-hidden="true"
                            >
                              {task.status === "done" ? "✓" : ""}
                            </span>
                            <span>
                              <strong>{task.title}</strong>
                              {task.description && (
                                <small>{task.description}</small>
                              )}
                            </span>
                          </button>
                          <select
                            aria-label={"Status for " + task.title}
                            className={"status-select " + task.status}
                            value={task.status}
                            disabled={busy}
                            onChange={(event) =>
                              changeStatus(task, event.target.value as Status)
                            }
                          >
                            {Object.entries(labels).map(([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <span className="assignee">
                            {users.find(
                              (person) => person.id === task.assigneeId,
                            )?.name || "Unassigned"}
                          </span>
                          <button
                            className="delete-button"
                            aria-label={"Delete " + task.title}
                            onClick={() => {
                              setFormError("");
                              setDeleting(task);
                            }}
                          >
                            ×
                          </button>
                        </article>
                      ))}
                    </>
                  )}
                </div>
                <footer className="list-footer">
                  <span>
                    {loading ? "Loading" : tasks.length + (tasks.length === 1 ? " task on this page" : " tasks on this page")}
                    <span className="page-number">Page {page}</span>
                  </span>
                  <div>
                    <button
                      disabled={page === 1 || loading}
                      onClick={() => {
                        setPage(page - 1);
                        setLoading(true);
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={tasks.length < 20 || loading}
                      onClick={() => {
                        setPage(page + 1);
                        setLoading(true);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </footer>
              </section>
            </>
          )}
          <footer className="workspace-note">
            Your work, in order.<span>TaskFlow</span>
          </footer>
        </div>
      </main>

      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setModal(null);
        }}
      >
        {modal && (
          <form onSubmit={submit} key={modal + (editing?.id || "")}>
            <div className="dialog-heading">
              <h2>
                {modal === "user"
                  ? "Add a person"
                  : modal === "project"
                    ? "Create a project"
                    : editing
                      ? "Edit task"
                      : "Add a task"}
              </h2>
              <button
                type="button"
                className="icon-button"
                aria-label="Close dialog"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </div>
            <p className="dialog-description">
              {modal === "user"
                ? "People can own projects and be assigned tasks."
                : modal === "project"
                  ? "Give related work a place to live."
                  : "Make the next step clear and actionable."}
            </p>
            {formError && (
              <p role="alert" className="alert error">
                {formError}
              </p>
            )}
            <fieldset disabled={busy}>
              {modal !== "task" ? (
                <label>
                  Name
                  <input
                    autoFocus
                    name="name"
                    required
                    maxLength={255}
                    placeholder={
                      modal === "user" ? "Full name" : "e.g. Website launch"
                    }
                  />
                </label>
              ) : (
                <label>
                  Title
                  <input
                    autoFocus
                    name="title"
                    required
                    maxLength={255}
                    defaultValue={editing?.title}
                    placeholder="What needs to get done?"
                  />
                </label>
              )}
              {modal === "user" ? (
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    placeholder="name@example.com"
                  />
                </label>
              ) : (
                <label>
                  Description <span className="optional">optional</span>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editing?.description || ""}
                    placeholder="Add a little context…"
                  />
                </label>
              )}
              {modal === "project" && (
                <label>
                  Project owner
                  <select name="ownerId" required defaultValue={users[0]?.id}>
                    {users.map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {modal === "task" && (
                <label>
                  Assignee
                  <select
                    name="assigneeId"
                    defaultValue={editing?.assigneeId || ""}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {modal === "task" && editing && (
                <label>
                  Status
                  <select name="status" defaultValue={editing.status}>
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : modal === "user"
                    ? "Add person"
                    : modal === "project"
                      ? "Create project"
                      : editing
                        ? "Save changes"
                        : "Create task"}
              </button>
            </div>
          </form>
        )}
      </dialog>

      <dialog
        ref={deleteDialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setDeleting(null);
        }}
      >
        <h2>Delete this task?</h2>
        <p className="dialog-description">
          “{deleting?.title}” will be permanently deleted.
        </p>
        {formError && (
          <p role="alert" className="alert error">
            {formError}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Keep task
          </button>
          <button className="danger" disabled={busy} onClick={removeTask}>
            {busy ? "Deleting…" : "Delete task"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
