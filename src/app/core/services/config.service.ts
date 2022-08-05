import { Inject, Injectable, NgZone } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { IAppConfig } from '../../../../app-config';
import { CommunicationService } from '@app/app.module';
import { ICommunicationService } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  public readonly configLoadedSource$: Observable<IAppConfig>;
  private readonly configLoaded: Subject<IAppConfig> = new ReplaySubject(1);
  private config: IAppConfig | null = null;

  constructor(
    @Inject(CommunicationService) private readonly communicationService: ICommunicationService,
    private readonly zone: NgZone
  ) { 
    this.configLoadedSource$ = this.configLoaded.asObservable();

    this.communicationService.ipcRenderer
      .invoke(IpcChannel.GetAppConfig)
      .then((result: IAppConfig) => {
        this.zone.run(() => {
          this.config = result;

          this.configLoaded.next(this.config);
        });
      });
  }

  setConfig(config: Partial<IAppConfig>) {
    this.config = {...this.config, ...config};
    this.configLoaded.next(this.config);
  }
}
