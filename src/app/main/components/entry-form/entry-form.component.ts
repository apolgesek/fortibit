import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { PasswordStoreService } from '@app/core/services/password-store.service';
import { fade } from '@app/shared/animations/fade-slide.animation';

@Component({
  selector: 'app-entry-form',
  templateUrl: './entry-form.component.html',
  styleUrls: ['./entry-form.component.scss'],
  animations: [ fade() ]
})
export class EntryFormComponent implements OnInit {

  public newEntryForm: FormGroup;

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private fb: FormBuilder,
    private passwordService: PasswordStoreService
  ) { }

  ngOnInit(): void {
    this.newEntryForm = this.fb.group({
      id: [''],
      title: [''],
      username: ['', Validators.required],
      value: ['', Validators.required],
      url: [''],
      notes: ['']
    }, { updateOn: 'blur' });

    if (this.config.data) {
      this.newEntryForm.patchValue(this.config.data);
    }
  }

  addNewEntry() {
    Object.values(this.newEntryForm.controls).forEach(control => {
      control.markAsDirty();
    });

    if (this.newEntryForm.valid) {
      if (this.config.data?.creationDate) {
        this.passwordService.addEntry(this.newEntryForm.value);
      } else {
        this.passwordService.addEntry({...this.newEntryForm.value, creationDate: new Date()});
      }
      this.ref.close();
    }
  }

}
