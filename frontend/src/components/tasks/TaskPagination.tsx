import { TASKS_PER_PAGE } from "@/lib/types";

type Props = {
  page: number;
  count: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

export function TaskPagination({ page, count, loading, onPageChange }: Props) {
  return (
    <footer className="list-footer">
      <span>
        {loading
          ? "Loading"
          : count +
            (count === 1 ? " task on this page" : " tasks on this page")}
        <span className="page-number">Page {page}</span>
      </span>
      <div>
        <button
          disabled={page === 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          disabled={count < TASKS_PER_PAGE || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </footer>
  );
}
