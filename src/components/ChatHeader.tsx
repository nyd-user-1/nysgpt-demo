import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NoteViewSidebar } from "@/components/NoteViewSidebar";


interface ChatHeaderProps {
  onNewChat?: () => void;
  onWhatIsNYSgpt?: () => void;
  onOpenSidebar?: () => void;
}

// Dropdown group structure
interface DropdownGroup {
  label: string;
  items: { label: string; to: string }[];
}

// Nav items configuration
const NAV_ITEMS: {
  to: string;
  label: string;
  dropdown?: DropdownGroup[];
}[] = [
  { to: "/", label: "Chat" },
  {
    to: "/explore",
    label: "Explore",
    dropdown: [
      {
        label: "Dashboards",
        items: [
          { label: "Budget", to: "/explore/budget" },
          { label: "Lobbying", to: "/explore/lobbying" },
          { label: "Contracts", to: "/explore/contracts" },
        ],
      },
      {
        label: "Contract Charts",
        items: [
          { label: "Contracts by Month", to: "/explore/contracts/by-month" },
          { label: "Top Vendors", to: "/explore/contracts/by-top-vendors" },
          { label: "Contract Duration", to: "/explore/contracts/by-duration" },
        ],
      },
      {
        label: "Vote Charts",
        items: [
          { label: "Votes by Day", to: "/explore/votes" },
          { label: "Roll Calls", to: "/explore/votes/by-roll-call" },
          { label: "Passed vs. Failed", to: "/explore/votes/by-pass-fail" },
          { label: "By Party", to: "/explore/votes/by-party" },
          { label: "Closest Votes", to: "/explore/votes/by-closest" },
        ],
      },
    ],
  },
  {
    to: "/lists",
    label: "Lists",
    dropdown: [
      {
        label: "Members",
        items: [
          { label: "Sponsored", to: "/lists?tab=members" },
          { label: "Yes Votes", to: "/lists?tab=members" },
          { label: "No Votes", to: "/lists?tab=members" },
        ],
      },
      {
        label: "Lobbyists",
        items: [
          { label: "Earnings", to: "/lists?tab=lobbyists" },
          { label: "Clients", to: "/lists?tab=lobbyists" },
          { label: "Individual Lobbyists", to: "/lists?tab=lobbyists" },
        ],
      },
    ],
  },
  {
    to: "/prompts",
    label: "Prompts",
    dropdown: [
      {
        label: "Prompts",
        items: [
          { label: "User Prompts", to: "/prompts#community" },
          { label: "Admin Prompts", to: "/prompts#lists" },
        ],
      },
    ],
  },
];

export function ChatHeader({ onNewChat, onWhatIsNYSgpt, onOpenSidebar }: ChatHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Self-managed sidebar (used when no onOpenSidebar prop is provided)
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const manageOwnSidebar = !onOpenSidebar;

  // Sliding indicator state
  const navRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, transform: "translateX(0px)" });
  const [isHovering, setIsHovering] = useState(false);

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (manageOwnSidebar) {
      setSidebarMounted(true);
    }
  }, [manageOwnSidebar]);

  const handleOpenSidebar = onOpenSidebar ?? (() => setInternalSidebarOpen(true));

  const handleNewChat = () => {
    // If already on root, force a page reload to reset chat state
    if (location.pathname === '/') {
      window.location.href = '/';
      return;
    }
    // Otherwise navigate to root
    navigate('/');
  };

  const handleHeartClick = () => {
    // Trigger confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.1, y: 0.1 },
      colors: ['#ff6b6b', '#ff8e8e', '#ffb3b3', '#ffd4d4', '#3D63DD'],
    });

    // Navigate to root with prompt to trigger "What is NYSgpt?" chat
    navigate('/?prompt=What%20is%20NYSgpt%3F');
  };

  // Calculate indicator position based on target element
  const updateIndicator = useCallback((element: HTMLElement | null) => {
    if (!element || !navRef.current) return;

    const navRect = navRef.current.getBoundingClientRect();
    const tabRect = element.getBoundingClientRect();

    // Calculate position relative to nav container
    const offsetX = tabRect.left - navRect.left;

    setIndicatorStyle({
      width: tabRect.width,
      transform: `translateX(${offsetX}px)`,
    });
  }, []);

  // Set initial indicator position on active tab
  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex(item =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    );
    if (activeIndex !== -1 && tabRefs.current[activeIndex]) {
      updateIndicator(tabRefs.current[activeIndex]);
    }
  }, [location.pathname, updateIndicator]);

  // Handle mouse enter on a tab
  const handleTabHover = (index: number) => {
    setIsHovering(true);
    updateIndicator(tabRefs.current[index]);
  };

  // Handle mouse leave from nav - return to active tab
  const handleNavLeave = () => {
    setIsHovering(false);
    const activeIndex = NAV_ITEMS.findIndex(item =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    );
    if (activeIndex !== -1 && tabRefs.current[activeIndex]) {
      updateIndicator(tabRefs.current[activeIndex]);
    }
    // Close dropdown with small delay (allows mouse to reach dropdown)
    dropdownTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  // Show dropdown for a tab (cancel any pending close)
  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setActiveDropdown(label);
  };

  // Hide dropdown with delay
  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  // Navigate from dropdown item
  const handleDropdownNavigate = (to: string) => {
    setActiveDropdown(null);
    navigate(to);
  };

  return (
    <>
      {/* Self-managed sidebar */}
      {manageOwnSidebar && (
        <>
          <div
            className={cn(
              "fixed left-0 top-0 bottom-0 w-[85vw] max-w-sm md:w-72 bg-background border-r z-[60]",
              sidebarMounted && "transition-transform duration-300 ease-in-out",
              internalSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <NoteViewSidebar onClose={() => setInternalSidebarOpen(false)} />
          </div>
          {internalSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-50 transition-opacity"
              onClick={() => setInternalSidebarOpen(false)}
            />
          )}
        </>
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-2 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          {/* Left side: NYSgpt on mobile, Logs button on desktop */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleOpenSidebar}
              className="hidden md:inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
              </svg>
            </button>
            <button
              onClick={handleHeartClick}
              className="md:hidden inline-flex items-center justify-center h-10 rounded-md px-3 text-black hover:bg-muted transition-colors font-semibold text-xl"
            >
              NYSgpt
            </button>
          </div>

          {/* Center - Navigation with sliding indicator (desktop only) */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            <div
              ref={navRef}
              className="relative flex items-center"
              onMouseLeave={handleNavLeave}
            >
              {/* Sliding indicator - single element that moves between tabs */}
              <div
                className={cn(
                  "absolute top-0 left-0 h-full rounded-lg bg-muted pointer-events-none",
                  "transition-all duration-200 ease-out"
                )}
                style={{
                  width: indicatorStyle.width,
                  transform: indicatorStyle.transform,
                  opacity: indicatorStyle.width > 0 ? 1 : 0,
                }}
              />

              {/* Tab links with optional dropdown */}
              {NAV_ITEMS.map((item, index) => (
                <div
                  key={item.to}
                  className="relative"
                  onMouseEnter={() => {
                    handleTabHover(index);
                    if (item.dropdown) handleDropdownEnter(item.label);
                  }}
                  onMouseLeave={handleDropdownLeave}
                >
                  <Link
                    ref={(el) => { tabRefs.current[index] = el; }}
                    to={item.to}
                    onFocus={() => handleTabHover(index)}
                    onClick={() => setActiveDropdown(null)}
                    className={cn(
                      "relative z-10 text-sm font-normal px-3 py-2 rounded-lg transition-colors min-w-[160px] text-center block",
                      // Active state based on current route
                      (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to))
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>

                  {/* Dropdown panel */}
                  {item.dropdown && activeDropdown === item.label && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50"
                      onMouseEnter={() => handleDropdownEnter(item.label)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      <div className="bg-background border border-border rounded-xl shadow-lg py-2 min-w-[200px]">
                        {item.dropdown.map((group, gi) => (
                          <div key={group.label}>
                            {gi > 0 && <div className="my-1.5 border-t border-border" />}
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 py-1">
                              {group.label}
                            </p>
                            {group.items.map((sub) => (
                              <button
                                key={sub.label}
                                onClick={() => handleDropdownNavigate(sub.to)}
                                className="w-full text-left text-sm px-3 py-1.5 hover:bg-muted transition-colors text-foreground"
                              >
                                {sub.label}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right side: NYSgpt on desktop, Logs button on mobile */}
          <div className="flex items-center gap-2">
            {/* NYSgpt button (desktop only) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleHeartClick}
                  className="hidden md:inline-flex items-center justify-center h-10 rounded-md px-3 text-black hover:bg-muted transition-colors font-semibold text-xl"
                >
                  NYSgpt
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-medium">
                What is NYSgpt?
              </TooltipContent>
            </Tooltip>
            {/* Logs button (mobile only) */}
            <button
              onClick={handleOpenSidebar}
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md text-foreground hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
                <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
                <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
