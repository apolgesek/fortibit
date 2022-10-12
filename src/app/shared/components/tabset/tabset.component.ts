import { AfterContentInit, Component, ContentChildren, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { TabComponent } from '../tab/tab.component';
import { TabService } from '../../services/tab.service';

@Component({
  selector: 'app-tabset',
  templateUrl: './tabset.component.html',
  styleUrls: ['./tabset.component.scss'],
  standalone: true,
  providers: [TabService]
})
export class TabsetComponent implements AfterContentInit {
  @ViewChildren('headerButton') headerButtons: QueryList<ElementRef>;
  @ContentChildren(TabComponent) tabs: QueryList<TabComponent>;
  public headers: string[] = [];

  public get activeTab(): TabComponent {
    return this.tabService.activeTab;
  }

  constructor(
    private readonly tabService: TabService,
  ) { }

  setTab(tab: TabComponent): void {
    this.tabService.setActiveTab(tab);
  }

  ngAfterContentInit(): void {
    this.headers = this.tabs.map(x => x.header);
  }
}
