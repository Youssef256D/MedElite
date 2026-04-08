import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <div className="page-grid space-y-8 py-16">
      <SectionHeading
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about MedElite? Want to teach on our platform? We'd love to hear from you."
      />
      <Card className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Reach us</h2>
          <div className="space-y-2 text-sm leading-7 text-[var(--color-text-muted)]">
            <p>Email: support@medelite.local</p>
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
