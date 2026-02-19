import { cn } from "@/lib/utils"

export function InsetPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="h-full md:p-2 bg-muted/30">
      <div className={cn("w-full h-full md:rounded-2xl md:border bg-background overflow-hidden flex flex-col", className)}>
        {children}
      </div>
    </div>
  );
}
