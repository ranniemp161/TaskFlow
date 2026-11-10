import { STATUS_OPTIONS, type Task, type User } from "@/lib/types";

function NameField({ placeholder }: { placeholder: string }) {
  return (
    <label>
      Name
      <input
        autoFocus
        name="name"
        required
        maxLength={255}
        placeholder={placeholder}
      />
    </label>
  );
}

function DescriptionField({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <label>
      Description <span className="optional">optional</span>
      <textarea
        name="description"
        rows={3}
        defaultValue={defaultValue}
        placeholder="Add a little context…"
      />
    </label>
  );
}

export function UserFields() {
  return (
    <>
      <NameField placeholder="Full name" />
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
    </>
  );
}

export function ProjectFields({ users }: { users: User[] }) {
  return (
    <>
      <NameField placeholder="e.g. Website launch" />
      <DescriptionField />
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
    </>
  );
}

export function TaskFields({
  users,
  editing,
}: {
  users: User[];
  editing: Task | null;
}) {
  return (
    <>
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
      <DescriptionField defaultValue={editing?.description || ""} />
      <label>
        Assignee
        <select name="assigneeId" defaultValue={editing?.assigneeId || ""}>
          <option value="">Unassigned</option>
          {users.map((user) => (
            <option value={user.id} key={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      {editing && (
        <label>
          Status
          <select name="status" defaultValue={editing.status}>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
