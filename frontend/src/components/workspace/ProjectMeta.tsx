import type { User } from "@/lib/types";

export function ProjectMeta({ owner }: { owner?: User }) {
  return (
    <div className="project-meta">
      <span className="avatar">{owner?.name.slice(0, 1) || "?"}</span>
      <span>
        Owned by <strong>{owner?.name || "Unknown person"}</strong>
      </span>
    </div>
  );
}
