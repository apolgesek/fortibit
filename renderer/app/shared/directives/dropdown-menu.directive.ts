import {
	ChangeDetectorRef,
	Directive,
	OnInit,
	TemplateRef,
	ViewContainerRef,
	inject,
} from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

@Directive({
	selector: '[appDropdownMenu]',
	standalone: true,
})
export class DropdownMenuDirective implements OnInit {
	private hasView = false;

	private readonly dropdownState = inject(DropdownStateService);
	private readonly templateRef = inject(TemplateRef<any>);
	private readonly viewContainer = inject(ViewContainerRef);
	private readonly cdRef = inject(ChangeDetectorRef);

	ngOnInit(): void {
		this.dropdownState.stateChanges$.pipe().subscribe((state) => {
			if (state.isOpen) {
				if (!this.hasView) {
					this.viewContainer.createEmbeddedView(this.templateRef);
					this.hasView = true;
				}
			} else {
				if (this.hasView) {
					this.viewContainer.clear();
					this.hasView = false;
				}
			}

			this.cdRef.markForCheck();
		});
	}
}
