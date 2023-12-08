import { Inject, Injectable } from '@angular/core';
import { Configuration } from '@config/configuration';
import { IpcChannel } from '@shared-renderer/index';
import { MessageBroker } from 'injection-tokens';
import { Observable, ReplaySubject, Subject, forkJoin, from } from 'rxjs';
import { IMessageBroker } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  public readonly configLoadedSource$: Observable<Configuration>;
  private readonly configLoaded: Subject<Configuration> = new ReplaySubject(1);
  private config: Configuration | null = null;

  constructor(@Inject(MessageBroker) private readonly messageBroker: IMessageBroker) {
    this.configLoadedSource$ = this.configLoaded.asObservable();
  }

  setConfig(config: Partial<Configuration>) {
    this.config = {...this.config, ...config};

    forkJoin([
      from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ChangeEncryptionSettings, this.config)),
      from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ChangeScreenLockSettings, this.config)),
      from(this.messageBroker.ipcRenderer.invoke(IpcChannel.ChangeWindowsCaptureProtection, this.config))
    ]).subscribe(() => {
      this.messageBroker.ipcRenderer.send(IpcChannel.ConfigChanged, config);
      this.configLoaded.next(this.config);
    });
  }
}
