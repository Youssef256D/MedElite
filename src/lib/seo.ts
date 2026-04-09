import type { Metadata } from "next";

import { env } from "@/lib/env";

export const siteConfig = {
  name: "MedElite Academy",
  shortName: "MedElite Academy",
  alternateName: "MedElite",
  description:
    "MedElite Academy is a premium medical education platform for modern students, instructors, and admin teams.",
  url: env.NEXT_PUBLIC_APP_URL,
  locale: "en_US",
  keywords: [
    "medical education",
    "medical academy",
    "medical courses",
    "online medical learning",
    "clinical education",
    "medical students",
    "medical instructors",
    "medelite academy",
  ],
  supportEmail: "support@medeliteacademy.com",
};

export function createPublicMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
    },
    openGraph: {
      type: "website",
      title: input.title,
      description: input.description,
      url: input.path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
    },
  };
}

export function createNoIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/favicon.ico`,
    email: siteConfig.supportEmail,
    description: siteConfig.description,
  };
}

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "en",
  };
}

export function getFaqJsonLd(faqs: ReadonlyArray<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
