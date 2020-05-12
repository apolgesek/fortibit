import { Directive, ElementRef } from '@angular/core';
import { PasswordStoreService } from '@app/core/services/password-store.service';

@Directive({
  selector: '[appDroppable]'
})
export class DroppableDirective {

    private el: HTMLElement;

    private dragEnterCallback: () => void = () => {
        this.removeDraggedOverClassForAllDroppables();
        this.el.classList.add('ui-treenode-dragover');
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
        // this needs to be executed because dragend event is not called on drop
        document.querySelectorAll('.ui-treenode-selectable *').forEach((el: HTMLElement) => el.style.pointerEvents = 'auto');
        this.removeDraggedOverClassForAllDroppables();
        if (this.passwordStore.draggedEntry) {
            this.passwordStore.moveEntry((<HTMLInputElement>this.el.querySelector('.node-id')).value);
        }
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
        this.el.addEventListener('dragend', () => {
            this.removeDraggedOverClassForAllDroppables();
        });
    }

    ngOnDestroy(): void {
        this.el.removeEventListener('dragenter', this.dragEnterCallback);
        this.el.removeEventListener('dragleave', this.dragLeaveCallback);
        this.el.removeEventListener('drop', this.dropCallback);
        this.el.removeEventListener('dragend', () => {
            this.removeDraggedOverClassForAllDroppables();
        });
    }

    private removeDraggedOverClassForAllDroppables() {
        Array.from(document.getElementsByClassName('ui-treenode-dragover')).forEach(el => el.classList.remove('ui-treenode-dragover'));
    }

}
