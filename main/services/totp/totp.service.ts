import { BaseWindow, desktopCapturer, dialog, screen } from 'electron';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { IWindowService } from '../window';
import { ITotpService } from './totp-service.model';

export class TotpService implements ITotpService {
	constructor(
		@IWindowService private readonly _windowService: IWindowService,
	) {}

	async scanQrCode(windowId: number): Promise<string | undefined> {
		const window =
			this._windowService.getWindowByWebContentsId(windowId).browserWindow;

		const { width, height } = screen.getPrimaryDisplay().size;
		const sources = await desktopCapturer.getSources({
			types: ['window'],
			thumbnailSize: { width, height },
		});

		if (!sources?.length) {
			this.showMissingQrCodeError(window);

			return;
		}

		const buffer = sources[0].thumbnail.toPNG();
		const png = PNG.sync.read(buffer);
		const code = jsQR(Uint8ClampedArray.from(png.data), png.width, png.height);

		if (!code) {
			this.showMissingQrCodeError(window);

			return;
		}

		const secret = code.data.match(/secret=(([2-7A-Z]{8})+)/);

		if (!secret) {
			dialog.showMessageBox(window, {
				title: 'QR code reader error',
				type: 'warning',
				message: `Invalid QR code data`,
			});

			return;
		}

		return secret[1];
	}

	private showMissingQrCodeError(window: BaseWindow) {
		dialog.showMessageBox(window, {
			title: 'QR code reader error',
			type: 'warning',
			message: `No otpauth QR code was found:
						- make sure it's visible in the foreground,
						- try zooming the code in and scan again,
						- if none of the above works, you can manually add a secret in Advanced options of password entry.`,
		});
	}
}
