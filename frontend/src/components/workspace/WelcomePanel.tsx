type Props = { hasPeople: boolean; onStart: () => void };

/** Onboarding shown when there is no project yet. */
export function WelcomePanel({ hasPeople, onStart }: Props) {
  return (
    <section className="welcome">
      <div className="welcome-mark" aria-hidden="true">
        ✓
      </div>
      <h2>A little structure goes a long way.</h2>
      <p>
        Start with a person, give your project a name, and add the first thing
        you want to get done.
      </p>
      <div className="setup-steps">
        <div className={hasPeople ? "complete" : ""}>
          <b>1</b>
          <span>
            Add a person
            <small>
              {hasPeople
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
      <button className="primary" onClick={onStart}>
        {hasPeople ? "Create your first project" : "Add your first person"}
      </button>
    </section>
  );
}
