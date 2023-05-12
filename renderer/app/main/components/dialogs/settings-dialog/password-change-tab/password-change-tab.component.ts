import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ICommunicationService } from '@app/core/models';
import { ConfigService, NotificationService, WorkspaceService } from '@app/core/services';
import { MasterPasswordSetupComponent } from '@app/main/components/master-password-setup/master-password-setup.component';
import { isControlInvalid } from '@app/utils';
import { FeatherModule } from 'angular-feather';
import { CommunicationService } from 'injection-tokens';
import { Subject, debounceTime, distinctUntilChanged, take, takeUntil } from 'rxjs';
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
    FeatherModule,
    MasterPasswordSetupComponent
  ]
})
export class PasswordChangeTabComponent implements OnInit, OnDestroy {
  public readonly isControlInvalid = isControlInvalid;
  public passwordForm!: FormGroup;

  private readonly destroyed: Subject<void> = new Subject();
  private readonly debounceTimeMs = 500;

  get isLocked(): boolean {
    return this.workspaceService.isLocked;
  }

  get isSaved(): boolean {
    return Boolean(this.workspaceService.file);
  }

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly formBuilder: FormBuilder,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly workspaceService: WorkspaceService
  ) {}

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(take(1)).subscribe(config => {
      this.passwordForm = this.formBuilder.group({
        toggle: this.formBuilder.group({
          autoType: [config.autoTypeEnabled],
          lockOnSystemLock: [config.lockOnSystemLock],
          saveOnLock: [config.saveOnLock],
        }),
        input: this.formBuilder.group({
          idleTime: [config.idleSeconds, Validators.compose([Validators.required, Validators.min(60)])],
          clipboardTime: [config.clipboardClearTimeMs / 1000, Validators.compose([Validators.required, Validators.min(0)])],
        }),
      });

      this.passwordForm.get('toggle').valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.destroyed)
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
        takeUntil(this.destroyed)
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

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
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
      saveOnLock: false,
    } as Partial<IProduct>;

    this.configService.setConfig(configPartial);

    this.notificationService.add({
      type: 'success',
      alive: 5000,
      message: 'Default settings restored.'
    });
  }

  onNumberChange(event: KeyboardEvent, controlName: string, maxLength: number) {
    const input = event.target as any;
    const value = input.value.toString();

    if (value.length >= maxLength) {
      input.value = parseInt(value.slice(0, maxLength));
      this.passwordForm.get(controlName).setValue(input.value);
    }
  }
}
