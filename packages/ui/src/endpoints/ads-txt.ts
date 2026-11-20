// Serves /ads.txt. Re-export from an app: `export { GET } from "@devsam/ui/endpoints/ads-txt";`
import { adsense } from "../config";

export function GET() {
  const pub = adsense.client.replace(/^ca-/, "").trim();
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : "# No ad networks configured yet.\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
