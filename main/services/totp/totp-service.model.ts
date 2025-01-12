import { createServiceDecorator } from '../../di';

export const ITotpService = createServiceDecorator<ITotpService>('totpService');

export interface ITotpService {
	scanQrCode(windowId: number): Promise<string | undefined>;
}
