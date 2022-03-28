import { Injectable, NgZone } from '@angular/core';
import { IpcChannel } from '@shared-renderer/index';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { IAppConfig } from '../../../../app-config';
import { ElectronService } from '@app/core/services/electron/electron.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  public config: IAppConfig | null = null;
  public readonly configLoadedSource$: Observable<IAppConfig>;
  private readonly configLoaded: Subject<IAppConfig> = new ReplaySubject(1);

  constructor(
    private readonly electronService: ElectronService,
    private readonly zone: NgZone
  ) { 
    this.configLoadedSource$ = this.configLoaded.asObservable();

    this.electronService.ipcRenderer
      .invoke(IpcChannel.GetAppConfig)
      .then((result: IAppConfig) => {
        this.zone.run(() => {
          this.config = result;

          this.configLoaded.next(this.config);
        });
      });
  }
}
