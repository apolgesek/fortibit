import {
	AfterContentInit,
	Component,
	ContentChildren,
	ElementRef,
	QueryList,
	ViewChildren,
	inject,
} from '@angular/core';
import { TabComponent } from '../tab/tab.component';
import { TabService } from '../../services/tab.service';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-tabset',
	templateUrl: './tabset.component.html',
	styleUrls: ['./tabset.component.scss'],
	standalone: true,
	imports: [CommonModule],
	providers: [TabService],
})
export class TabsetComponent implements AfterContentInit {
	@ViewChildren('headerButton') headerButtons: QueryList<ElementRef>;
	@ContentChildren(TabComponent) tabs: QueryList<TabComponent>;
	public headers: string[] = [];

	private readonly tabService = inject(TabService);

	public get activeTab(): TabComponent {
		return this.tabService.activeTab;
	}

	setTab(tab: TabComponent): void {
		this.tabService.setActiveTab(tab);
	}

	ngAfterContentInit(): void {
		this.headers = this.tabs.map((x) => x.header);
	}
}
