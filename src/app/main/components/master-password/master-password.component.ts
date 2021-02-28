import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { CoreService, ElectronService, StorageService } from '@app/core/services';

const logoURL = require('../../../../assets/images/lock.svg');
@Component({
  selector: 'app-master-password',
  templateUrl: './master-password.component.html',
  styleUrls: ['./master-password.component.scss']
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;

  get version(): string {
    return this.coreService.version;
  }

  get isInvalidPassword(): boolean {
    return this.coreService.isInvalidPassword;
  }

  get logoURL(): string {
    return logoURL.default;
  }

  get filePath(): string {
    return this.storageService.file?.filePath;
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  constructor(
    private fb: FormBuilder,
    private zone: NgZone,
    private coreService: CoreService,
    private storageService: StorageService,
    private electronService: ElectronService
  ) { }

  ngOnInit() { 
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });
  }

  ngOnDestroy() {
    this.loginForm.reset();
    this.coreService.isInvalidPassword = false;
  }

  onLoginSubmit() {
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    this.electronService.ipcRenderer.send('decryptDatabase', this.loginForm.value.password);
  }
}