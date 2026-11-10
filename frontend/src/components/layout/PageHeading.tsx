import type { Project } from "@/lib/types";

type Props = { project?: Project; onAddTask: () => void };

export function PageHeading({ project, onAddTask }: Props) {
  const description =
    project?.description ||
    (project
      ? "Turn the next step into a finished task."
      : "Create a project, break it into tasks, and keep work moving.");

  return (
    <div className="page-heading">
      <div>
        <p className="section-label">Project workspace</p>
        <h1>{project?.name || "Make room for your next idea."}</h1>
        <p className="description">{description}</p>
      </div>
      {project && (
        <button className="primary" onClick={onAddTask}>
          + Add task
        </button>
      )}
    </div>
  );
}
