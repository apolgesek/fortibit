import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService, NotificationService, WorkspaceService } from '@app/core/services';
import { MasterPasswordSetupComponent } from '@app/main/components/master-password-setup/master-password-setup.component';
import { isControlInvalid } from '@app/utils';
import { FeatherModule } from 'angular-feather';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IAppConfig } from '../../../../../../../app-config';
import { IProduct } from '../../../../../../../product';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-password-change-tab',
  templateUrl: './password-change-tab.component.html',
  styleUrls: ['./password-change-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    MasterPasswordSetupComponent
  ]
})
export class PasswordChangeTabComponent implements OnInit {
  public readonly isControlInvalid = isControlInvalid;
  public passwordForm!: FormGroup;

  private readonly debounceTimeMs = 500;

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly formBuilder: FormBuilder,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly workspaceService: WorkspaceService
  ) {}

  get isLocked(): boolean {
    return this.workspaceService.isLocked;
  }

  get isSaved(): boolean {
    return Boolean(this.workspaceService.file);
  }

  ngOnInit() {
    this.configService.configLoadedSource$.pipe().subscribe(config => {
      this.passwordForm = this.formBuilder.group({
        toggle: this.formBuilder.group({
          autoType: [config.autoTypeEnabled],
          lockOnSystemLock: [config.lockOnSystemLock],
          saveOnLock: [config.saveOnLock],
        }),
        input: this.formBuilder.group({
          idleTime: [config.idleSeconds, Validators.compose([Validators.required, Validators.min(60)])],
          clipboardTime: [
            config.clipboardClearTimeMs / 1000,
            Validators.compose([Validators.required, Validators.min(0)])
          ],
        }),
      });

      this.passwordForm.get('toggle').valueChanges
        .pipe(
          distinctUntilChanged(),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe((form) => {
          if (this.passwordForm.get('toggle').invalid) {
            return;
          }

          const configPartial = {
            autoTypeEnabled: form.autoType,
            lockOnSystemLock: form.lockOnSystemLock,
            saveOnLock: form.saveOnLock,
          } as Partial<IAppConfig>;

          this.configService.setConfig(configPartial);
        });

      this.passwordForm.get('input').valueChanges
        .pipe(
          debounceTime(this.debounceTimeMs),
          distinctUntilChanged(),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe((form) => {
          if (this.passwordForm.get('input').invalid) {
            return;
          }

          const configPartial = {
            idleSeconds: form.idleTime,
            clipboardClearTimeMs: form.clipboardTime * 1000,
          } as Partial<IAppConfig>;

          this.configService.setConfig(configPartial);
        });
    });
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
      clipboardClearTimeMs: 15000,
      lockOnSystemLock: true,
      displayIcons: true,
      biometricsAuthenticationEnabled: false,
      autoTypeEnabled: true,
      saveOnLock: false,
    } as Partial<IProduct>;

    this.configService.setConfig(configPartial);

    this.notificationService.add({
      type: 'success',
      alive: 10 * 1000,
      message: 'Default settings restored.'
    });
  }

  onNumberChange(event: KeyboardEvent, controlName: string, maxLength: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.toString();

    if (value.length >= maxLength) {
      input.valueAsNumber = parseInt(value.slice(0, maxLength), 10);
      this.passwordForm.get(controlName).setValue(input.value);
    }
  }
}
