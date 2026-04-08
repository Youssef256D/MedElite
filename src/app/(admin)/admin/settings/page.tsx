import { SiteSettingsPanel } from "@/components/admin/site-settings-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAdminSiteSettings } from "@/modules/admin/service";

export default async function AdminSettingsPage() {
  const settings = await getAdminSiteSettings();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Site settings"
        title="Branding, homepage, upload, and access configuration"
        description="Settings are stored centrally and consumed by the public site, access layer, payment instructions, and media pipeline."
      />
      <SiteSettingsPanel settings={settings} />
    </div>
  );
}
