import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { createPublicMetadata, getOrganizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = createPublicMetadata({
  title: "About MedElite Academy",
  description:
    "Learn how MedElite Academy helps medical students and instructors teach, learn, and grow through a focused digital education platform.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="page-grid space-y-10 py-16">
      <JsonLd data={getOrganizationJsonLd()} />
      <SectionHeading
        eyebrow="About MedElite Academy"
        title="A platform built for medical education"
        description="MedElite Academy connects medical instructors with students through a focused, distraction-free online learning experience."
      />

      <div className="space-y-4">
        <Card className="space-y-3">
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Our mission</h3>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">
            We believe medical education should be accessible, well-organized, and built around trust between instructors and students. MedElite Academy gives instructors the tools to share their knowledge and gives students a clear path to learn.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">For instructors</h3>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">
            Create and publish medical courses, upload video lessons, communicate with your students through announcements, and track how your courses are performing.
          </p>
        </Card>
        <Card className="space-y-3">
          <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">For students</h3>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">
            Browse courses from trusted medical professionals, watch video lessons at your own pace, track your progress, and pick up right where you left off on any device.
          </p>
        </Card>
      </div>

      <Card className="space-y-4 text-center">
        <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Interested?</h3>
        <p className="mx-auto max-w-lg text-sm leading-7 text-[var(--color-text-muted)]">
          Whether you want to learn or teach, MedElite Academy is the place to start.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button>Create an account</Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary">Contact us</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
