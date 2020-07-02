import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from '../core/services';
import { PasswordStoreService } from '../core/services/password-store.service';
import { fade } from '@app/shared/animations/fade-slide.animation';
const logoURL = require('../../assets/images/lock.svg');  

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [ fade() ]
})
export class HomeComponent implements OnInit {

  public loginForm: FormGroup;
  public version: string;

  get isInvalid(): boolean {
    return this.passwordStore.isInvalidPassword;
  }

  get logoURL(): string {
    return logoURL.default;
  }

  get filePath(): string {
    return this.passwordStore.file.filePath;
  }

  constructor(
    private _fb: FormBuilder,
    private passwordStore: PasswordStoreService,
    private electronService: ElectronService,
    private zone: NgZone
  ) { }

  ngOnInit(): void { 
    this.loginForm = this._fb.group({
      password: ['', Validators.required]
    });

    this.electronService.ipcRenderer.send('appVersion');
    this.electronService.ipcRenderer.on('appVersion', (_, data) => {
      this.zone.run(() => {
        this.version = data;
      });
    })
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
