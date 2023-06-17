import { AbstractControl, FormGroup } from '@angular/forms';

export function isControlInvalid(control: AbstractControl | null): boolean {
  return Boolean(control?.invalid && control?.dirty);
}

export function markAllAsDirty(formGroup: FormGroup): void {
  Object.keys(formGroup.controls).forEach(field => {
    const control = formGroup.get(field);

    if (control) {
      control.markAsDirty();
    }

    if (control instanceof FormGroup) {
      markAllAsDirty(control);
    }
  });
}
