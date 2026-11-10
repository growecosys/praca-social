import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtime = join(root, ".wrangler", "praca-local");
const staged = join(runtime, "migrations");
mkdirSync(staged, { recursive: true });

const files = readdirSync(join(root, "drizzle")).filter(name => name.endsWith(".sql")).sort();
const commonSpace = "0023_common_space.sql";
// The historical Common Space table creation predates its placement_json ALTER.
files.splice(files.indexOf(commonSpace), 1);
files.splice(files.indexOf("0023_boring_blizzard.sql"), 0, commonSpace);
for (const [index, name] of files.entries()) {
  const stagedName = String(index + 1).padStart(4, "0") + "_" + name;
  copyFileSync(join(root, "drizzle", name), join(staged, stagedName));
}

const config = join(runtime, "wrangler.json");
writeFileSync(config, JSON.stringify({
  name: "praca-local",
  compatibility_date: "2026-06-01",
  d1_databases: [{
    binding: "DB",
    database_name: "site-creator-d1",
    database_id: "00000000-0000-4000-8000-000000000000",
    migrations_dir: "migrations"
  }]
}, null, 2));

const run = spawnSync(process.execPath, [
  join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
  "d1", "migrations", "apply", "DB", "--local",
  "--config", config,
  "--persist-to", join(root, ".wrangler", "state")
], { cwd: root, stdio: "inherit" });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
