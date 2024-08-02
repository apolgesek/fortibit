import { Page } from 'playwright';

type IEntryModel = {
	title?: string;
	username?: string;
	url?: string;
	config?: { close: true };
};

export async function addEntry(page: Page, model?: IEntryModel) {
	await page.getByRole('button', { name: /add entry/i }).click();
	await page.getByPlaceholder(/title/i).fill(model?.title ?? 'Title1');
	await page.getByPlaceholder(/username/i).fill(model?.username ?? 'Username1');

	if (model?.url) {
		await page.getByPlaceholder(/website/i).fill(model.url);
	}
	await page.getByText(/confirm/i).click();

	if (model?.config?.close) {
		await page
			.getByText(/add\s*entry\s*in\s*general/i)
			.waitFor({ state: 'hidden', timeout: 4000 });
	}
}
