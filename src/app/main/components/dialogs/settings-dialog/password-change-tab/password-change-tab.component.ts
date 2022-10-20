import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ICommunicationService } from '@app/core/models';
import { WorkspaceService, ConfigService, ModalService, NotificationService } from '@app/core/services';
import { MasterPasswordSetupComponent } from '@app/main/components/master-password-setup/master-password-setup.component';
import { valueMatchValidator } from '@app/shared/validators/value-match.validator';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/ipc-channel.enum';
import { CommunicationService } from 'injection-tokens';
import { debounceTime, delay, distinctUntilChanged, from, map, Observable, Subject, take, takeUntil, tap } from 'rxjs';
import { IAppConfig } from '../../../../../../../app-config';
import { IProduct } from '../../../../../../../product';

@Component({
  selector: 'app-password-change-tab',
  templateUrl: './password-change-tab.component.html',
  styleUrls: ['./password-change-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MasterPasswordSetupComponent
  ]
})
export class PasswordChangeTabComponent implements OnInit, OnDestroy {
  public readonly isControlInvalid = isControlInvalid;
  public passwordForm!: FormGroup;

  private readonly destroyed: Subject<void> = new Subject();
  private readonly debounceTimeMs = 500;

  get passwordsGroup(): FormGroup {
    return this.passwordForm.get('newPasswords') as FormGroup;
  }

  get passwordFormEnabled(): boolean {
    if (!this.isSaved || this.isLocked) {
      if (this.passwordForm.enabled) {
        this.passwordForm.disable();
      }

      return false;
    } else {
      if (this.passwordForm.disabled) {
        this.passwordForm.enable();
      }

      return true;
    }
  }

  get isLocked(): boolean {
    return this.workspaceService.isLocked;
  }

  get isSaved(): boolean {
    return Boolean(this.workspaceService.file);
  }

  constructor(
    private readonly formBuilder: FormBuilder,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly modalService: ModalService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly workspaceService: WorkspaceService) {}

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.passwordForm = this.formBuilder.group({
        autoType: [config.autoTypeEnabled],
        currentPassword: [null, { validators: [Validators.required], asyncValidators: [this.passwordValidator()], updateOn: 'blur' }],
        newPasswords: this.formBuilder.group({
          password: [null, { validators: Validators.compose([Validators.required, Validators.minLength(6)]) }],
          repeatPassword: [null]
        }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
      });

      this.passwordForm.get('autoType').valueChanges
      .pipe(
        debounceTime(this.debounceTimeMs),
        distinctUntilChanged(),
        takeUntil(this.destroyed)
      ).subscribe((value) => {
        const configPartial = {
          autoTypeEnabled: value,
        } as Partial<IAppConfig>;

        this.configService.setConfig(configPartial);
      });
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  async savePassword() {
    markAllAsDirty(this.passwordForm);

    if (this.passwordForm.invalid) {
      return;
    }

    const success = await this.workspaceService.saveNewDatabase(this.passwordForm.value.newPasswords.password, { forceNew: false });
    if (success) {
      this.passwordForm.reset();
    }
  }

  saveFile() {
    this.modalService.openMasterPasswordWindow();
  }

  restoreDefaults() {
    const configPartial = {
      encryption: {
        passwordLength: 15,
        lowercase: true,
        uppercase: true,
        specialChars: true,
        numbers: true,
      },
      idleSeconds: 600,
      lockOnSystemLock: true,
      displayIcons: true
    } as Partial<IProduct>;

    this.configService.setConfig(configPartial);

    this.notificationService.add({
      type: 'success',
      alive: 5000,
      message: 'Default settings restored.'
    });
  }

  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const password = control.value;

      return from(this.communicationService.ipcRenderer.invoke(IpcChannel.ValidatePassword, password))
        .pipe(
          tap(() => control.markAsPristine()),
          delay(300),
          tap(() => control.markAsDirty()),
          map(x =>  {
            return x ? null : { incorrectPassword: true }
          })
        );
    };
  }
}
