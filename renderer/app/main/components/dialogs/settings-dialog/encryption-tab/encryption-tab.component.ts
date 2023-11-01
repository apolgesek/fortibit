import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService } from '@app/core/services';
import { isControlInvalid } from '@app/utils';
import { IProduct } from '@config/product';
import { Subject, debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs';

@Component({
  selector: 'app-encryption-tab',
  templateUrl: './encryption-tab.component.html',
  styleUrls: ['./encryption-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class EncryptionTabComponent implements OnInit, OnDestroy {
  public encryptionForm: FormGroup;

  public readonly isControlInvalid = isControlInvalid;
  private readonly destroyed: Subject<void> = new Subject();
  private readonly debounceTimeMs = 500;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly configService: ConfigService,
  ) { }

  ngOnInit(): void {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.encryptionForm = this.formBuilder.group({
        passwordLength: new FormControl(
          config.encryption.passwordLength, {
            validators: Validators.compose([Validators.required, Validators.min(6), Validators.max(32)]),
          }),
        lowercase: [config.encryption.lowercase],
        uppercase: [config.encryption.uppercase],
        specialChars: [config.encryption.specialChars],
        numbers: [config.encryption.numbers]
      });

      this.encryptionForm.valueChanges
        .pipe(
          debounceTime(this.debounceTimeMs),
          distinctUntilChanged(),
          takeUntil(this.destroyed)
        ).subscribe((form) => {
          if (this.encryptionForm.invalid) {
            return;
          }

          const configPartial = {
            encryption: {
              passwordLength: form.passwordLength,
              lowercase: form.lowercase,
              uppercase: form.uppercase,
              specialChars: form.specialChars,
              numbers: form.numbers,
            }
          } as Partial<IProduct>;

          this.configService.setConfig(configPartial);
        });
    });
  }

  ngOnDestroy() {
    setTimeout(() => {
      this.destroyed.next();
      this.destroyed.complete();
    }, this.debounceTimeMs);
  }

  onNumberChange(event: KeyboardEvent, controlName: string, maxLength: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.toString();

    if (value.length >= maxLength) {
      input.valueAsNumber = parseInt(value.slice(0, maxLength), 10);
      this.encryptionForm.get(controlName).setValue(input.value);
    }
  }
}
