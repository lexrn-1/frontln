import { AbstractControl } from '@angular/forms';

/** Primer mensaje aplicable al control, solo si debe mostrarse (tocado o formulario enviado). */
export function controlError(
  control: AbstractControl | null,
  messages: Record<string, string>,
  submitted: boolean
): string | null {
  if (!control || !control.errors || !(control.touched || submitted)) {
    return null;
  }
  const key = Object.keys(messages).find((k) => control.errors?.[k]);
  return key ? messages[key] : null;
}

/** Lleva el foco al primer campo inválido para que el lector anuncie su error. */
export function focusFirstInvalid(root: HTMLElement): void {
  // Tras el ciclo de detección de cambios, cuando `aria-invalid` ya está aplicado.
  setTimeout(() => {
    const target = root.querySelector<HTMLElement>('input[aria-invalid="true"]');
    target?.focus();
  });
}
