import type { ImageLoaderProps } from "next/image";

export default function revaeaLoader({ src, width, quality }: ImageLoaderProps) {
  const hasQuery = src.includes("?");
  const q = quality ?? 75;
  return `${src}${hasQuery ? "&" : "?"}w=${width}&q=${q}`;
}
