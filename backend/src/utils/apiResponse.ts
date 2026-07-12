export function successResponse<T>(data?: T, message?: string) {
  return { success: true as const, data, message }
}

export function errorResponse(message: string) {
  return { success: false as const, error: { message } }
}
