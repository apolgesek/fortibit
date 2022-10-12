import { Component, Input } from '@angular/core';
import { TabService } from '@app/shared/services/tab.service';

@Component({
  selector: 'app-tab',
  templateUrl: './tab.component.html',
  standalone: true
})
export class TabComponent {
  @Input() public readonly header: string;
  @Input() public readonly icon: string;
  @Input() public readonly disabled: boolean;

  public active = false;

  constructor(
    private readonly tabService: TabService,
  ) {
    this.tabService.addTab(this);
  }
}
