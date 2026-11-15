export interface FileLimits {
  maxSizeBytes: number;
  maxFiles: number;
  allowedExtensions: readonly string[];
}

/** Tipos MIME esperados por extensión. Si el navegador no informa tipo (cadena vacía) se acepta por extensión. */
const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain']
};

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Valor para el atributo `accept` del selector de archivos. */
export function acceptAttribute(limits: FileLimits): string {
  return limits.allowedExtensions.map((e) => `.${e}`).join(',');
}

export interface FileValidation {
  accepted: File[];
  /** Un mensaje por archivo rechazado, listo para mostrar. */
  issues: string[];
}

/**
 * Valida extensión, tipo MIME, tamaño (no vacío ni mayor al máximo) y la cantidad total
 * (`alreadySelected` + aceptados). El backend debe repetir estas comprobaciones.
 */
export function validateFiles(candidates: readonly File[], alreadySelected: number, limits: FileLimits): FileValidation {
  const accepted: File[] = [];
  const issues: string[] = [];
  for (const file of candidates) {
    const ext = extensionOf(file.name);
    if (!ext || !limits.allowedExtensions.includes(ext)) {
      issues.push(`«${file.name}»: tipo de archivo no permitido.`);
    } else if (file.type && MIME_BY_EXTENSION[ext] && !MIME_BY_EXTENSION[ext].includes(file.type)) {
      issues.push(`«${file.name}»: el contenido no coincide con la extensión .${ext}.`);
    } else if (file.size === 0) {
      issues.push(`«${file.name}»: el archivo está vacío.`);
    } else if (file.size > limits.maxSizeBytes) {
      issues.push(`«${file.name}»: supera el máximo de ${formatBytes(limits.maxSizeBytes)}.`);
    } else if (alreadySelected + accepted.length >= limits.maxFiles) {
      issues.push(`«${file.name}»: solo puedes adjuntar hasta ${limits.maxFiles} archivos por mensaje.`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, issues };
}
