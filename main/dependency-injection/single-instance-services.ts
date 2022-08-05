import { ClipboardService, IClipboardService } from '../services/clipboard';
import { IConfigService } from '../services/config';
import { ConfigService } from '../services/config/config.service';
import { DatabaseService, IDatabaseService } from '../services/database';
import { EncryptionProcessService, IEncryptionProcessService } from '../services/encryption';
import { FileService, IFileService } from '../services/file';
import { IconService, IIconService } from '../services/icon';
import { INativeApiService, WinApiService } from '../services/native';
import { IPerformanceService } from '../services/performance/performance-service.model';
import { PerformanceService } from '../services/performance/performance.service';
import { ISendInputService, SendInputService } from '../services/send-input';
import { IUpdateService, Win32UpdateService } from '../services/update';
import { IWindowService, WindowService } from '../services/window';
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
    this.set(IFileService, new FileService());

    this.set(IClipboardService, new ClipboardService(this.get(IConfigService)));
    this.set(ISendInputService, new SendInputService(this.get(INativeApiService)));
  
    this.set(IWindowService, new WindowService(
      this.get(IConfigService),
      this.get(IEncryptionProcessService),
      this.get(IPerformanceService),
      this.get(ISendInputService),
      this.get(INativeApiService)
    ));

    this.set(IUpdateService, new Win32UpdateService(
      this.get(IConfigService),
      this.get(IWindowService),
      this.get(IFileService)
    ));

    this.set(IIconService, new IconService(
      this.get(IConfigService),
      this.get(IFileService),
      this.get(IWindowService)
    ));
  
    this.set(IDatabaseService, new DatabaseService(
      this.get(IConfigService),
      this.get(IEncryptionProcessService),
      this.get(IWindowService),
      this.get(IIconService)
    ));
  }
}