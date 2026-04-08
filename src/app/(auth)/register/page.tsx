import Link from "next/link";

import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">Create account</p>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-text)]">Start your MedElite access</h1>
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">
          Student accounts begin with a short trial subscription so you can experience the full premium learning flow.
        </p>
      </div>
      <RegisterForm />
      <p className="text-sm text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--color-brand)]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
