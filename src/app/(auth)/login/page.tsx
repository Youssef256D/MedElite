import Link from "next/link";

import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">Sign in</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-text)]">Welcome back</h1>
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">
          Sign in to continue learning, manage your courses, or open the admin console.
        </p>
      </div>
      <LoginForm />
      <p className="text-sm text-[var(--color-text-muted)]">
        New to MedElite?{" "}
        <Link href="/register" className="font-semibold text-[var(--color-brand)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
