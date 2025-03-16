import { Page } from 'playwright';

export async function toggleAutoSave(page: Page) {
	await page.getByRole('banner').waitFor({ state: 'visible' });
	await page.keyboard.press('Control+.');
	await page
		.getByRole('dialog')
		.getByText(/enable autosave/i)
		.click();
	await page.keyboard.press('Escape');
}
