import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { createPublicMetadata, getFaqJsonLd } from "@/lib/seo";
import { getHomepageSettings } from "@/modules/site-settings/service";

export const metadata: Metadata = createPublicMetadata({
  title: "Frequently Asked Questions",
  description:
    "Read common questions about MedElite Academy, course access, enrollments, and how medical students and instructors use the platform.",
  path: "/faq",
});

export default async function FaqPage() {
  const homepage = await getHomepageSettings();

  return (
    <div className="page-grid space-y-8 py-16">
      <JsonLd data={getFaqJsonLd(homepage.faqs)} />
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Quick answers to common questions about MedElite Academy."
      />
      <div className="space-y-4">
        {homepage.faqs.map((item: { question: string; answer: string }) => (
          <Card key={item.question} className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">{item.question}</h2>
            <p className="text-sm leading-7 text-[var(--color-text-muted)]">{item.answer}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
