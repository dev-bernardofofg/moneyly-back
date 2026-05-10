export const isHttpError = (
  e: unknown
): e is { status?: number; statusCode?: number } =>
  typeof e === "object" && e !== null && ("status" in e || "statusCode" in e);
