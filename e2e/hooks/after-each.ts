import { ElectronApplication } from 'playwright';

export async function afterEach(app: ElectronApplication) {
	await app.evaluate((process) => process.app.exit());
}
