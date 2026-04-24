import { cn } from "@/lib/utils";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";

interface AppLayoutProps {
  sidebarOpen: boolean;
  onSidebarClose: () => void;
  children: React.ReactNode;
  className?: string;
  animateIn?: boolean;
  rightPanel?: React.ReactNode;
  rightPanelOpen?: boolean;
  onRightPanelClose?: () => void;
}

export function AppLayout({
  sidebarOpen,
  onSidebarClose,
  children,
  className,
  animateIn = false,
  rightPanel,
  rightPanelOpen = false,
  onRightPanelClose,
}: AppLayoutProps) {
  return (
    <div className="fixed inset-0 bg-muted/30 overflow-hidden">
      <div className="flex h-full overflow-hidden p-2.5">
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 sm:static sm:z-auto shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
            sidebarOpen ? "w-full sm:w-[260px] sm:mr-2.5" : "w-0"
          )}
        >
          <div className="w-full sm:w-[260px] h-full bg-background border border-border rounded-none sm:rounded-2xl overflow-hidden">
            <NoteViewSidebar onClose={onSidebarClose} />
          </div>
        </div>

        <div
          className={cn(
            "relative flex flex-1 flex-col min-w-0 bg-background border border-border rounded-2xl overflow-hidden",
            animateIn && "animate-zoom-in",
            className
          )}
        >
          {children}
        </div>

        {rightPanel && (
          <div
            className={cn(
              "fixed inset-y-0 right-0 z-50 sm:static sm:z-auto shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
              rightPanelOpen ? "w-full sm:w-[480px] sm:ml-2.5" : "w-0"
            )}
          >
            <div className="w-full sm:w-[480px] h-full bg-background border border-border rounded-none sm:rounded-2xl overflow-hidden">
              {rightPanel}
            </div>
          </div>
        )}
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={onSidebarClose}
        />
      )}

      {rightPanelOpen && onRightPanelClose && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={onRightPanelClose}
        />
      )}
    </div>
  );
}
