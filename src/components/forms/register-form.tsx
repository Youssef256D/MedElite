"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStudentYearLabel, studentYearOptions } from "@/modules/courses/constants";
import { registerAction, type ActionState } from "@/modules/auth/actions";

const initialState: ActionState = {
  status: "idle",
};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="firstName">
            First name
          </label>
          <Input id="firstName" name="firstName" placeholder="Lina" required minLength={2} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="lastName">
            Last name
          </label>
          <Input id="lastName" name="lastName" placeholder="Haroun" required minLength={2} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" placeholder="student@medeliteacademy.com" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="studentYear">
          Registered year
        </label>
        <select
          id="studentYear"
          name="studentYear"
          className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
          defaultValue="YEAR_1"
          required
        >
          {studentYearOptions.map((year) => (
            <option key={year} value={year}>
              {getStudentYearLabel(year)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" placeholder="Create a strong password" required minLength={8} />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-[#9c3c3c]" : "text-[var(--color-brand)]"}`}>{state.message}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
