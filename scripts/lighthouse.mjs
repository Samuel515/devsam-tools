// Runs Lighthouse (mobile) on each tool's homepage using the locally installed Edge.
// Usage: npm run build && node scripts/lighthouse.mjs [app ...]
import { spawn, execSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const apps = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync("apps").filter((a) => existsSync(`apps/${a}/dist`));
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const out = join(tmpdir(), "lh-report.json");

const waitFor = async (url) => {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("server did not start: " + url);
};

let port = 4600;
for (const app of apps) {
  port++;
  const server = spawn("npx", ["astro", "preview", "--port", String(port)], { cwd: `apps/${app}`, shell: true, stdio: "ignore" });
  try {
    await waitFor(`http://localhost:${port}/`);
    execSync(
      `npx --yes lighthouse@12 http://localhost:${port}/ --quiet --chrome-flags="--headless=new" --output=json --output-path="${out}" --only-categories=performance,accessibility,best-practices,seo`,
      { env: { ...process.env, CHROME_PATH: edge }, stdio: "ignore" },
    );
    const r = JSON.parse(readFileSync(out, "utf8"));
    const s = Object.values(r.categories).map((c) => String(Math.round(c.score * 100)).padStart(3)).join("");
    const fails = Object.values(r.audits)
      .filter((x) => x.score !== null && x.score < 0.9 && !["informative", "notApplicable", "manual"].includes(x.scoreDisplayMode))
      .map((x) => x.id)
      .filter((id) => !["max-potential-fid", "unused-javascript", "forced-reflow-insight", "network-dependency-tree-insight"].includes(id));
    console.log(`${app.padEnd(12)} perf/a11y/bp/seo:${s}  LCP ${r.audits["largest-contentful-paint"].displayValue.padEnd(6)} TBT ${r.audits["total-blocking-time"].displayValue.padEnd(7)} ${fails.join(", ")}`);
  } catch (e) {
    console.log(`${app.padEnd(12)} failed: ${e.message.split("\n")[0]}`);
  } finally {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    } catch {}
  }
}
