import type { ContentBlock } from "./content";

export function firstPostImage(contentJson: string | null | undefined) {
  try {
    const blocks = JSON.parse(contentJson || "[]") as ContentBlock[];
    const image = blocks.find((block) => block.type === "image" && block.url);
    if (image?.url) return image.url;
    const direct = blocks.find((block) => block.type === "embed" && block.url && /\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i.test(block.url));
    return direct?.url || null;
  } catch {
    return null;
  }
}
