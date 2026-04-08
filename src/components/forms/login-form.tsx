"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, type ActionState } from "@/modules/auth/actions";

const initialState: ActionState = {
  status: "idle",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" placeholder="Your secure password" required minLength={8} />
      </div>
      {state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-[#9c3c3c]" : "text-[var(--color-brand)]"}`}>{state.message}</p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
