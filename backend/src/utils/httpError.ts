export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const isHttpError = (error: unknown): error is HttpError => {
  if (error instanceof HttpError) return true;

  if (!error || typeof error !== "object") return false;

  const candidate = error as Partial<HttpError>;

  return (
    typeof candidate.statusCode === "number" &&
    candidate.statusCode >= 400 &&
    candidate.statusCode < 600 &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
};
