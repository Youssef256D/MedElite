import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveSiteSettingAction } from "@/modules/admin/actions";
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
      <div className="space-y-4">
        {settings.map((setting) => (
          <Card key={setting.id} className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{setting.label}</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{setting.key}</p>
            </div>
            <form action={saveSiteSettingAction} className="space-y-4">
              <input type="hidden" name="key" value={setting.key} />
              <Textarea name="value" defaultValue={JSON.stringify(setting.value, null, 2)} className="min-h-56 font-mono text-xs" />
              <Button type="submit">Save setting</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
