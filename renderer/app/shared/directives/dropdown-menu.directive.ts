import { Directive, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { DropdownStateService } from '../services/dropdown-state.service';

@Directive({
  selector: '[appDropdownMenu]',
  standalone: true
})
export class DropdownMenuDirective implements OnInit {
  private hasView = false;

  constructor(
    private readonly dropdownState: DropdownStateService,
    private readonly templateRef: TemplateRef<any>,
    private readonly viewContainer: ViewContainerRef,
  ) { }

  ngOnInit(): void {
    this.dropdownState.stateChanges$
      .pipe()
      .subscribe((state) => {
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
      });
  }
}
