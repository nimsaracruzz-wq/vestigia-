import { useHomepage } from '../../homepage/HomepageContext';
import { CmsAnnouncement } from '../../homepage/HomepageRenderer';
import { Reveal } from "../../animation/Reveal";
import { animationConfig } from "../../animation/config";
import { useAdmin } from "../../admin/AdminContext";

export default function Announcement() {
  const { settings } = useAdmin();
  const { config } = useHomepage();
  if (config) {
    const section = config.sections.find(s => s.type === "announcement");
    return section?.type === "announcement" && section.enabled ? <CmsAnnouncement settings={section.settings} /> : null;
  }

  const isEnabled =
    settings.announcementEnabled === true ||
    String(settings.announcementEnabled) === "true";

  if (!isEnabled || !settings.announcementText || !settings.announcementText.trim()) {
    return null;
  }

  return (
    <div className="announcement">
      <Reveal as="span" variant="fade" trigger="mount" duration={animationConfig.duration.fast}
        key={settings.announcementText}
      >
        {settings.announcementText}
      </Reveal>
    </div>
  );
}
