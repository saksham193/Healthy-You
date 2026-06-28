export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;
