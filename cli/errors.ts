// Errors that end a run before the audit. Every one of them exits 2.
// Messages are shown to the user, so they never contain a credential.

/** Bad flags, an unreadable or unparseable input file. */
export class UsageError extends Error {
  readonly kind = 'usage' as const;
}

/** Missing, unreadable or rejected credentials. */
export class CredentialError extends Error {
  readonly kind = 'credentials' as const;
}

/** A Google API answered with an error that is not about credentials. */
export class ApiError extends Error {
  readonly kind = 'api' as const;
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

/** The read-only guard (cli/live/http.ts) refused a request before it was sent. */
export class RefusedError extends Error {
  readonly kind = 'refused' as const;
}

export type CliError = UsageError | CredentialError | ApiError | RefusedError;

export const isCliError = (e: unknown): e is CliError =>
  e instanceof UsageError ||
  e instanceof CredentialError ||
  e instanceof ApiError ||
  e instanceof RefusedError;
