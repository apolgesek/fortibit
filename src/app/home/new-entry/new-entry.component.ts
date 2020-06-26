import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { PasswordStoreService } from '@app/core/services/password-store.service';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-new-entry',
  templateUrl: './new-entry.component.html',
  styleUrls: ['./new-entry.component.scss'],
  animations: [
    // the fade-in/fade-out animation.
    trigger('fade', [
      // fade in when created. this could also be written as transition('void => *')
      transition(':enter', [
        style({opacity: 0, transform: 'translateY(-1rem)'}),
        animate('150ms', style({opacity: 1, transform: 'translateY(0)'})),
      ]),

      // fade out when destroyed. this could also be written as transition('void => *')
      transition(':leave', [
        style({opacity: 1, transform: 'translateY(0)'}),
        animate('150ms', style({opacity: 0, transform: 'translateY(-1rem)'}))
      ])
    ])
  ]
})
export class NewEntryComponent implements OnInit {

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
