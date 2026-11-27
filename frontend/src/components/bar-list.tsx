import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";

type BarListProps = {
  items: { label: string; value: number }[];
  /** Unit shown in the tooltip, e.g. "livros". */
  unit: string;
  ariaLabel: string;
};

/**
 * Ranked horizontal bars, single hue, largest first. Values are printed in
 * text ink beside each bar; the bar itself only carries magnitude.
 */
export function BarList({ items, unit, ariaLabel }: BarListProps) {
  const ranked = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...ranked.map((item) => item.value));
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {ranked.map((item, index) => (
        <li key={item.label}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="group -mx-2 rounded-md px-2 py-1 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                tabIndex={0}
              >
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="font-medium tabular">{formatNumber(item.value)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">
                  <div
                    className="h-full origin-left animate-[bar-grow_0.7s_cubic-bezier(0.22,1,0.36,1)_both] rounded-full bg-chart-bar"
                    style={{ width: `${(item.value / max) * 100}%`, animationDelay: `${index * 60}ms` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              {item.label}: {formatNumber(item.value)} {unit}
            </TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
