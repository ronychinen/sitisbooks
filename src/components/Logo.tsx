import { LOGO_BLUE, LOGO_CIRCLE, LOGO_GOLD, LOGO_PATH, LOGO_VIEWBOX } from "@/lib/logo";

export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={LOGO_VIEWBOX} aria-hidden="true" focusable="false">
      <circle {...LOGO_CIRCLE} fill={LOGO_BLUE} />
      <path d={LOGO_PATH} fill={LOGO_GOLD} />
    </svg>
  );
}
