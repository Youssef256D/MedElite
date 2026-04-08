"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { getPaymentMethodLabel, getEnrollmentStatusLabel, paymentMethodOptions } from "@/modules/courses/constants";
import {
  requestCourseEnrollmentAction,
  type EnrollmentActionState,
} from "@/modules/student/actions";

const initialState: EnrollmentActionState = {
  status: "idle",
};

type EnrollmentFormProps = {
  courseId: string;
  accessType: "FREE" | "PAID";
  priceCents: number | null;
  currentStatus?: "PENDING" | "ACTIVE" | "COMPLETED" | "REJECTED" | "REVOKED" | "PAUSED" | null;
  reviewNotes?: string | null;
  paymentSettings: {
    vodafoneCashNumber: string;
    instapayHandle: string;
    instructions: string;
    currency: string;
  };
};

export function EnrollmentForm({
  courseId,
  accessType,
  priceCents,
  currentStatus,
  reviewNotes,
  paymentSettings,
}: EnrollmentFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(requestCourseEnrollmentAction, initialState);

  useEffect(() => {
    if (state.status === "success" && state.refresh) {
      router.refresh();
    }
  }, [router, state.refresh, state.status]);

  if (currentStatus === "ACTIVE" || currentStatus === "COMPLETED") {
    return (
      <div className="rounded-2xl bg-[#e6f4ef] p-4 text-sm text-[#24634e]">
        You are already enrolled in this course.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />

      {currentStatus ? (
        <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
          Current request status: <span className="font-semibold text-[var(--color-text)]">{getEnrollmentStatusLabel(currentStatus)}</span>
        </div>
      ) : null}

      {currentStatus === "PENDING" ? (
        <div className="rounded-2xl bg-[#fff1de] p-4 text-sm text-[#8d5c10]">
          Your payment proof is already under review. Admins will activate the course once it is approved.
        </div>
      ) : accessType === "FREE" ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
            This course is free. Enrolling now will add it directly to your account.
          </div>
          <Button className="w-full" size="lg" type="submit" disabled={pending}>
            {pending ? "Enrolling..." : "Enroll now"}
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
            <p className="font-semibold text-[var(--color-text)]">Payment details</p>
            <p className="mt-2">Vodafone Cash: {paymentSettings.vodafoneCashNumber}</p>
            <p className="mt-1">InstaPay: {paymentSettings.instapayHandle}</p>
            <p className="mt-3">{paymentSettings.instructions}</p>
            {priceCents != null && priceCents > 0 ? (
              <p className="mt-3 font-semibold text-[var(--color-text)]">
                Required amount: {formatCurrency(priceCents, paymentSettings.currency)}
              </p>
            ) : null}
          </div>

          {currentStatus === "REJECTED" && reviewNotes ? (
            <div className="rounded-2xl bg-[#fee7e7] p-4 text-sm text-[#8f2d2d]">
              {reviewNotes}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="paymentMethod">
              Payment method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)]"
              defaultValue={paymentMethodOptions[0]}
              required
            >
              {paymentMethodOptions.map((method) => (
                <option key={method} value={method}>
                  {getPaymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="paymentProof">
              Payment screenshot
            </label>
            <input
              id="paymentProof"
              name="paymentProof"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              className="block w-full rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-brand-soft)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-brand)]"
              required
            />
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={pending}>
            {pending ? "Submitting proof..." : "Submit payment proof"}
          </Button>
        </>
      )}

      {state.message ? (
        <p className={`text-sm ${state.status === "error" ? "text-[#8f2d2d]" : "text-[#24634e]"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
