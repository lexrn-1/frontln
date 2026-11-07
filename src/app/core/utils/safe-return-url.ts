/** Solo acepta rutas internas para evitar redirecciones abiertas (`//evil.com`, `https://...`). */
export function safeReturnUrl(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
