import { Page } from 'playwright';

export async function authenticate(page: Page) {
	await page.getByPlaceholder(/password/i).fill('test123');
	await page.getByLabel(/unlock/i).click();
}
