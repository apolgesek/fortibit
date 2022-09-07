import { DOCUMENT } from '@angular/common';
import { Component, OnInit, NgZone, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute  } from '@angular/router';
import { CommunicationService } from '@app/app.module';
import { GroupIds } from '@app/core/enums';
import { ICommunicationService } from '@app/core/models';
import { EntryManager, GroupManager, WorkspaceService } from '@app/core/services';
import { ConfigService } from '@app/core/services/config.service';
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
  public config: IAppConfig;
  public passwordVisible = false;
  public filePath: string = '';

  private readonly destroyed$: Subject<void> = new Subject();
  private onDecryptedContent: (_: IpcRendererEvent, { decrypted }: { decrypted: string }) => void;

  get passwordControl(): FormControl {
    return this.loginForm.get('password') as FormControl;
  }

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly groupManager: GroupManager,
    private readonly entryManager: EntryManager,
    private readonly fb: FormBuilder,
    private readonly zone: NgZone,
    private readonly route: ActivatedRoute,
    private readonly configService: ConfigService,
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    @Inject(DOCUMENT) private readonly document: Document
  ) { 
    this.loginForm = this.fb.group({
      password: ['', Validators.required]
    });

    this.onDecryptedContent = (_: IpcRendererEvent, { decrypted }: { decrypted: string }) => {
      this.zone.run(() => {
        if (decrypted) {
          this.workspaceService.setDateSaved();
          this.workspaceService.loadDatabase(decrypted);
        } else {
          this.loginForm.get('password').setErrors({ invalidPassword: true });
          this.animate('.brand .brand-logo', 'animate-invalid', 500);
        }
      });
    };
  }

  ngOnInit() {
    this.filePath = this.workspaceService.file?.filePath ?? '';

    this.configService.configLoadedSource$.pipe(takeUntil(this.destroyed$)).subscribe(config => {
      this.config = config;
    });

    this.communicationService.ipcRenderer.on(IpcChannel.DecryptedContent, this.onDecryptedContent);

    this.workspaceService.loadedDatabase$
    .pipe(
      switchMap(() => from(this.selectDefaultGroup())),
      takeUntil(this.destroyed$)
    ).subscribe(() => {
      this.workspaceService.unlock();
    });
  }

  async selectDefaultGroup() {
    this.groupManager.selectGroup(GroupIds.Root);
    this.entryManager.setByGroup(GroupIds.Root);
    this.entryManager.updateEntries();
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

    this.destroyed$.next();
    this.destroyed$.complete();

    this.communicationService.ipcRenderer.off(IpcChannel.DecryptedContent, this.onDecryptedContent);
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  createNew() {
    this.communicationService.ipcRenderer.invoke(IpcChannel.CreateNew).then(() => {
      this.workspaceService.createNew();
    });
  }

  async onLoginSubmit() {
    await this.workspaceService.clearDatabase();

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