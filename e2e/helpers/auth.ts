import { Page } from "playwright";

export async function authenticate(page: Page) {
  await page.getByPlaceholder(/password/i).focus();
  await page.keyboard.insertText('test123');
  await page.keyboard.press('Enter');
}