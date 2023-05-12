import { Inject, Injectable } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { CommunicationService } from 'injection-tokens';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { IAppConfig } from '../../../../app-config';
import { ICommunicationService } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  public readonly configLoadedSource$: Observable<IAppConfig>;
  private readonly configLoaded: Subject<IAppConfig> = new ReplaySubject(1);
  private config: IAppConfig | null = null;

  constructor(@Inject(CommunicationService) private readonly communicationService: ICommunicationService) { 
    this.configLoadedSource$ = this.configLoaded.asObservable();
  }

  setConfig(config: Partial<IAppConfig>) {
    this.communicationService.ipcRenderer.send(IpcChannel.ChangeEncryptionSettings, config);

    this.config = {...this.config, ...config};
    this.configLoaded.next(this.config);
  }
}
