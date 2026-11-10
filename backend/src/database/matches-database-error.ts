// Drizzle can wrap the original PostgreSQL error in a cause.
export function matchesDatabaseError(
  error: unknown,
  code: string,
  constraint: string,
): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (
    typeof current === 'object' &&
    current !== null &&
    !seen.has(current)
  ) {
    seen.add(current);
    if (
      'code' in current &&
      current.code === code &&
      'constraint' in current &&
      current.constraint === constraint
    )
      return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}
