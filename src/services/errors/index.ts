import { HttpError } from "../../validations/errors";

export { HttpError };

/**
 * 400 - Bad Request
 * Usada quando a requisição do cliente é inválida ou malformada
 */
export class BadRequestError extends HttpError {
  constructor(
    message = "Requisição inválida. Verifique os dados enviados.",
    details?: unknown
  ) {
    super(400, message, details);
  }
}

/**
 * 404 - Not Found
 * Usada quando o recurso solicitado não foi encontrado
 */
export class NotFoundError extends HttpError {
  constructor(message = "Recurso não encontrado.", details?: unknown) {
    super(404, message, details);
  }
}

/**
 * 401 - Unauthorized
 * Usada quando o usuário não está autenticado
 */
export class UnauthorizedError extends HttpError {
  constructor(
    message = "Autenticação necessária. Por favor, faça login.",
    details?: unknown
  ) {
    super(401, message, details);
  }
}

/**
 * 403 - Forbidden
 * Usada quando o usuário não tem permissão para acessar o recurso
 */
export class ForbiddenError extends HttpError {
  constructor(
    message = "Você não tem permissão para acessar este recurso.",
    details?: unknown
  ) {
    super(403, message, details);
  }
}

/**
 * 409 - Conflict
 * Usada quando há um conflito com o estado atual do recurso
 */
export class ConflictError extends HttpError {
  constructor(
    message = "Conflito detectado. O recurso já existe ou está em uso.",
    details?: unknown
  ) {
    super(409, message, details);
  }
}

/**
 * 422 - Unprocessable Entity
 * Usada quando a requisição está bem formada mas não pode ser processada
 */
export class UnprocessableEntityError extends HttpError {
  constructor(
    message = "Não foi possível processar a requisição. Verifique os dados fornecidos.",
    details?: unknown
  ) {
    super(422, message, details);
  }
}

/**
 * 500 - Internal Server Error
 * Usada para erros internos do servidor
 */
export class InternalServerError extends HttpError {
  constructor(
    message = "Erro interno do servidor. Por favor, tente novamente mais tarde.",
    details?: unknown
  ) {
    super(500, message, details);
  }
}
