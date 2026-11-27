import { AlertCircleIcon, InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormAlert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "info";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircleIcon : InfoIcon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex animate-fade-in gap-3 rounded-lg border px-3.5 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-brand/40 bg-brand/10 text-foreground",
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
