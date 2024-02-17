import { Injectable } from '@angular/core';
import { TabComponent } from '../components/tab/tab.component';

@Injectable()
export class TabService {
	public tabset: TabComponent[] = [];
	public activeTab: TabComponent;

	addTab(tab: TabComponent) {
		if (this.tabset.length === 0) {
			this.setActiveTab(tab);
		}

		this.tabset.push(tab);
	}

	setActiveTab(tab: TabComponent) {
		if (this.activeTab) {
			this.activeTab.active = false;
		}

		this.activeTab = tab;
		this.activeTab.active = true;
	}
}
