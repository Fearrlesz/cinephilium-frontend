// Достаёт человекочитаемый текст ошибки из ответа бэкенда.
// Поддерживает и новый формат { error: { code, message, details } },
// и старый { error: "строка" } / { message } / express-validator { errors: [] }.
export function getErrorMessage(error, fallback = 'Произошла ошибка') {
  if (!error) return fallback;

  const data = error.response?.data;

  if (!data) {
    return error.message || fallback;
  }

  if (typeof data.error === 'string') return data.error;
  if (data.error?.message) return data.error.message;

  if (Array.isArray(data.error?.details) && data.error.details.length > 0) {
    return data.error.details[0].message || fallback;
  }

  if (typeof data.message === 'string') return data.message;

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    return data.errors[0].msg || fallback;
  }

  return fallback;
}
