export function Topbar({ projectName }: { projectName?: string }) {
  return (
    <header className="topbar">
      <span>
        Workspace <span className="slash">/</span>{" "}
        {projectName || "Getting started"}
      </span>
      <span className="local-tag">
        <i /> Local MVP
      </span>
    </header>
  );
}
