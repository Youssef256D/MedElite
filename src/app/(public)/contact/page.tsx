import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { createPublicMetadata, getOrganizationJsonLd } from "@/lib/seo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getBrandingSettings } from "@/modules/site-settings/service";

export const metadata: Metadata = createPublicMetadata({
  title: "Contact MedElite Academy",
  description:
    "Contact MedElite Academy for student support, instructor partnerships, and platform questions about courses and enrollment.",
  path: "/contact",
});

export default async function ContactPage() {
  const branding = await getBrandingSettings();

  return (
    <div className="page-grid space-y-8 py-16">
      <JsonLd data={getOrganizationJsonLd()} />
      <SectionHeading
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about MedElite Academy? Want to teach on our platform? We'd love to hear from you."
      />
      <Card className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Reach us</h2>
          <div className="space-y-2 text-sm leading-7 text-[var(--color-text-muted)]">
            <p>Email: {branding.supportEmail}</p>
            <p>Sunday - Thursday, 9:00 AM - 6:00 PM</p>
          </div>
        </div>
        <form className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Your name" />
            <Input type="email" placeholder="Email address" />
          </div>
          <Input placeholder="Subject" />
          <Textarea placeholder="How can we help?" />
          <Button type="button">Send message</Button>
        </form>
      </Card>
    </div>
  );
}
