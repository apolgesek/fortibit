import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ElectronService } from '../core/services';
import { StorageService } from '../core/services/storage.service';
import { fade } from '@app/shared/animations/fade-slide.animation';

const logoURL = require('../../assets/images/lock.svg');

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  animations: [
    fade()
  ]
})
export class MainComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;
  public version: string;

  get isInvalidPassword(): boolean {
    return this.storageService.isInvalidPassword;
  }

  get logoURL(): string {
    return logoURL.default;
  }

  get filePath(): string {
    return this.storageService.file.filePath;
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  constructor(
    private fb: FormBuilder,
    private zone: NgZone,
    private storageService: StorageService,
    private electronService: ElectronService
  ) { }

  ngOnInit() { 
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.electronService.ipcRenderer.send('appVersion');
    this.electronService.ipcRenderer.on('appVersion', (_, data) => {
      this.zone.run(() => {
        this.version = data;
      });
    })
  }

  ngOnDestroy() {
    this.loginForm.reset();
    this.storageService.isInvalidPassword = false;
  }

  onLoginSubmit() {
    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    this.electronService.ipcRenderer.send('authAttempt', this.loginForm.value.password);
  }
}
