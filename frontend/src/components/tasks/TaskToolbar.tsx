import { SORT_OPTIONS, STATUS_OPTIONS } from "@/lib/types";

const FILTERS: [string, string][] = [["", "All tasks"], ...STATUS_OPTIONS];

type Props = {
  status: string;
  sort: string;
  onStatusChange: (value: string) => void;
  onSortChange: (value: string) => void;
};

/** Status filter tabs and sort menu. */
export function TaskToolbar({
  status,
  sort,
  onStatusChange,
  onSortChange,
}: Props) {
  return (
    <div className="toolbar">
      <div className="tabs" aria-label="Filter tasks by status">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            aria-pressed={status === value}
            className={status === value ? "active" : ""}
            onClick={() => onStatusChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="sort">
        Sort{" "}
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
