import { INativeApi } from "./native-api.model";

const FFI = require('ffi-napi');
const StructType = require('ref-struct-napi');
const UnionType = require('ref-union-napi');
const ref = require('ref-napi');
const wchar = require('ref-wchar-napi');

export class WinApi implements INativeApi {
  private readonly user32 = new FFI.Library('user32.dll', {
    'SendInput': ['uint32', ['int32', 'pointer', 'int32']],
    'GetWindowTextW': ['int', ['pointer', 'pointer', 'int']],
    'GetWindowTextLengthW': ['int', ['pointer']],
    'GetForegroundWindow': ['pointer', []],
  });
  
  private readonly MOUSEINPUT = StructType({
    dx: 'int32',
    dy: 'int32',
    mouseData: 'uint32',
    flags: 'uint32',
    time: 'uint32',
    extraInfo: 'pointer',
  });
  
  private readonly KEYBDINPUT = StructType({
    vk: 'uint16',
    scan: 'uint16',
    flags: 'uint32',
    time: 'uint32',
    extraInfo: 'pointer',
  });
  
  private readonly HARDWAREINPUT = StructType({
    msg: 'uint32',
    paramL: 'uint16',
    paramH: 'uint16',
  });
  
  private readonly INPUT_UNION = UnionType({
    mi: this.MOUSEINPUT,
    ki: this.KEYBDINPUT,
    hi: this.HARDWAREINPUT,
  });
  
  private readonly INPUT = StructType({
    type: 'uint32',
    union: this.INPUT_UNION,
  });

  public pressPhraseKey(char: string): void {
    const scanCode = char.charCodeAt(0);
    this.sendInput(0, scanCode);
  }

  public pressKey(key: number): void {
    this.sendInput(key, 0);
  }

  public getActiveWindowTitle(): string {
    const handle = this.user32.GetForegroundWindow();
    const windowTextLength = this.user32.GetWindowTextLengthW(handle);
    const windowTextBuffer = Buffer.alloc((windowTextLength * 2) + 4);
    this.user32.GetWindowTextW(handle, windowTextBuffer, windowTextLength + 2);

    const windowTextBufferClean = ref.reinterpretUntilZeros(windowTextBuffer, wchar.size);
    const windowTitle = wchar.toString(windowTextBufferClean);

    return windowTitle;
  }

  private sendInput(key: number, scanCode: number): void {
    const keyDownKeyboardInput = this.KEYBDINPUT({vk: key, extraInfo: ref.NULL_POINTER, time: 0, scan: scanCode, flags: 0x0004});
    const keyDownInput = this.INPUT({type: 1, union: this.INPUT_UNION({ki: keyDownKeyboardInput})});
    this.user32.SendInput(1, keyDownInput.ref(), this.INPUT.size);
  
    const keyUpKeyboardInput = this.KEYBDINPUT({vk: key, extraInfo: ref.NULL_POINTER, time: 0, scan: scanCode, flags: 0x0002 | 0x0004});
    const keyUpInput = this.INPUT({type: 1, union: this.INPUT_UNION({ki: keyUpKeyboardInput})});
    this.user32.SendInput(1, keyUpInput.ref(), this.INPUT.size);
  }
}