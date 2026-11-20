// Dev helper: screenshots a running tool in dark, light and mobile views and
// reports console errors. Usage: node scripts/shoot.mjs <url> <outDir> [prefix]
import { chromium } from "playwright-core";

const [url, out, prefix = "shot"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "msedge" });
const errors = [];
for (const [name, viewport, scheme] of [
  ["dark", { width: 1440, height: 900 }, "dark"],
  ["light", { width: 1440, height: 900 }, "light"],
  ["mobile", { width: 390, height: 844 }, "dark"],
]) {
  const page = await browser.newPage({ viewport, colorScheme: scheme });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors");
