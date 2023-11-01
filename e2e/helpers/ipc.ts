import { JSHandle, Page } from "playwright";

export async function getInvoke(page: Page): Promise<JSHandle<any>> {
  return await page.evaluateHandle(() => (window as any).api.invoke);
};