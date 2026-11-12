import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const root = new URL("../../", import.meta.url).pathname;

function* walk(directory) {
  for (const name of readdirSync(directory)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

function staticText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    // Interpolations are unknown at analysis time; they are replaced by a marker.
    return node.head.text + node.templateSpans.map((span) => "\u0000" + span.literal.text).join("");
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticText(node.left);
    const right = staticText(node.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isParenthesizedExpression(node)) return staticText(node.expression);
  return null;
}

const SQL_START =
  /^\s*(SELECT\s[\s\S]+\sFROM\s|INSERT\s+INTO\s|UPDATE\s+\w+\s+SET\s|DELETE\s+FROM\s|WITH\s+\w+\s+AS\s)/i;

/**
 * Every string in application code that reads as a SQL statement: `.prepare(sql)` arguments plus
 * statements passed through helpers such as `first("SELECT ...")`. Drizzle query-builder code is
 * not covered here.
 */
export function extractPreparedStatements() {
  const found = [];
  for (const directory of ["app", "lib", "components"]) {
    for (const file of walk(join(root, directory))) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const record = (node, text) => {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        found.push({ file: relative(root, file), line: line + 1, sql: text });
      };
      const visit = (node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "prepare" &&
          node.arguments.length === 1
        ) {
          record(node, staticText(node.arguments[0]));
          return ts.forEachChild(node, (child) => child !== node.arguments[0] && visit(child));
        }
        if (
          (ts.isStringLiteral(node) ||
            ts.isNoSubstitutionTemplateLiteral(node) ||
            ts.isTemplateExpression(node)) &&
          !(node.parent && ts.isTaggedTemplateExpression(node.parent))
        ) {
          const text = staticText(node);
          if (text !== null && SQL_START.test(text)) record(node, text);
          return;
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return found;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const all = extractPreparedStatements();
  const dynamic = all.filter((s) => s.sql === null);
  const interpolated = all.filter((s) => s.sql?.includes("\u0000"));
  console.log(
    JSON.stringify({
      total: all.length,
      dynamic: dynamic.length,
      interpolated: interpolated.length,
    }),
  );
  for (const s of dynamic) console.log("DYNAMIC", s.file + ":" + s.line);
  for (const s of interpolated) console.log("INTERPOLATED", s.file + ":" + s.line);
}
