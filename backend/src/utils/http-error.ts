export interface FieldError {
  field: string;
  message: string;
}

/**
 * An error with an HTTP status code.
 *   throw new HttpError(404, 'NGO not found.')
 *   throw new HttpError(409, 'Email taken.', { fields: [{ field: 'email', message: '...' }] })
 *   throw new HttpError(403, 'Waiting for approval.', { code: 'ACCOUNT_PENDING' })
 * `code` is a stable machine-readable value the frontend can switch on.
 */
export class HttpError extends Error {
  readonly code?: string;
  readonly fields?: FieldError[];

  constructor(public status: number, message: string, options: { code?: string; fields?: FieldError[] } = {}) {
    super(message);
    this.code = options.code;
    this.fields = options.fields;
  }
}
