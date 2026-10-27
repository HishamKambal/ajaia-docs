export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Document") => new HttpError(404, `${what} not found`);
export const forbidden = (msg = "You don't have permission to do that") => new HttpError(403, msg);
export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = () => new HttpError(401, "Choose a user to continue");
