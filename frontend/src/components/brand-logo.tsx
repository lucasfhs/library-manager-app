import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Use on dark surfaces (auth panel, sidebar) so the accent stays readable. */
  onDark?: boolean;
};

export function BrandLogo({ className, onDark = false }: BrandLogoProps) {
  return (
    <span
      className={cn("inline-flex items-baseline font-brand leading-none whitespace-nowrap", className)}
      role="img"
      aria-label="Library Manager"
    >
      <span aria-hidden="true" className="font-extrabold tracking-[-0.04em]">
        Library
      </span>
      <span
        aria-hidden="true"
        className={cn("ml-[0.26em] font-normal tracking-[-0.03em]", onDark ? "text-spring-green" : "text-brand-ink")}
      >
        Manager
      </span>
    </span>
  );
}
