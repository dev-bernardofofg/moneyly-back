/**
 * Logger Service Centralizado
 * Fornece logging estruturado com níveis de log e respeita NODE_ENV
 */

import { env } from "../env";

// Níveis de log disponíveis
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

// Interface para metadata adicional do log
interface LogMetadata {
  [key: string]: unknown;
}

// Cores ANSI para terminal
const colors = {
  reset: "\x1b[0m",
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
};

// Emojis para cada nível
const emojis = {
  DEBUG: "🔍",
  INFO: "ℹ️",
  WARN: "⚠️",
  ERROR: "❌",
};

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = env.NODE_ENV === "development";
  }

  /**
   * Formata a mensagem de log com timestamp e nível
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata
  ): string {
    const timestamp = new Date().toISOString();
    const emoji = emojis[level];
    const color = colors[level.toLowerCase() as keyof typeof colors];

    let formattedMessage = `${color}[${timestamp}] ${emoji} ${level}${colors.reset}: ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      formattedMessage += `\n${color}Metadata:${colors.reset} ${JSON.stringify(
        metadata,
        null,
        2
      )}`;
    }

    return formattedMessage;
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (!this.isDevelopment) return;
    console.log(this.formatMessage(LogLevel.DEBUG, message, metadata));
  }

  /**
   * Log de informação
   */
  info(message: string, metadata?: LogMetadata): void {
    console.log(this.formatMessage(LogLevel.INFO, message, metadata));
  }

  /**
   * Log de aviso
   */
  warn(message: string, metadata?: LogMetadata): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, metadata));
  }

  /**
   * Log de erro
   */
  error(
    message: string,
    error?: Error | unknown,
    metadata?: LogMetadata
  ): void {
    const errorMetadata: LogMetadata = { ...metadata };

    if (error instanceof Error) {
      errorMetadata.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    } else if (error) {
      errorMetadata.error = error;
    }

    console.error(this.formatMessage(LogLevel.ERROR, message, errorMetadata));
  }

  /**
   * Log de entrada de requisição HTTP
   */
  http(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number
  ): void {
    const metadata: LogMetadata = {
      method,
      url,
      ...(statusCode && { statusCode }),
      ...(duration && { duration: `${duration}ms` }),
    };

    const message = statusCode
      ? `${method} ${url} - ${statusCode}`
      : `${method} ${url}`;

    if (statusCode && statusCode >= 400) {
      this.warn(message, metadata);
    } else {
      this.info(message, metadata);
    }
  }

  /**
   * Log de query de banco de dados (apenas em desenvolvimento)
   */
  database(query: string, duration?: number, metadata?: LogMetadata): void {
    if (!this.isDevelopment) return;

    this.debug("Database Query", {
      query,
      ...(duration && { duration: `${duration}ms` }),
      ...metadata,
    });
  }
}

// Exportar instância singleton do logger
export const logger = new Logger();
