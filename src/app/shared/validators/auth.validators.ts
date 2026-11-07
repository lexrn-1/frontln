import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Reglas visibles de contraseña (política pendiente de confirmar con el equipo). */
export const PASSWORD_RULES = [
  { key: 'minLength', label: 'Mínimo 8 caracteres', test: (v: string) => v.length >= 8 },
  { key: 'upper', label: 'Una letra mayúscula', test: (v: string) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { key: 'lower', label: 'Una letra minúscula', test: (v: string) => /[a-záéíóúñ]/.test(v) },
  { key: 'digit', label: 'Un número', test: (v: string) => /\d/.test(v) }
] as const;

export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null) ?? '';
    if (!value) return null;
    const failed = PASSWORD_RULES.filter((r) => !r.test(value)).map((r) => r.key);
    return failed.length ? { passwordPolicy: failed } : null;
  };
}

/** Valida en el grupo que `confirmKey` coincida con `key`; marca el error en el control de confirmación. */
export function matchFieldsValidator(key: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const confirm = group.get(confirmKey);
    const mismatch = !!confirm?.value && group.get(key)?.value !== confirm.value;
    if (confirm) {
      const { mismatch: _ignored, ...rest } = confirm.errors ?? {};
      const next = mismatch ? { ...rest, mismatch: true } : rest;
      confirm.setErrors(Object.keys(next).length ? next : null, { emitEvent: false });
    }
    return mismatch ? { mismatch: true } : null;
  };
}

/**
 * Correo institucional: si `domains` está vacío, se acepta cualquier dominio que contenga `.edu`.
 */
export function institutionalEmailValidator(domains: readonly string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = ((control.value as string | null) ?? '').trim().toLowerCase();
    if (!value || !value.includes('@')) return null;
    const domain = value.split('@')[1] ?? '';
    const ok = domains.length
      ? domains.some((d) => domain === d || domain.endsWith(`.${d}`))
      : /(^|\.)edu(\.[a-z]{2,})?$/.test(domain) || domain.includes('.edu.');
    return ok ? null : { institutional: true };
  };
}

/** Username: 3–20 caracteres en minúscula, números, punto o guion bajo; empieza por letra. */
export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,19}$/;

/** Texto con al menos un carácter no blanco. */
export function notBlankValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    return value && !value.trim() ? { required: true } : null;
  };
}
