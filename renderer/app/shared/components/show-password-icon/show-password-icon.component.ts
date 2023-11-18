import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeatherModule } from 'angular-feather';

@Component({
  selector: 'app-show-password-icon',
  standalone: true,
  imports: [
    CommonModule,
    FeatherModule
  ],
  templateUrl: './show-password-icon.component.html',
  styleUrls: ['./show-password-icon.component.scss']
})
export class ShowPasswordIconComponent {
  public passwordVisible = false;
  @Output() change = new EventEmitter<(input: HTMLInputElement) => void>();

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
    this.change.emit((input: HTMLInputElement) => {
      input.type = this.passwordVisible ? 'text' : 'password';
    });
  }
}
