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

/** Empty policy accepts any valid email; configured domains require exact matching. */
export function institutionalEmailValidator(domains: readonly string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = ((control.value as string | null) ?? '').trim().toLowerCase();
    if (!value || !value.includes('@') || !domains.length) return null;
    const domain = value.split('@')[1] ?? '';
    return domains.some((d) => domain === d.trim().toLowerCase()) ? null : { institutional: true };
  };
}
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').normalize('NFKC').trim();
    return !value || USERNAME_PATTERN.test(value) ? null : { pattern: true };
  };
}

/** Texto con al menos un carácter no blanco. */
export function notBlankValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    return value && !value.trim() ? { required: true } : null;
  };
}
