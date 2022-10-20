import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ICommunicationService } from '@app/core/models';
import { ConfigService } from '@app/core/services';
import { isControlInvalid } from '@app/utils';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { CommunicationService } from 'injection-tokens';
import { debounceTime, distinctUntilChanged, Subject, take, takeUntil } from 'rxjs';
import { IProduct } from '../../../../../../../product';

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
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
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
        numbers: [config.encryption.numbers],
        idleTime: [config.idleSeconds, Validators.compose([Validators.required, Validators.min(60)])],
        lockOnSystemLock: [config.lockOnSystemLock]
      });

      this.encryptionForm.valueChanges
      .pipe(
        debounceTime(this.debounceTimeMs),
        distinctUntilChanged(),
        takeUntil(this.destroyed)
      ).subscribe((form) => {
        if (this.encryptionForm.valid) {
          const configPartial = {
            encryption: {
              passwordLength: form.passwordLength,
              lowercase: form.lowercase,
              uppercase: form.uppercase,
              specialChars: form.specialChars,
              numbers: form.numbers,
            },
            idleSeconds: form.idleTime,
            lockOnSystemLock: form.lockOnSystemLock
          } as Partial<IProduct>;

          this.configService.setConfig(configPartial);
        }
      });
    });
  }

  ngOnDestroy() {
    setTimeout(() => {
      this.destroyed.next();
      this.destroyed.complete();
    }, this.debounceTimeMs);
  }

  onNumberChange(event: KeyboardEvent, controlName: string, maxLenght: number) {
    const input = event.target as any;
    const value = input.value.toString();

    if (value.length >= maxLenght) {
      input.value = parseInt(value.slice(0, maxLenght));
      this.encryptionForm.get(controlName).setValue(input.value);
    }
  }
}
