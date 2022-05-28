import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ConfigService, ElectronService, NotificationService } from '@app/core/services';
import { isControlInvalid } from '@app/utils';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { IProduct } from '../../../../../../../product';

@Component({
  selector: 'app-encryption-tab',
  templateUrl: './encryption-tab.component.html',
  styleUrls: ['./encryption-tab.component.scss']
})
export class EncryptionTabComponent implements OnInit, OnDestroy {
  public encryptionForm: FormGroup;

  public readonly isControlInvalid = isControlInvalid;
  private readonly destroyed: Subject<void> = new Subject();
  private readonly debounceTimeMs = 500;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly electronService: ElectronService,
    private readonly configService: ConfigService,
  ) { }

  ngOnInit(): void {
    this.encryptionForm = this.formBuilder.group({
      passwordLength: new FormControl(
        this.configService.config.encryption.passwordLength, {
        validators: Validators.compose([Validators.required, Validators.min(6), Validators.max(32)]),
      }),
      lowercase: [this.configService.config.encryption.lowercase],
      uppercase: [this.configService.config.encryption.uppercase],
      specialChars: [this.configService.config.encryption.specialChars],
      numbers: [this.configService.config.encryption.numbers],
      idleTime: [this.configService.config.idleSeconds, Validators.compose([Validators.required, Validators.min(60)])],
      lockOnSystemLock: [this.configService.config.lockOnSystemLock]
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

          this.electronService.ipcRenderer.send(IpcChannel.ChangeEncryptionSettings, configPartial);
          this.configService.config = { ...this.configService.config, ...configPartial };
        }
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
