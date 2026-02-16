export default function FooterSimple() {
  return (
    <footer className="bg-background w-full mt-auto">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-10 md:h-24 md:flex-row md:px-6 md:py-0 2xl:max-w-[1400px]">
        <p className="text-muted-foreground text-center text-sm md:text-left">
          &copy; {new Date().getFullYear()}{' '}
          <a href="/" className="font-medium text-foreground hover:text-foreground transition-colors">NYSgpt</a>{' '}
          All rights reserved.{' '}
          <a href="/user-feedback" className="text-muted-foreground hover:text-foreground underline transition-colors">In early development.</a>
        </p>
        <nav className="flex gap-4 md:gap-6">
          <a
            href="/advertise"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Partner
          </a>
          <a
            href="/contact"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Contact
          </a>
          <a
            href="/privacy"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Terms
          </a>
        </nav>
      </div>
    </footer>
  );
}
