import { Component, Input } from '@angular/core';
import { TabService } from '@app/shared/services/tab.service';

@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
})
export class TabComponent {
  @Input() public readonly header: string;
  @Input() public readonly icon: string;
  @Input() public readonly disabled: boolean;

  public get isActive(): boolean {
    return this.tabService.activeTab === this;
  }

  constructor(
    private readonly tabService: TabService,
  ) { }
}
