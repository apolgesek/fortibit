import { Inject, Injectable } from '@angular/core';
import { IAppConfig } from '@config/app-config';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { Observable, ReplaySubject, Subject, forkJoin, from } from 'rxjs';
import { IMessageBroker } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  public readonly configLoadedSource$: Observable<IAppConfig>;
  private readonly configLoaded: Subject<IAppConfig> = new ReplaySubject(1);
  private config: IAppConfig | null = null;

  constructor(@Inject(MessageBroker) private readonly messageBroker: IMessageBroker) {
    this.configLoadedSource$ = this.configLoaded.asObservable();
  }

  setConfig(config: Partial<IAppConfig>) {
    forkJoin([
      from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ChangeEncryptionSettings, config)),
      from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ChangeScreenLockSettings, config)),
      from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ChangeWindowsCaptureProtection, config))
    ]).subscribe(() => {
      this.config = {...this.config, ...config};
      this.messageBroker.ipcRenderer.send(IpcChannel.ConfigChanged, config);

      this.configLoaded.next(this.config);
    });
  }
}
