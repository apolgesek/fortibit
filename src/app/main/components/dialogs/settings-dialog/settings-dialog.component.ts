/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ComponentRef, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ConfigService } from '@app/core/services/config.service';
import { DialogsService } from '@app/core/services/dialogs.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { ModalService } from '@app/core/services/modal.service';
import { StorageService } from '@app/core/services/storage.service';
import { IAdditionalData, IModal } from '@app/shared';
import { valueMatchValidator } from '@app/shared/validators';
import { isControlInvalid, markAllAsDirty } from '@app/utils';
import { IpcChannel } from '@shared-renderer/index';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AboutDialogComponent } from '../about-dialog/about-dialog.component';

enum Tab {
  Encryption,
  Compression
}

@Component({
  selector: 'app-settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent implements OnInit, IModal {
  public readonly tabs = Tab;
  public readonly ref!: ComponentRef<AboutDialogComponent>;
  public readonly additionalData!: IAdditionalData;
  public readonly isControlInvalid = isControlInvalid;

  public passwordForm!: FormGroup;
  public compressionForm!: FormGroup;

  public currentTab: Tab = Tab.Encryption;

  get passwordsGroup(): FormGroup {
    return this.passwordForm.get('newPasswords') as FormGroup;
  }

  get passwordFormEnabled(): boolean {
    if (!this.storageService.file) {
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

  constructor(
    private readonly modalService: ModalService,
    private readonly formBuilder: FormBuilder,
    private readonly electronService: ElectronService,
    private readonly storageService: StorageService,
    private readonly dialogsService: DialogsService,
    private readonly configService: ConfigService,
  ) { }

  ngOnInit() {
    this.passwordForm = this.formBuilder.group({
      currentPassword: [null, { asyncValidators: [this.passwordValidator()]}],
      newPasswords: this.formBuilder.group({
        password: [null, { validators: Validators.compose([Validators.required, Validators.minLength(6)]) }],
        repeatPassword: [null]
      }, { validators: [ valueMatchValidator('password', 'repeatPassword') ]}),
    }, { updateOn: 'blur' });

    this.compressionForm = this.formBuilder.group({
      compression: [this.configService.config?.compressionEnabled]
    });
  }

  async savePassword() {
    markAllAsDirty(this.passwordForm);

    if (this.passwordForm.invalid) {
      return;
    }

    const success = await this.storageService.saveNewDatabase(this.passwordForm.value.newPasswords.password, { forceNew: false });

    if (success) {
      this.close();
    }
  }

  close() {
    this.modalService.close(this.ref);
  }

  saveFile() {
    this.dialogsService.openMasterPasswordWindow();
    this.close();
  }

  setTab(tab: Tab) {
    this.currentTab = tab;
  }

  onCompressionChange() {
    this.electronService.ipcRenderer.send('setCompression', this.compressionForm.value.compression);
  }

  private passwordValidator(): ValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const password = control.value;

      return from(this.electronService.ipcRenderer.invoke(IpcChannel.ValidatePassword, password))
        .pipe(map(x => x ? null : { incorrectPassword: true }));
    };
  }
}
