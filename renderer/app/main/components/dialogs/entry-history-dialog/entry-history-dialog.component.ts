import { CommonModule } from '@angular/common';
import {
	Component,
	ComponentRef,
	DestroyRef,
	OnInit,
	inject,
} from '@angular/core';
import { EntryManager, ModalRef, ModalService } from '@app/core/services';
import { IAdditionalData, IModal } from '@app/shared';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { HistoryEntry } from '@shared-renderer/history-entry.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type EntryHistoryDialogDataPayload = {
	id: number;
};

@Component({
	selector: 'app-entry-history-dialog',
	templateUrl: './entry-history-dialog.component.html',
	styleUrls: ['./entry-history-dialog.component.scss'],
	standalone: true,
	imports: [CommonModule, ModalComponent],
})
export class EntryHistoryDialogComponent implements IModal, OnInit {
	public readonly ref: ComponentRef<EntryHistoryDialogComponent>;
	public readonly additionalData?: IAdditionalData<EntryHistoryDialogDataPayload>;
	public history: HistoryEntry[];

	private readonly destroyRef = inject(DestroyRef);
	private readonly entryManager = inject(EntryManager);
	private readonly modalService = inject(ModalService);
	private readonly modalRef = inject(ModalRef);

	close() {
		this.modalRef.close();
	}

	ngOnInit(): void {
		this.history = this.entryManager.entryHistory;
	}

	async openEntry(entry: HistoryEntry) {
		const modalRef = await this.modalService.openHistoryEntryWindow(entry);

		modalRef.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
			this.getEntryHistory();
		});
	}

	private async getEntryHistory(): Promise<void> {
		this.history = [...this.entryManager.entryHistory];
	}
}
