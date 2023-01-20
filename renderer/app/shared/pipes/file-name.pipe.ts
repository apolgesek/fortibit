import { Inject, Pipe, PipeTransform } from '@angular/core';
import { ICommunicationService } from "@app/core/models";
import { CommunicationService } from 'injection-tokens';

@Pipe({
  name: 'fileName',
  standalone: true
})
export class FileNamePipe implements PipeTransform {
  constructor(@Inject(CommunicationService) private readonly communicationService: ICommunicationService) {}

  transform(path: string): string {
    return path.split(this.communicationService.platform === 'win32' ? '\\' : '/').splice(-1)[0];
  }
}
