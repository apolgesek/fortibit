import { Page } from "playwright";

interface IEntryModel {
  title?: string;
  username?: string;
  config?: { close: true };
}

export async function addEntry(page: Page, model?: IEntryModel) {
  await page.getByRole('button', { name: /add entry/i }).click();
  await page.getByPlaceholder(/title/i).type(model?.title ?? 'Title1');
  await page.getByPlaceholder(/username/i).type(model?.username ?? 'Username1');
  await page.getByText(/confirm/i).click();
  
  if (model?.config?.close) {
    await page
    .getByText(/add entry in general/i)
    .waitFor({ state: 'hidden', timeout: 4000 });
  }
}