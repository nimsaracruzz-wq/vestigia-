import { motion } from "framer-motion";
import { useAdmin } from "../../admin/AdminContext";

export default function Announcement() {
  const { settings } = useAdmin();

  const isEnabled =
    settings.announcementEnabled === true ||
    String(settings.announcementEnabled) === "true";

  if (!isEnabled || !settings.announcementText || !settings.announcementText.trim()) {
    return null;
  }

  return (
    <div className="announcement">
      <motion.span
        key={settings.announcementText}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
      >
        {settings.announcementText}
      </motion.span>
    </div>
  );
}
