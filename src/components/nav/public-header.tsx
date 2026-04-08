import Link from "next/link";

import { BrandMark } from "@/components/nav/brand-mark";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";

const navItems = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export async function PublicHeader() {
  const session = await getCurrentSession();
  const dashboardHref = session ? getRoleHome(session.user.role) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(248,245,239,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--color-text-muted)] md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[var(--color-text)]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {dashboardHref ? (
            <>
              <Link
                href={dashboardHref}
                className="hidden text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] sm:inline-flex"
              >
                Dashboard
              </Link>
              <form action={logoutAction}>
                <Button variant="secondary" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-text)] sm:inline-flex">
                Sign in
              </Link>
              <Link href="/register">
                <Button size="sm">Start learning</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
