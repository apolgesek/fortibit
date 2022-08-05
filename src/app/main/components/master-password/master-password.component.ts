import { DOCUMENT } from '@angular/common';
import { Component, OnInit, NgZone, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute  } from '@angular/router';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '@app/core/models';
import { ConfigService } from '@app/core/services/config.service';
import { StorageService } from '@app/core/services/storage.service';
import { TreeNode } from '@circlon/angular-tree-component';
import { IpcChannel } from '@shared-renderer/index';
import { IpcRendererEvent } from 'electron/main';
import { from, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { IAppConfig } from '../../../../../app-config';

@Component({
  selector: 'app-master-password',
  templateUrl: './master-password.component.html',
  styleUrls: ['./master-password.component.scss']
})
export class MasterPasswordComponent implements OnInit, OnDestroy {
  public loginForm: FormGroup;
  public isInvalidPassword = false;
  public config: IAppConfig;

  private readonly destroyed$: Subject<void> = new Subject();
  private onDecryptedContent: (_: IpcRendererEvent, { decrypted }: { decrypted: string }) => void;

  get filePath(): string {
    return this.storageService.file?.filePath ?? '';
  }

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly zone: NgZone,
    private readonly route: ActivatedRoute,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
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

  ngOnInit() {
    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed$)).subscribe(config => {
      this.config = config;
    });

    this.communicationService.ipcRenderer.on(IpcChannel.DecryptedContent, this.onDecryptedContent);
    this.storageService.loadedDatabase$
      .pipe(
        switchMap(() => from(this.storageService.selectGroup({ node: { data: { id: 1 }} as TreeNode}))),
        takeUntil(this.destroyed$)
      ).subscribe(() => {
        this.storageService.unlock();
      });
  }

  // make sure window preview displays password entry page
  ngAfterViewInit() {
    if (this.route.snapshot.queryParams.minimize === 'true') {
      setTimeout(() => {
        this.communicationService.ipcRenderer.send(IpcChannel.Minimize);
      });
    }
  }

  ngOnDestroy() {
    this.loginForm.reset();
    this.isInvalidPassword = false;

    this.destroyed$.next();
    this.destroyed$.complete();

    this.communicationService.ipcRenderer.off(IpcChannel.DecryptedContent, this.onDecryptedContent);
  }

  async onLoginSubmit() {
    await this.storageService.clearDatabase();

    Object.values(this.loginForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.loginForm.invalid) {
      return;
    }

    this.communicationService.ipcRenderer.send(IpcChannel.DecryptDatabase, this.loginForm.value.password);
  }

  animate(selector: string, animationClass: string, duration = 500) {
    this.document.querySelector(selector)?.classList.add(animationClass);

    setTimeout(() => {
      this.document.querySelector(selector)?.classList.remove(animationClass);
    }, duration);
  }
}