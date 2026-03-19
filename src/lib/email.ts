export function isValidEmail(email: string) {
  // Validación práctica (no perfecta) para evitar errores comunes
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
}

