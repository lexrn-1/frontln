import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Longitud máxima propuesta para el nombre de sala (el plan pide manejar "longitud excesiva"; límite por confirmar). */
export const ROOM_NAME_MAX_LENGTH = 80;

/** Obligatorio tras recortar espacios: "   " cuenta como vacío. */
export function requiredTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    ((control.value as string | null) ?? '').trim() ? null : { required: true };
}

/** Valida el formato con la función recibida (así `shared` no conoce el formato del código de sala). */
export function codeFormatValidator(isValid: (raw: string) => boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = ((control.value as string | null) ?? '').trim();
    return !value || isValid(value) ? null : { codeFormat: true };
  };
}
