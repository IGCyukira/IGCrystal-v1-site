import type { ImageLoaderProps } from "next/image";

// Append width/quality so the backend can return device-appropriate sizes
export default function wenturcLoader({ src, width, quality }: ImageLoaderProps) {
  const hasQuery = src.includes("?");
  const q = quality ?? 75;
  return `${src}${hasQuery ? "&" : "?"}w=${width}&q=${q}`;
}


