import { Directive, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

enum Key {
  Ctrl = 'Ctrl',
  Control = 'Control',
  Alt = 'Alt',
  Shift = 'Shift',
  Meta = 'Meta'
}

@Directive({
  selector: '[appHotkeyBinder]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: HotkeyBinderDirective,
    multi: true
  }]
})
export class HotkeyBinderDirective implements ControlValueAccessor {
  private static readonly keySeparator = '+'; 
  private readonly ignoredKeys: string[] = ['Tab'];
  private readonly noModifierKey = (e: KeyboardEvent) => !(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey);

  private keyArr = [];
  private currentShortcut = '';
  private onChange: (value: string) => void;

  @HostListener('keydown', ['$event'])
  public onKeydown(event: KeyboardEvent) {
    // ignore focus change (Tab/Tab+Shift)
    if ((this.ignoredKeys.includes(event.key) && (!(event.ctrlKey || event.altKey || event.metaKey) || this.keyArr.includes(Key.Shift)))) {
      return;
    }

    event.preventDefault();
    this.reset();

    if (this.noModifierKey(event)) {
      return;
    }

    if (event.ctrlKey) {
      this.addCtrlKey();
    }

    if (event.altKey) {
      this.addAltKey();
    }

    if (event.metaKey) {
      this.addMetaKey();
    }

    if (event.shiftKey) {
      this.addShiftKey();
    }

    if (!([...Object.keys(Key)] as string[]).includes(event.key)) {
      this.addCustomKey(event.key);
    }

    this.createString();
    if (this.isValidCombo()) {
      this.saveShortcut();
    }
  }

  @HostListener('keyup', ['$event'])
  public onKeyUp(event: KeyboardEvent) {
    event.preventDefault();

    if (!this.isValidCombo()) {
      this.reset(this.currentShortcut);
    }
  }

  @HostListener('focus')
  public onFocus() {
    this.keyArr = [];
    this.inputElement.value = '';
  }

  @HostListener('blur')
  public onBlur() {
    if (!this.isValidCombo()) {
      this.reset(this.currentShortcut);
    }
  }

  private get inputElement(): HTMLInputElement {
    return this.el.nativeElement;
  }

  constructor(
    private readonly el: ElementRef,
  ) { }

  writeValue(value: string): void {
    if (!value?.length) {
      return;
    }

    this.currentShortcut = value;
    this.keyArr = value.split(HotkeyBinderDirective.keySeparator);
    this.createString();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {}

  addCtrlKey() {
    this.keyArr.push(Key.Ctrl);
  }

  addAltKey() {
    this.keyArr.push(Key.Alt);
  }

  addMetaKey() {
    this.keyArr.push(Key.Meta);
  }

  addShiftKey() {
    this.keyArr.push(Key.Shift);
  }

  addCustomKey(key: string) {
    this.keyArr.push(key.charAt(0).toUpperCase() + key.slice(1));
  }

  createString() {
    this.inputElement.value = this.keyArr.join(HotkeyBinderDirective.keySeparator);
  }

  // One non modifier key is required
  isValidCombo(): boolean {
    return this.keyArr.length === this.getModifiersCount() + 1;
  }

  getModifiersCount(): number {
    return this.keyArr.filter(x => [...Object.keys(Key)].includes(x)).length;
  }

  saveShortcut() {
    this.onChange(this.inputElement.value);
    this.currentShortcut = this.inputElement.value;

    this.inputElement.blur();
  }

  reset(value?: string) {
    this.keyArr = value ? value.split(HotkeyBinderDirective.keySeparator) : [];
    this.inputElement.value = value ?? '';
  }
}
