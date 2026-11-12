import { readPlacement } from "../../../../lib/nature-placement";
import { env } from "cloudflare:workers";
import { seedCommonAssets, closeCommonProposals } from "../../../../lib/common-space";
export async function GET() {
  await seedCommonAssets(env.DB);
  await closeCommonProposals(env.DB);
  const assets = await env.DB.prepare(
    "SELECT id,url,placement_json FROM common_assets WHERE active=1 ORDER BY id",
  ).all();
  return Response.json(
    {
      assets: assets.results.map((a: any) => ({
        ...a,
        placement: readPlacement(a.placement_json, a.id),
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
