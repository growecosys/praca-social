// Timestamps are text in "YYYY-MM-DD HH:MM:SS" UTC, matching the column defaults in db/schema.ts.
const NOW_TEXT = "to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS')";

/**
 * Prepares application SQL for Postgres: `?` placeholders become `$n`, and the SQL standard
 * CURRENT_TIMESTAMP becomes the app's text timestamp. String literals and quoted identifiers
 * are left untouched.
 */
export function toPostgres(sql: string): string {
  let out = "";
  let index = 0;
  let unquoted = "";
  let quote: string | null = null;

  const flush = () => {
    out += unquoted
      .replace(/\bCURRENT_TIMESTAMP\b/gi, NOW_TEXT)
      .replace(/\?/g, () => `$${++index}`);
    unquoted = "";
  };

  for (const char of sql) {
    if (quote) {
      out += char;
      if (char === quote) quote = null;
    } else if (char === "'" || char === '"') {
      flush();
      quote = char;
      out += char;
    } else {
      unquoted += char;
    }
  }
  flush();
  return out;
}
