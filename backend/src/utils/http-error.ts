/** An error with an HTTP status code, e.g. throw new HttpError(404, 'NGO not found') */
export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
