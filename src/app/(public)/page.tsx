import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/transitions/fade-in";
import { getCurrentSession, getRoleHome } from "@/modules/auth/service";
import { getHomepageSettings } from "@/modules/site-settings/service";

export default async function LandingPage() {
  const [homepage, session] = await Promise.all([getHomepageSettings(), getCurrentSession()]);
  const primaryHref = session ? getRoleHome(session.user.role) : "/register";
  const primaryLabel = session ? "Open dashboard" : "Get started";

  return (
    <div className="pb-20">
      <section className="page-grid py-20 md:py-32">
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <FadeIn>
            <h1 className="display-copy text-balance text-5xl font-semibold tracking-tight text-[var(--color-text)] md:text-7xl">
              {homepage.heroTitle}
            </h1>
          </FadeIn>
          <FadeIn delay={0.08}>
            <p className="mx-auto max-w-xl text-lg leading-9 text-[var(--color-text-muted)]">{homepage.heroSubtitle}</p>
          </FadeIn>
          <FadeIn delay={0.14}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href={primaryHref}>
                <Button size="lg">
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="secondary" size="lg">
                  Learn more
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <FadeIn delay={0.2}>
        <section className="page-grid py-16 md:py-20">
          <div className="rounded-[32px] bg-[var(--color-text)] px-6 py-14 md:px-12 md:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-soft)]">Why MedElite Academy</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Everything you need to teach and learn medicine online
            </h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-[24px] bg-white/10 lg:grid-cols-3">
              {[
                {
                  icon: <BookOpen className="h-6 w-6" />,
                  title: "Structured courses",
                  description: "Organized lessons with video content, clear progression, and a focused learning experience built for medical education.",
                },
                {
                  icon: <GraduationCap className="h-6 w-6" />,
                  title: "Built for instructors",
                  description: "A dedicated space for medical professionals to create, manage, and publish their courses with ease.",
                },
                {
                  icon: <Users className="h-6 w-6" />,
                  title: "Made for students",
                  description: "Track your progress, resume where you left off, and learn at your own pace from trusted medical educators.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-[var(--color-text)] p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[var(--color-brand-soft)]">
                    {item.icon}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.3}>
        <section className="page-grid py-10">
          <Card className="space-y-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--color-text)]">Ready to start learning?</h2>
            <p className="mx-auto max-w-lg text-sm leading-7 text-[var(--color-text-muted)]">
              {session
                ? "Your session is active, so you can jump straight back into your dashboard."
                : "Join MedElite Academy today and get access to high-quality medical courses created by experienced professionals."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href={primaryHref}>
                <Button size="lg">{session ? "Continue learning" : "Create your account"}</Button>
              </Link>
              <Link href="/about">
                <Button variant="secondary" size="lg">Learn more</Button>
              </Link>
            </div>
          </Card>
        </section>
      </FadeIn>
    </div>
  );
}
