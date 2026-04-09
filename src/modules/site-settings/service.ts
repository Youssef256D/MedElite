import { createId, database, maybeOne, type Json } from "@/lib/database";
import { env } from "@/lib/env";

export const defaultSiteSettings = [
  {
    key: "platform.access.limits",
    group: "platform",
    label: "Access limits",
    value: {
      defaultSessionLimit: env.DEFAULT_SESSION_LIMIT,
      defaultDeviceLimit: env.DEFAULT_DEVICE_LIMIT,
    },
  },
  {
    key: "platform.uploads",
    group: "platform",
    label: "Upload policy",
    value: {
      maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
      chunkSizeBytes: env.UPLOAD_CHUNK_SIZE_BYTES,
      allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    },
  },
  {
    key: "security.media",
    group: "security",
    label: "Media deterrence",
    value: {
      playbackUrlTtlSeconds: env.PLAYBACK_URL_TTL_SECONDS,
      dynamicWatermarkEnabled: true,
      signedPlaybackRequired: true,
      sessionBindingEnabled: true,
    },
  },
  {
    key: "billing.manual-payments",
    group: "billing",
    label: "Manual payment instructions",
    value: {
      vodafoneCashNumber: "01000000000",
      instapayHandle: "medelite@instapay",
      instructions:
        "Transfer the course amount, then upload a clear payment screenshot. Admins review requests before paid courses are activated.",
      currency: "EGP",
    },
  },
  {
    key: "site.homepage",
    group: "site",
    label: "Homepage content",
    value: {
      heroTitle: "Elite medical learning with clinical clarity.",
      heroSubtitle:
        "Stream trusted medical education, track mastery, and manage premium teaching operations from a single secure platform.",
      featuredCourseSlugs: ["cardiology-basics", "ecg-interpretation", "pharmacology-foundations"],
      testimonials: [
        {
          name: "Dr. Lina Haroun",
          role: "Internal Medicine Resident",
          quote: "MedElite Academy gives our cohort the structure of a premium academy with the pace of modern clinical learning.",
        },
        {
          name: "Dr. Youssef Adel",
          role: "Cardiology Fellow",
          quote: "The lesson flow is clear, the playback is stable, and the instructor studio feels built for serious educators.",
        },
      ],
      faqs: [
        {
          question: "How do paid courses work?",
          answer:
            "Each paid course is activated after an admin reviews the student's uploaded payment proof, while preview lessons remain visible to everyone.",
        },
        {
          question: "Can instructors upload large files?",
          answer: "Yes. Uploads support resumable chunking, progress tracking, retries, and background processing.",
        },
        {
          question: "Can MedElite Academy stop all screen recording?",
          answer: "No web platform can guarantee perfect prevention. MedElite Academy uses practical deterrents such as signed playback, session limits, audit trails, and dynamic forensic watermarking.",
        },
      ],
    },
  },
  {
    key: "site.branding",
    group: "site",
    label: "Branding",
    value: {
      platformName: "MedElite Academy",
      supportEmail: "support@medeliteacademy.com",
      accent: "#2d6b6a",
      accentSoft: "#dcefed",
    },
  },
] as const;

export async function ensureDefaultSiteSettings() {
  const now = new Date().toISOString();

  await Promise.all(
    defaultSiteSettings.map((setting) =>
      database.from("SiteSetting").upsert(
        {
          id: createId(),
          key: setting.key,
          group: setting.group,
          label: setting.label,
          value: setting.value as unknown as Json,
          updatedAt: now,
        },
        {
          onConflict: "key",
          ignoreDuplicates: false,
        },
      ),
    ),
  );
}

export async function getSettingValue<T>(key: string, fallback: T) {
  const record = await maybeOne(
    database.from("SiteSetting").select("value").eq("key", key).maybeSingle(),
    "Site setting could not be loaded.",
  );

  return (record?.value as T | undefined) ?? fallback;
}

export async function getPlatformAccessSettings() {
  return getSettingValue("platform.access.limits", defaultSiteSettings[0].value);
}

export async function getUploadSettings() {
  return getSettingValue("platform.uploads", defaultSiteSettings[1].value);
}

export async function getMediaSecuritySettings() {
  return getSettingValue("security.media", defaultSiteSettings[2].value);
}

export async function getHomepageSettings() {
  return getSettingValue("site.homepage", defaultSiteSettings[4].value);
}

export async function getBrandingSettings() {
  return getSettingValue("site.branding", defaultSiteSettings[5].value);
}

export async function getManualPaymentSettings() {
  return getSettingValue("billing.manual-payments", defaultSiteSettings[3].value);
}
