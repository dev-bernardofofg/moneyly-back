export class HttpError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    Error.captureStackTrace(this);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Requisição inválida", details?: any) {
    super(400, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso não encontrado", details?: any) {
    super(404, message, details);
  }
}
