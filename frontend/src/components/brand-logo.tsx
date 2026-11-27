import { cn } from "@/lib/utils";

type BrandLogoProps = { className?: string; withMark?: boolean; onDark?: boolean };

/** "LM" monogram: an L with a book standing beside it. */
export function BrandMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect
        width="32"
        height="32"
        rx="8"
        className={onDark ? "fill-spring-green" : "fill-rich-black dark:fill-spring-green"}
      />
      <path d="M9 9.5h3.2v10.3H18V23H9z" className={onDark ? "fill-rich-black" : "fill-spring-green dark:fill-rich-black"} />
      <path
        d="M19.4 9.5H23V23h-3.6z"
        className={onDark ? "fill-rich-black/60" : "fill-mint-green/90 dark:fill-rich-black/60"}
      />
    </svg>
  );
}

export function BrandLogo({ className, withMark = false, onDark = false }: BrandLogoProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 font-playfair leading-none whitespace-nowrap", className)}
      aria-label="Library Manager"
    >
      {withMark && <BrandMark onDark={onDark} />}
      <span aria-hidden="true" className="inline-flex items-baseline gap-[0.22em]">
        <span className="font-bold tracking-[-0.045em]">Library</span>
        <span className="font-medium italic tracking-[-0.035em]">Manager</span>
      </span>
    </span>
  );
}
