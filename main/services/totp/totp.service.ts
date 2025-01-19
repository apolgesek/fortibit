import { app, BaseWindow, desktopCapturer, dialog, screen } from 'electron';
import jsQR, { QRCode } from 'jsqr';
import { PNG } from 'pngjs';
import { IWindowService } from '../window';
import { ITotpService } from './totp-service.model';
import { base32String } from '@shared-renderer/regex';
import { Logger } from '@root/main/core/logger/logger';

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

		const code = this.findQrCodeWindow(sources);

		if (!code) {
			this.showMissingQrCodeError(window);

			return;
		}

		const secret = code.data.match(new RegExp(`secret=(${base32String})`));

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

	private findQrCodeWindow(
		sources: Electron.DesktopCapturerSource[],
	): QRCode | undefined {
		sources = sources.filter((x) => !x.name.includes(app.getName()));

		try {
			for (const source of sources) {
				const buffer = source.thumbnail.toPNG();
				const png = PNG.sync.read(buffer);

				const code = jsQR(
					Uint8ClampedArray.from(png.data),
					png.width,
					png.height,
				);

				if (code) {
					return code;
				}
			}
		} catch (err) {
			Logger.logError(err);
			return;
		}
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
