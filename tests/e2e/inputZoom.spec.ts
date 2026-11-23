/** AX-8a — text fields stay at 16px+ on touch screens so iOS does not zoom in on tap. */
import { expect, test } from '@playwright/test';

test('AX-8a: text fields are 16px or more on phones, even when styled smaller', async ({ page }, info) => {
  test.skip(!['mobile-webkit', 'mobile-chromium'].includes(info.project.name), 'touch screens only');
  await page.goto('/');
  // Same classes as the live invite link field (text-[13px]) and a small textarea.
  const sizes = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML =
      '<input class="text-[13px]" value="x"><textarea class="text-sm">x</textarea><select class="text-sm"><option>x</option></select>';
    document.body.append(host);
    const out = [...host.children].map((el) => parseFloat(getComputedStyle(el).fontSize));
    host.remove();
    return out;
  });
  for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toMatch(/user-scalable=no|maximum-scale/);
});
