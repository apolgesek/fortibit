import { Directive, ElementRef } from '@angular/core';
import { PasswordStoreService } from '@app/core/services/password-store.service';

@Directive({
  selector: '[appDroppable]'
})
export class DroppableDirective {

    private el: HTMLElement;

    private dragEnterCallback: () => void = () => {
        if (!this.passwordStore.draggedEntry) {
            return;
        }
        this.el.classList.add('ui-treenode-dragover');
    };
    
    public dragLeaveCallback: () => void = () => {
        if (!this.passwordStore.draggedEntry) {
            return;
        }
        this.el.classList.remove('ui-treenode-dragover');
    }

    public dropCallback: () => void = () => {
        this.passwordStore.moveEntry((<HTMLInputElement>this.el.querySelector('.node-id')).value);
        this.el.classList.remove('ui-treenode-dragover');
    }

    constructor(
        private element: ElementRef,
        private passwordStore: PasswordStoreService
    ) { }

    ngOnInit(): void {
        this.el = this.element.nativeElement.parentElement.parentElement.parentElement;
        this.el.addEventListener('dragenter', this.dragEnterCallback);
        this.el.addEventListener('dragleave', this.dragLeaveCallback);
        this.el.addEventListener('drop', this.dropCallback);
    }

    ngOnDestroy(): void {
        this.el.removeEventListener('dragenter', this.dragEnterCallback);
        this.el.removeEventListener('dragleave', this.dragLeaveCallback);
        this.el.removeEventListener('drop', this.dropCallback);
    }

}
