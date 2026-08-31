/**
 * Trunca un texto a una longitud máxima, añadiendo puntos suspensivos ("…").
 *
 * - Si `text.length` es menor o igual a `maxLength`, retorna el texto sin cambios.
 * - Si `text.length` excede `maxLength`, retorna los primeros `maxLength`
 *   caracteres seguidos de "…".
 *
 * @param text Texto a truncar.
 * @param maxLength Longitud máxima antes de truncar (por defecto 50).
 * @returns El texto original o su versión truncada con "…".
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "…";
}
