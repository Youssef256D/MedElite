import type { Metadata } from "next";

import { ToasterProvider } from "@/components/providers/toaster-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MedElite",
    template: "%s | MedElite",
  },
  description:
    "A premium medical education platform for modern students, instructors, and admin teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className="h-full antialiased"
    >
      <body className="min-h-full">{children}<ToasterProvider /></body>
    </html>
  );
}
