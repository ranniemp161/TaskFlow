import Link from "next/link";
import type { Project } from "@/lib/types";

type Props = {
  projects: Project[];
  selectedId: string;
  ready: boolean;
  peopleCount: number;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onAddPerson: () => void;
};

export function Sidebar({
  projects,
  selectedId,
  ready,
  peopleCount,
  onSelectProject,
  onNewProject,
  onAddPerson,
}: Props) {
  return (
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
          onClick={onNewProject}
        >
          +
        </button>
      </div>
      <nav aria-label="Projects">
        {projects.map((item) => {
          const selected = selectedId === item.id;
          return (
            <button
              key={item.id}
              className={"project-link " + (selected ? "selected" : "")}
              onClick={() => onSelectProject(item.id)}
              aria-current={selected ? "page" : undefined}
            >
              <span aria-hidden="true">▣</span>
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
      {ready && !projects.length && (
        <p className="rail-empty">Your projects will appear here.</p>
      )}
      <button className="rail-add" onClick={onNewProject}>
        + New project
      </button>
      <div className="sidebar-footer">
        <button onClick={onAddPerson}>
          + Add person <span>{peopleCount}</span>
        </button>
        <p>Small steps. Steady progress.</p>
      </div>
    </aside>
  );
}
