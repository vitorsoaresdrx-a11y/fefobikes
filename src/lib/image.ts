/**
 * Converts a Supabase Storage public URL into a transformed/optimized URL.
 * Falls through for non-storage URLs.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width = 400,
  quality = 80
): string | null {
  if (!url) return null;
  if (!url.includes('/storage/v1/object/public/')) return url;
  return (
    url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + `?width=${width}&quality=${quality}&format=webp`
  );
}
