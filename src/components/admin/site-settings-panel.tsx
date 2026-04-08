"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import type { Tables } from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSiteSettingAction } from "@/modules/admin/actions";

type SiteSettingRecord = Pick<Tables<"SiteSetting">, "id" | "key" | "group" | "label" | "value">;

type AccessLimitsValue = {
  defaultSessionLimit: number;
  defaultDeviceLimit: number;
};

type UploadPolicyValue = {
  maxUploadSizeBytes: number;
  chunkSizeBytes: number;
  allowedMimeTypes: string[];
};

type MediaSecurityValue = {
  playbackUrlTtlSeconds: number;
  dynamicWatermarkEnabled: boolean;
  signedPlaybackRequired: boolean;
  sessionBindingEnabled: boolean;
};

type ManualPaymentValue = {
  vodafoneCashNumber: string;
  instapayHandle: string;
  instructions: string;
  currency: string;
};

type HomepageValue = {
  heroTitle: string;
  heroSubtitle: string;
  featuredCourseSlugs: string[];
  testimonials: Array<{ name: string; role: string; quote: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

type BrandingValue = {
  platformName: string;
  supportEmail: string;
  accent: string;
  accentSoft: string;
};

const settingDescriptions: Record<string, string> = {
  "platform.access.limits": "Control how many devices and active sessions each account can hold before the security layer intervenes.",
  "platform.uploads": "Keep file uploads practical by setting a size cap, chunking strategy, and the allowed media formats.",
  "security.media": "Turn playback protections on or off with simple toggles instead of editing raw configuration text.",
  "billing.manual-payments": "Update the transfer destinations and instructions students see before they upload payment proof.",
  "site.homepage": "Manage the homepage hero copy, featured courses, testimonials, and FAQs from one clean editor.",
  "site.branding": "Adjust brand name, support contact, and accent colors used across the public site.",
};

const panelEyebrows: Record<string, string> = {
  platform: "Platform",
  security: "Security",
  billing: "Billing",
  site: "Site",
};

function toIntegerString(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function toMegabytesString(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return String(Math.round(value / (1024 * 1024)));
}

function parseInteger(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function parseMegabytes(value: string, fallbackBytes: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackBytes;
  }

  return Math.round(parsed * 1024 * 1024);
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatTestimonials(value: HomepageValue["testimonials"]) {
  return value.map((item) => `${item.name} | ${item.role} | ${item.quote}`).join("\n");
}

function parseTestimonials(value: string) {
  return splitLines(value)
    .map((line) => {
      const [name, role, ...quoteParts] = line.split("|").map((part) => part.trim());
      const quote = quoteParts.join(" | ").trim();

      if (!name || !role || !quote) {
        return null;
      }

      return { name, role, quote };
    })
    .filter((item): item is HomepageValue["testimonials"][number] => Boolean(item));
}

function formatFaqs(value: HomepageValue["faqs"]) {
  return value.map((item) => `${item.question} | ${item.answer}`).join("\n");
}

function parseFaqs(value: string) {
  return splitLines(value)
    .map((line) => {
      const [question, ...answerParts] = line.split("|").map((part) => part.trim());
      const answer = answerParts.join(" | ").trim();

      if (!question || !answer) {
        return null;
      }

      return { question, answer };
    })
    .filter((item): item is HomepageValue["faqs"][number] => Boolean(item));
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--color-text)]">{label}</p>
        <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200",
          checked
            ? "border-[var(--color-brand)] bg-[var(--color-brand)]"
            : "border-[var(--color-border)] bg-white",
        ].join(" ")}
      >
        <span
          className={[
            "h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-7" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function SaveSettingButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save settings"}
    </Button>
  );
}

function SettingShell({
  setting,
  children,
  serializedValue,
}: {
  setting: SiteSettingRecord;
  children: React.ReactNode;
  serializedValue: string;
}) {
  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
          {panelEyebrows[setting.group] ?? setting.group ?? "Setting"}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{setting.label}</h2>
        <p className="text-sm leading-7 text-[var(--color-text-muted)]">
          {settingDescriptions[setting.key] ?? setting.key}
        </p>
      </div>
      <form action={saveSiteSettingAction} className="space-y-5">
        <input type="hidden" name="key" value={setting.key} />
        <input type="hidden" name="value" value={serializedValue} readOnly />
        {children}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-sm text-[var(--color-text-muted)]">Changes save directly to the live site configuration.</p>
          <SaveSettingButton />
        </div>
      </form>
    </Card>
  );
}

function AccessLimitsCard({ setting }: { setting: SiteSettingRecord }) {
  const initial = setting.value as AccessLimitsValue;
  const [defaultSessionLimit, setDefaultSessionLimit] = useState(toIntegerString(initial.defaultSessionLimit));
  const [defaultDeviceLimit, setDefaultDeviceLimit] = useState(toIntegerString(initial.defaultDeviceLimit));

  const serializedValue = JSON.stringify({
    defaultSessionLimit: parseInteger(defaultSessionLimit, initial.defaultSessionLimit),
    defaultDeviceLimit: parseInteger(defaultDeviceLimit, initial.defaultDeviceLimit),
  });

  return (
    <SettingShell setting={setting} serializedValue={serializedValue}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Default session limit</span>
          <Input
            type="number"
            min={1}
            value={defaultSessionLimit}
            onChange={(event) => setDefaultSessionLimit(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Default device limit</span>
          <Input
            type="number"
            min={1}
            value={defaultDeviceLimit}
            onChange={(event) => setDefaultDeviceLimit(event.target.value)}
          />
        </label>
      </div>
    </SettingShell>
  );
}

function UploadPolicyCard({ setting }: { setting: SiteSettingRecord }) {
  const initial = setting.value as UploadPolicyValue;
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState(toMegabytesString(initial.maxUploadSizeBytes));
  const [chunkSizeMb, setChunkSizeMb] = useState(toMegabytesString(initial.chunkSizeBytes));
  const [allowedMimeTypes, setAllowedMimeTypes] = useState(initial.allowedMimeTypes.join("\n"));

  const serializedValue = JSON.stringify({
    maxUploadSizeBytes: parseMegabytes(maxUploadSizeMb, initial.maxUploadSizeBytes),
    chunkSizeBytes: parseMegabytes(chunkSizeMb, initial.chunkSizeBytes),
    allowedMimeTypes: splitLines(allowedMimeTypes),
  });

  return (
    <SettingShell setting={setting} serializedValue={serializedValue}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Max upload size (MB)</span>
          <Input
            type="number"
            min={1}
            value={maxUploadSizeMb}
            onChange={(event) => setMaxUploadSizeMb(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Chunk size (MB)</span>
          <Input
            type="number"
            min={1}
            value={chunkSizeMb}
            onChange={(event) => setChunkSizeMb(event.target.value)}
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Allowed MIME types</span>
        <Textarea
          value={allowedMimeTypes}
          onChange={(event) => setAllowedMimeTypes(event.target.value)}
          className="min-h-32"
        />
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">One MIME type per line</p>
      </label>
    </SettingShell>
  );
}

function MediaSecurityCard({ setting }: { setting: SiteSettingRecord }) {
  const initial = setting.value as MediaSecurityValue;
  const [playbackUrlTtlSeconds, setPlaybackUrlTtlSeconds] = useState(toIntegerString(initial.playbackUrlTtlSeconds));
  const [dynamicWatermarkEnabled, setDynamicWatermarkEnabled] = useState(initial.dynamicWatermarkEnabled);
  const [signedPlaybackRequired, setSignedPlaybackRequired] = useState(initial.signedPlaybackRequired);
  const [sessionBindingEnabled, setSessionBindingEnabled] = useState(initial.sessionBindingEnabled);

  const serializedValue = JSON.stringify({
    playbackUrlTtlSeconds: parseInteger(playbackUrlTtlSeconds, initial.playbackUrlTtlSeconds),
    dynamicWatermarkEnabled,
    signedPlaybackRequired,
    sessionBindingEnabled,
  });

  return (
    <SettingShell setting={setting} serializedValue={serializedValue}>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Playback URL lifetime (seconds)</span>
        <Input
          type="number"
          min={60}
          value={playbackUrlTtlSeconds}
          onChange={(event) => setPlaybackUrlTtlSeconds(event.target.value)}
        />
      </label>
      <div className="space-y-3">
        <ToggleField
          label="Dynamic watermark"
          description="Overlay the learner identity in playback to discourage recording and leakage."
          checked={dynamicWatermarkEnabled}
          onChange={setDynamicWatermarkEnabled}
        />
        <ToggleField
          label="Signed playback URLs"
          description="Require signed media links so videos expire automatically after a short window."
          checked={signedPlaybackRequired}
          onChange={setSignedPlaybackRequired}
        />
        <ToggleField
          label="Session binding"
          description="Tie playback to the active session so shared links are much less useful."
          checked={sessionBindingEnabled}
          onChange={setSessionBindingEnabled}
        />
      </div>
    </SettingShell>
  );
}

function ManualPaymentsCard({ setting }: { setting: SiteSettingRecord }) {
  const initial = setting.value as ManualPaymentValue;
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState(initial.vodafoneCashNumber);
  const [instapayHandle, setInstapayHandle] = useState(initial.instapayHandle);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [currency, setCurrency] = useState(initial.currency);

  const serializedValue = JSON.stringify({
    vodafoneCashNumber,
    instapayHandle,
    instructions,
    currency,
  });

  return (
    <SettingShell setting={setting} serializedValue={serializedValue}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Vodafone Cash number</span>
          <Input value={vodafoneCashNumber} onChange={(event) => setVodafoneCashNumber(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">InstaPay handle</span>
          <Input value={instapayHandle} onChange={(event) => setInstapayHandle(event.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Instructions</span>
          <Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} className="min-h-32" />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Currency</span>
          <Input value={currency} onChange={(event) => setCurrency(event.target.value)} />
        </label>
      </div>
    </SettingShell>
  );
}

function HomepageCard({ setting }: { setting: SiteSettingRecord }) {
  const initial = setting.value as HomepageValue;
  const [heroTitle, setHeroTitle] = useState(initial.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(initial.heroSubtitle);
  const [featuredCourseSlugs, setFeaturedCourseSlugs] = useState(initial.featuredCourseSlugs.join("\n"));
  const [testimonials, setTestimonials] = useState(formatTestimonials(initial.testimonials));
  const [faqs, setFaqs] = useState(formatFaqs(initial.faqs));

  const serializedValue = JSON.stringify({
    heroTitle,
    heroSubtitle,
    featuredCourseSlugs: splitLines(featuredCourseSlugs),
    testimonials: parseTestimonials(testimonials),
    faqs: parseFaqs(faqs),
  });

  return (
    <SettingShell setting={setting} serializedValue={serializedValue}>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Hero title</span>
        <Input value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Hero subtitle</span>
        <Textarea value={heroSubtitle} onChange={(event) => setHeroSubtitle(event.target.value)} className="min-h-28" />
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Featured course slugs</span>
        <Textarea
          value={featuredCourseSlugs}
          onChange={(event) => setFeaturedCourseSlugs(event.target.value)}
          className="min-h-28"
        />
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">One course slug per line</p>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">Testimonials</span>
        <Textarea
          value={testimonials}
          onChange={(event) => setTestimonials(event.target.value)}
          className="min-h-36"
        />
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
          One line per item: Name | Role | Quote
        </p>
      </label>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">FAQs</span>
        <Textarea value={faqs} onChange={(event) => setFaqs(event.target.value)} className="min-h-36" />
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
          One line per item: Question | Answer
        </p>
      </label>
    </SettingShell>
  );
}

function BrandingCard({ setting }: { setting: SiteSettingRecord }) {
  const initial = setting.value as BrandingValue;
  const [platformName, setPlatformName] = useState(initial.platformName);
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail);
  const [accent, setAccent] = useState(initial.accent);
  const [accentSoft, setAccentSoft] = useState(initial.accentSoft);

  const serializedValue = JSON.stringify({
    platformName,
    supportEmail,
    accent,
    accentSoft,
  });

  return (
    <SettingShell setting={setting} serializedValue={serializedValue}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Platform name</span>
          <Input value={platformName} onChange={(event) => setPlatformName(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Support email</span>
          <Input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Primary accent</span>
          <div className="flex items-center gap-3">
            <Input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} className="h-12 w-20 rounded-2xl p-2" />
            <Input value={accent} onChange={(event) => setAccent(event.target.value)} />
          </div>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium text-[var(--color-text)]">Soft accent</span>
          <div className="flex items-center gap-3">
            <Input
              type="color"
              value={accentSoft}
              onChange={(event) => setAccentSoft(event.target.value)}
              className="h-12 w-20 rounded-2xl p-2"
            />
            <Input value={accentSoft} onChange={(event) => setAccentSoft(event.target.value)} />
          </div>
        </label>
      </div>
    </SettingShell>
  );
}

function FallbackJsonCard({ setting }: { setting: SiteSettingRecord }) {
  const [value, setValue] = useState(JSON.stringify(setting.value, null, 2));

  return (
    <SettingShell setting={setting} serializedValue={value}>
      <label className="space-y-2">
        <span className="text-sm font-medium text-[var(--color-text)]">JSON value</span>
        <Textarea value={value} onChange={(event) => setValue(event.target.value)} className="min-h-56 font-mono text-xs" />
      </label>
    </SettingShell>
  );
}

function SiteSettingCard({ setting }: { setting: SiteSettingRecord }) {
  switch (setting.key) {
    case "platform.access.limits":
      return <AccessLimitsCard setting={setting} />;
    case "platform.uploads":
      return <UploadPolicyCard setting={setting} />;
    case "security.media":
      return <MediaSecurityCard setting={setting} />;
    case "billing.manual-payments":
      return <ManualPaymentsCard setting={setting} />;
    case "site.homepage":
      return <HomepageCard setting={setting} />;
    case "site.branding":
      return <BrandingCard setting={setting} />;
    default:
      return <FallbackJsonCard setting={setting} />;
  }
}

export function SiteSettingsPanel({ settings }: { settings: SiteSettingRecord[] }) {
  return (
    <div className="space-y-5">
      {settings.map((setting) => (
        <SiteSettingCard key={setting.id} setting={setting} />
      ))}
    </div>
  );
}
