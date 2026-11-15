/** Copia texto al portapapeles. Devuelve `false` si el navegador lo impide (sin permiso o sin HTTPS). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
