import { HttpError } from "../../validations/errors";

export { HttpError };

export class BadRequestError extends HttpError {
  constructor(
    message = "Requisição inválida. Verifique os dados enviados.",
    details?: unknown
  ) {
    super(400, message, details);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Recurso não encontrado.", details?: unknown) {
    super(404, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(
    message = "Autenticação necessária. Por favor, faça login.",
    details?: unknown
  ) {
    super(401, message, details);
  }
}

export class ForbiddenError extends HttpError {
  constructor(
    message = "Você não tem permissão para acessar este recurso.",
    details?: unknown
  ) {
    super(403, message, details);
  }
}

export class ConflictError extends HttpError {
  constructor(
    message = "Conflito detectado. O recurso já existe ou está em uso.",
    details?: unknown
  ) {
    super(409, message, details);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(
    message = "Não foi possível processar a requisição. Verifique os dados fornecidos.",
    details?: unknown
  ) {
    super(422, message, details);
  }
}

export class InternalServerError extends HttpError {
  constructor(
    message = "Erro interno do servidor. Por favor, tente novamente mais tarde.",
    details?: unknown
  ) {
    super(500, message, details);
  }
}
