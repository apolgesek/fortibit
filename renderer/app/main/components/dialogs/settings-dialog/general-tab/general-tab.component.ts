import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfigService, NotificationService, WorkspaceService } from '@app/core/services';
import { MasterPasswordSetupComponent } from '@app/main/components/master-password-setup/master-password-setup.component';
import { HotkeyBinderDirective } from '@app/main/directives/hotkey-binder.directive';
import { isControlInvalid } from '@app/utils';
import { FeatherModule } from 'angular-feather';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { IAppConfig } from '../../../../../../../app-config';
import { getDefaultConfig } from '@shared-renderer/default-config';
import { IMessageBroker } from '@app/core/models';
import { MessageBroker } from 'injection-tokens';

@Component({
  selector: 'app-general-tab',
  templateUrl: './general-tab.component.html',
  styleUrls: ['./general-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FeatherModule,
    MasterPasswordSetupComponent,
    HotkeyBinderDirective
  ]
})
export class GeneralTabComponent implements OnInit {
  public readonly isControlInvalid = isControlInvalid;
  public passwordForm!: FormGroup;

  private readonly debounceTimeMs = 500;

  constructor(
    @Inject(MessageBroker) private readonly messageBroker: IMessageBroker,
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
    this.passwordForm = this.formBuilder.group({
      toggle: this.formBuilder.group({
        autoType: [null],
        lockOnSystemLock: [null],
        saveOnLock: [null],
      }),
      input: this.formBuilder.group({
        idleTime: [0, Validators.compose([Validators.required, Validators.min(60)])],
        clipboardTime: [0, Validators.compose([Validators.required, Validators.min(0)])],
        autotypeShortcut: [null],
        autotypePasswordOnlyShortcut: [null],
        autotypeUsernameOnlyShortcut: [null]
      }),
    });
  
    this.configService.configLoadedSource$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(config => {
      this.passwordForm.setValue({
        toggle: {
          autoType: config.autoTypeEnabled,
          lockOnSystemLock: config.lockOnSystemLock,
          saveOnLock: config.saveOnLock,
        },
        input: {
          idleTime: config.idleSeconds,
          clipboardTime: config.clipboardClearTimeMs / 1000,
          autotypeShortcut: config.autocompleteShortcut,
          autotypePasswordOnlyShortcut: config.autocompletePasswordOnlyShortcut,
          autotypeUsernameOnlyShortcut: config.autocompleteUsernameOnlyShortcut
        },
      }, { emitEvent: false });
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
            autocompleteShortcut: form.autotypeShortcut,
            autocompletePasswordOnlyShortcut: form.autotypePasswordOnlyShortcut,
            autocompleteUsernameOnlyShortcut: form.autotypeUsernameOnlyShortcut
          } as Partial<IAppConfig>;

          this.configService.setConfig(configPartial);
        });
  }

  restoreDefaults() {
    this.configService.setConfig(getDefaultConfig(this.messageBroker.platform));
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
