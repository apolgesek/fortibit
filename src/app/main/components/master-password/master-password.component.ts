import { DOCUMENT } from '@angular/common';
import { Component, OnInit, NgZone, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupRepository } from '@app/core/repositories';
import { CoreService, ElectronService, StorageService } from '@app/core/services';
import { TreeNode } from '@circlon/angular-tree-component';
import { IpcChannel } from '@shared-models/*';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-master-password',
  templateUrl: './master-password.component.html',
  styleUrls: ['./master-password.component.scss']
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;

  private readonly destroyed$: Subject<void> = new Subject();

  get config(): any {
    return this.coreService.config;
  }

  get isInvalidPassword(): boolean {
    return this.coreService.isInvalidPassword;
  }

  get filePath(): string {
    return this.storageService.file?.filePath ?? '';
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  constructor(
    private fb: FormBuilder,
    private zone: NgZone,
    private router: Router,
    private coreService: CoreService,
    private storageService: StorageService,
    private groupRepository: GroupRepository,
    private electronService: ElectronService,
    @Inject(DOCUMENT) private document: Document
  ) { 
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });
  }

  async ngOnInit() {
    this.electronService.ipcRenderer.on(IpcChannel.DecryptedContent, (_, { decrypted }) => {
      this.zone.run(() => {
        if (decrypted) {
          this.storageService.setDateSaved();
          this.storageService.loadDatabase(decrypted);
        } else {
          this.coreService.isInvalidPassword = true;
          this.animate('.brand .brand-logo', 'animate-invalid', 500);
        }
      });
    });

    this.storageService.loadedDatabaseSource$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(async () => {
        const group = await this.groupRepository.get(1);
        await this.storageService.selectGroup({ node: { data: group } as TreeNode});
      
        this.router.navigate(['/dashboard']);
      });
  }

  ngOnDestroy() {
    this.loginForm.reset();
    this.coreService.isInvalidPassword = false;

    this.destroyed$.next();
    this.destroyed$.complete();
  }

  async onLoginSubmit() {
    await this.storageService.clearDb();

    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    this.electronService.ipcRenderer.send(IpcChannel.DecryptDatabase, this.loginForm.value.password);
  }

  animate(selector: string, animationClass: string, duration = 500) {
    this.document.querySelector(selector)?.classList.add(animationClass);

    setTimeout(() => {
      this.document.querySelector(selector)?.classList.remove(animationClass);
    }, duration);
  }
}