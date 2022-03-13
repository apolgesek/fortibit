import { DOCUMENT } from '@angular/common';
import { Component, OnInit, NgZone, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupRepository } from '@app/core/repositories';
import { ConfigService } from '@app/core/services/config.service';
import { ElectronService } from '@app/core/services/electron/electron.service';
import { StorageService } from '@app/core/services/storage.service';
import { TreeNode } from '@circlon/angular-tree-component';
import { IpcChannel } from '@shared-renderer/index';
import { IpcRendererEvent } from 'electron/main';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IAppConfig } from '../../../../../app-config';

@Component({
  selector: 'app-master-password',
  templateUrl: './master-password.component.html',
  styleUrls: ['./master-password.component.scss']
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;
  public isInvalidPassword = false;

  private readonly destroyed$: Subject<void> = new Subject();
  private onDecryptedContent: (_: IpcRendererEvent, { decrypted }: { decrypted: string }) => void;

  get config(): IAppConfig {
    return this.configService.config as IAppConfig;
  }

  get filePath(): string {
    return this.storageService.file?.filePath ?? '';
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly zone: NgZone,
    private readonly router: Router,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly groupRepository: GroupRepository,
    private readonly electronService: ElectronService,
    @Inject(DOCUMENT) private readonly document: Document
  ) { 
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.onDecryptedContent = (_: IpcRendererEvent, { decrypted }: { decrypted: string }) => {
      this.zone.run(() => {
        if (decrypted) {
          this.storageService.setDateSaved();
          this.storageService.loadDatabase(decrypted);
        } else {
          this.isInvalidPassword = true;
          this.animate('.brand .brand-logo', 'animate-invalid', 500);
        }
      });
    };
  }

  async ngOnInit() {
    this.electronService.ipcRenderer.on(IpcChannel.DecryptedContent, this.onDecryptedContent);

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
    this.isInvalidPassword = false;

    this.destroyed$.next();
    this.destroyed$.complete();

    this.electronService.ipcRenderer.off(IpcChannel.DecryptedContent, this.onDecryptedContent);
  }

  async onLoginSubmit() {
    await this.storageService.clearDatabase();

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