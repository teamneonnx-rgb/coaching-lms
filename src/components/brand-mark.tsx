import { GraduationCap } from "lucide-react";

// Brand identity used across every shell. `brand` is resolved server-side via
// getBranding() and threaded down (client chrome receives it as a prop). When a
// custom logo URL is set it renders the image; otherwise the fallback glyph on
// the institute's accent colour. Pure/presentational — safe in server & client.
export type Brand = { name: string; logoUrl: string | null; color: string };

const SIZES = {
  sm: { tile: "size-7", icon: "size-4" },
  md: { tile: "size-8", icon: "size-5" },
  lg: { tile: "size-9", icon: "size-5" },
  xl: { tile: "size-14", icon: "size-8" },
} as const;

export function BrandMark({
  brand,
  size = "md",
  showName = true,
  nameClassName = "text-sm font-semibold tracking-tight",
}: {
  brand: Brand;
  size?: keyof typeof SIZES;
  showName?: boolean;
  nameClassName?: string;
}) {
  const s = SIZES[size];
  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex ${s.tile} items-center justify-center overflow-hidden rounded-lg text-white`}
        style={{ backgroundColor: brand.logoUrl ? "transparent" : brand.color }}
      >
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary/data-URI logo, next/image can't optimise it
          <img src={brand.logoUrl} alt={brand.name} className={`${s.tile} object-contain`} />
        ) : (
          <GraduationCap className={s.icon} />
        )}
      </span>
      {showName && <span className={nameClassName}>{brand.name}</span>}
    </span>
  );
}
