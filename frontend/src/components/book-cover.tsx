import { cn } from "@/lib/utils";

// Deterministic typographic covers keep the catalog consistent without
// depending on external image hosts.
const palettes = [
  { bg: "#0d1321", fg: "#e9fbfb", accent: "#0cf574" },
  { bg: "#1f3d2b", fg: "#f2efe6", accent: "#a6dcae" },
  { bg: "#6b2d2a", fg: "#f6ece2", accent: "#e8b07a" },
  { bg: "#24324d", fg: "#eef1f6", accent: "#9db4e0" },
  { bg: "#d9b45f", fg: "#1d1a12", accent: "#1d1a12" },
  { bg: "#3e3352", fg: "#f1ecf7", accent: "#c7b4e8" },
  { bg: "#e7e2d4", fg: "#1b2330", accent: "#358600" },
  { bg: "#0f4c4a", fg: "#e6f6f2", accent: "#7fe0c4" },
];

type BookCoverProps = {
  id: number;
  title: string;
  author: string;
  category?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  xs: { root: "w-9 rounded-[3px] p-1", title: "text-[5px] leading-[1.15]", meta: "hidden", rule: "hidden" },
  sm: { root: "w-14 rounded-[4px] p-1.5", title: "text-[7px] leading-tight", meta: "hidden", rule: "w-3 mb-1" },
  md: { root: "w-full rounded-md p-4", title: "text-lg leading-tight", meta: "text-[10px]", rule: "w-8 mb-3" },
  lg: { root: "w-full rounded-md p-6", title: "text-2xl leading-tight", meta: "text-xs", rule: "w-10 mb-4" },
};

export function BookCover({ id, title, author, category, size = "md", className }: BookCoverProps) {
  const palette = palettes[Math.abs(id) % palettes.length];
  const s = sizes[size];
  return (
    <div
      role="img"
      aria-label={`Capa de ${title}, de ${author}`}
      className={cn(
        "relative isolate flex aspect-[2/3] shrink-0 flex-col overflow-hidden shadow-[0_1px_2px_rgb(0_0_0/0.12),0_8px_20px_-8px_rgb(13_19_33/0.35)]",
        s.root,
        className
      )}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {/* spine and paper texture */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 -z-10 w-[9%] bg-gradient-to-r from-black/30 via-black/10 to-transparent"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_100%_0%,rgb(255_255_255/0.14),transparent_55%)]"
      />
      {category && (
        <span className={cn("font-semibold tracking-[0.18em] uppercase opacity-75", s.meta)}>{category}</span>
      )}
      <span className="mt-auto" />
      <span className={cn("block h-px", s.rule)} style={{ backgroundColor: palette.accent }} />
      <span className={cn("line-clamp-4 font-playfair font-semibold text-balance", s.title)}>{title}</span>
      <span className={cn("mt-2 truncate tracking-wide uppercase opacity-80", s.meta)}>{author}</span>
    </div>
  );
}
