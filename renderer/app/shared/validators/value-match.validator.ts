import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function valueMatchValidator(...controlPaths: string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const isValid = controlPaths.every(x => control.get(x)?.value === control.get(controlPaths[0])?.value);

    return isValid ? null : { notSame: true };
  };
}