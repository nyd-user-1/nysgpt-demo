import { useNavigate } from 'react-router-dom';

interface MobileMenuIconProps {
  onOpenSidebar: () => void;
}

/** Dots+lines menu icon shown only on mobile (md:hidden). Place in the left side of the header. */
export function MobileMenuIcon({ onOpenSidebar }: MobileMenuIconProps) {
  return (
    <button
      onClick={onOpenSidebar}
      className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md text-foreground hover:bg-muted transition-colors"
      aria-label="Open menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h1"/><path d="M3 12h1"/><path d="M3 19h1"/>
        <path d="M8 5h1"/><path d="M8 12h1"/><path d="M8 19h1"/>
        <path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/>
      </svg>
    </button>
  );
}

/** NYSgpt text button shown only on mobile (md:hidden). Place in the right side of the header. */
export function MobileNYSgpt() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/?prompt=What%20is%20NYSgpt%3F')}
      className="md:hidden inline-flex items-center justify-center h-9 rounded-md px-3 text-foreground hover:bg-muted transition-colors font-semibold text-lg"
    >
      NYSgpt
    </button>
  );
}
