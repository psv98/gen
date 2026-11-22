// Dev helper: screenshots of the built app for visual review.
// Usage: node scripts/screenshot.mjs <url> <out.png> [width] [height] [actions-json]
import { chromium } from '@playwright/test';
const [url, out, w = '1440', h = '900', actions = '[]'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
await page.waitForTimeout(600);
for (const a of JSON.parse(actions)) {
  if (a.click) await page.click(a.click);
  if (a.key) await page.keyboard.press(a.key);
  if (a.fill) await page.fill(a.fill[0], a.fill[1]);
  if (a.eval) await page.evaluate(a.eval);
  await page.waitForTimeout(a.wait ?? 250);
}
await page.screenshot({ path: out });
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
