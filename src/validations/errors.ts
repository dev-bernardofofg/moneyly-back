export class HttpError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public details?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    Error.captureStackTrace(this);
  }
}
