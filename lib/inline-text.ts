export type InlineNode = {
  kind: "text" | "strong" | "em" | "del" | "code" | "link" | "mention";
  text?: string;
  href?: string;
  username?: string;
  children?: InlineNode[];
};
export function inlineHref(value: string) {
  if (/^\/u\/[a-z0-9_-]{3,24}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password)
      return url.href;
  } catch {}
  return null;
}
export function parseInline(text: string, depth = 0): InlineNode[] {
  if (depth > 4) return [{ kind: "text", text }];
  const pattern =
    /`[^`\n]+`|\[[^\]\n]{1,500}\]\([^\s()]{1,2048}\)|\*\*[^*\n]+\*\*|~~[^~\n]+~~|_[^_\n]+_|https?:\/\/[^\s<>]+/g;
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) nodes.push({ kind: "text", text: text.slice(last, match.index) });
    const v = match[0];
    if (v.startsWith("`")) nodes.push({ kind: "code", text: v.slice(1, -1) });
    else if (v.startsWith("[")) {
      const parts = v.match(/^\[([^\]]+)\]\((.+)\)$/)!,
        href = inlineHref(parts[2]);
      const username = parts[1].match(/^@([a-z0-9_-]{3,24})$/)?.[1];
      if (href)
        nodes.push(
          username && href === "/u/" + username
            ? { kind: "mention", username, href, text: "@" + username }
            : { kind: "link", href, children: parseInline(parts[1], depth + 1) },
        );
      else nodes.push({ kind: "text", text: v });
    } else if (v.startsWith("**"))
      nodes.push({ kind: "strong", children: parseInline(v.slice(2, -2), depth + 1) });
    else if (v.startsWith("~~"))
      nodes.push({ kind: "del", children: parseInline(v.slice(2, -2), depth + 1) });
    else if (v.startsWith("_"))
      nodes.push({ kind: "em", children: parseInline(v.slice(1, -1), depth + 1) });
    else {
      const clean = v.replace(/[),.;!?]+$/, "");
      const href = inlineHref(clean);
      nodes.push(
        href
          ? { kind: "link", href, children: [{ kind: "text", text: clean }] }
          : { kind: "text", text: clean },
      );
      if (clean.length < v.length) nodes.push({ kind: "text", text: v.slice(clean.length) });
    }
    last = match.index! + v.length;
  }
  if (last < text.length) nodes.push({ kind: "text", text: text.slice(last) });
  return nodes;
}
export function mentionedUsers(
  blocks: Array<{ id: string; type: string; text?: string; inlineFormat?: string }>,
) {
  const found = new Map<string, string>();
  const walk = (nodes: InlineNode[], id: string) => {
    for (const n of nodes) {
      if (n.kind === "mention" && n.username && !found.has(n.username)) found.set(n.username, id);
      if (n.children) walk(n.children, id);
    }
  };
  for (const b of blocks)
    if (
      b.inlineFormat === "markdown" &&
      ["paragraph", "heading", "quote"].includes(b.type) &&
      b.text
    )
      walk(parseInline(b.text), b.id);
  if (found.size > 20) throw Error("Mencione até 20 pessoas por publicação.");
  return [...found].map(([username, blockId]) => ({ username, blockId }));
}

export function inlinePlainText(text: string) {
  const flatten = (nodes: InlineNode[]): string =>
    nodes.map((n) => (n.children ? flatten(n.children) : n.text || "")).join("");
  return flatten(parseInline(text));
}
