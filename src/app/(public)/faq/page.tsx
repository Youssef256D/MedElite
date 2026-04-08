import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getHomepageSettings } from "@/modules/site-settings/service";

export default async function FaqPage() {
  const homepage = await getHomepageSettings();

  return (
    <div className="page-grid space-y-8 py-16">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Quick answers to common questions about MedElite."
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
