import { Injectable } from '@angular/core';
import { TabComponent } from '../components/tab/tab.component';

@Injectable()
export class TabService {
  public activeTab: TabComponent;

  constructor() { }
}
