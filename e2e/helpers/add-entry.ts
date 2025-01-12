import { Page } from 'playwright';

type IEntryModel = {
	title?: string;
	username?: string;
	url?: string;
	otpAuth?: string;
	config?: { close: boolean };
};

export async function addEntry(page: Page, model?: IEntryModel) {
	await page.getByRole('button', { name: /add entry/i }).click();
	await page.getByPlaceholder(/title/i).fill(model?.title ?? 'Title1');
	await page.getByPlaceholder(/username/i).fill(model?.username ?? 'Username1');

	if (model?.url) {
		await page.getByPlaceholder(/website/i).fill(model.url);
	}

	if (model?.otpAuth) {
		await page.getByPlaceholder(/base32 secret/i).fill(model?.otpAuth);
	}

	await page.getByText(/confirm/i).click();

	if (model?.config?.close) {
		await page
			.getByText(/add\s*entry\s*in\s*general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
	}
}
