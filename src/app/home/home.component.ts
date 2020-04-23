import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from '../core/services';
import { PasswordStoreService } from '../core/services/password-store.service';
const logoURL = require('../../assets/images/lock.svg');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  public loginForm: FormGroup;

  get isInvalid() {
    return this.passwordStore.isInvalidPassword;
  }

  get logoURL() {
    return logoURL;
  }

  get filePath() {
    return this.passwordStore.filePath;
  }

  constructor(
    private _fb: FormBuilder,
    private passwordStore: PasswordStoreService,
    private electronService: ElectronService
  ) { }

  ngOnInit(): void { 
    this.loginForm = this._fb.group({
      password: ['', Validators.required]
    });
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
