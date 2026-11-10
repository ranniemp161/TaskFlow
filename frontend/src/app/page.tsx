"use client";

import { useState } from "react";
import { useWorkspace } from "@/hooks/useWorkspace";
import { errorMessage } from "@/lib/api";
import type { DialogKind, Status, Task } from "@/lib/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { PageHeading } from "@/components/layout/PageHeading";
import { ErrorAlert, NoticeAlert } from "@/components/ui/Alerts";
import { WelcomePanel } from "@/components/workspace/WelcomePanel";
import { ProjectMeta } from "@/components/workspace/ProjectMeta";
import { TaskToolbar } from "@/components/tasks/TaskToolbar";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskPagination } from "@/components/tasks/TaskPagination";
import { FormDialog, type FormValues } from "@/components/dialogs/FormDialog";
import { DeleteTaskDialog } from "@/components/dialogs/DeleteTaskDialog";

export default function Home() {
  const ws = useWorkspace();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [formError, setFormError] = useState("");

  function openDialog(kind: DialogKind, task: Task | null = null) {
    setFormError("");
    setEditing(task);
    setDialog(kind);
  }
  // A project needs an owner, so ask for a person first if there are none.
  const startProject = () => openDialog(ws.users.length ? "project" : "user");
  const openTask = (task: Task | null = null) => openDialog("task", task);

  async function handleSubmit(values: FormValues) {
    const value = (key: string) => values[key] ?? "";
    setFormError("");
    try {
      if (dialog === "user") {
        await ws.addUser({ name: value("name"), email: value("email") });
      } else if (dialog === "project") {
        await ws.addProject({
          name: value("name"),
          description: value("description"),
          ownerId: value("ownerId"),
        });
      } else {
        await ws.saveTask(
          {
            title: value("title"),
            description: value("description"),
            assigneeId: value("assigneeId") || null,
            status: value("status") as Status,
          },
          editing,
        );
      }
      setDialog(null);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setFormError("");
    try {
      await ws.deleteTask(deleting);
      setDeleting(null);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  }

  return (
    <div className="workspace">
      <Sidebar
        projects={ws.projects}
        selectedId={ws.projectId}
        ready={ws.ready}
        peopleCount={ws.users.length}
        onSelectProject={ws.chooseProject}
        onNewProject={startProject}
        onAddPerson={() => openDialog("user")}
      />

      <main>
        <Topbar projectName={ws.project?.name} />
        <div className="content">
          <PageHeading project={ws.project} onAddTask={() => openTask()} />
          {ws.error && <ErrorAlert message={ws.error} onRetry={ws.retry} />}
          {ws.notice && (
            <NoticeAlert message={ws.notice} onDismiss={ws.dismissNotice} />
          )}

          {!ws.ready ? (
            <div className="empty">
              <span className="loader" />
              <h2>Opening your workspace…</h2>
            </div>
          ) : !ws.project ? (
            <WelcomePanel
              hasPeople={ws.users.length > 0}
              onStart={startProject}
            />
          ) : (
            <>
              <ProjectMeta owner={ws.owner} />
              <section className="task-section" aria-label="Project tasks">
                <TaskToolbar
                  status={ws.status}
                  sort={ws.sort}
                  onStatusChange={ws.filterByStatus}
                  onSortChange={ws.changeSort}
                />
                <TaskList
                  tasks={ws.tasks}
                  users={ws.users}
                  loading={ws.loading}
                  busy={ws.busy}
                  status={ws.status}
                  page={ws.page}
                  onAddTask={() => openTask()}
                  onEdit={openTask}
                  onDelete={(task) => {
                    setFormError("");
                    setDeleting(task);
                  }}
                  onStatusChange={ws.changeStatus}
                />
                <TaskPagination
                  page={ws.page}
                  count={ws.tasks.length}
                  loading={ws.loading}
                  onPageChange={ws.goToPage}
                />
              </section>
            </>
          )}

          <footer className="workspace-note">
            Your work, in order.<span>TaskFlow</span>
          </footer>
        </div>
      </main>

      <FormDialog
        kind={dialog}
        editing={editing}
        users={ws.users}
        busy={ws.busy}
        error={formError}
        onClose={() => setDialog(null)}
        onSubmit={handleSubmit}
      />
      <DeleteTaskDialog
        task={deleting}
        busy={ws.busy}
        error={formError}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
