import { EncryptionProcessService, IEncryptionProcessService, INativeApiService, ISendInputService, IUpdateService, IWindowService, SendInputService, Win32UpdateService, WinApiService, WindowService } from '../services';
import { ClipboardService, IClipboardService } from '../services/clipboard';
import { IConfigService } from '../services/config';
import { ConfigService } from '../services/config/config.service';
import { IDatabaseService } from '../services/file/database-service.model';
import { DatabaseService } from '../services/file/database.service';
import { IPerformanceService } from '../services/performance/performance-service.model';
import { PerformanceService } from '../services/performance/performance.service';
import { ServiceCollection } from './index';

export class SingleInstanceServices extends ServiceCollection {
  constructor() {
    super();
    this.configureServices();
  }

  configureServices() {
    this.set(IConfigService, new ConfigService());
    this.set(IEncryptionProcessService, new EncryptionProcessService());
    this.set(INativeApiService, new WinApiService());
    this.set(IPerformanceService, new PerformanceService());
    this.set(IClipboardService, new ClipboardService(this.get(IConfigService)));
    this.set(ISendInputService, new SendInputService(this.get(INativeApiService)));
  
    this.set(IWindowService, new WindowService(
      this.get(IConfigService),
      this.get(IEncryptionProcessService),
      this.get(IPerformanceService),
      this.get(ISendInputService),
      this.get(INativeApiService)
    ));
  
    this.set(IDatabaseService, new DatabaseService(
      this.get(IConfigService),
      this.get(IEncryptionProcessService),
      this.get(IWindowService)
    ));

    this.set(IUpdateService, new Win32UpdateService(
      this.get(IConfigService),
      this.get(IWindowService),
    ));
  }
}