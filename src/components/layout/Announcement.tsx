import { motion } from "framer-motion";
import { useAdmin } from "../../admin/AdminContext";

export default function Announcement() {
  const { settings } = useAdmin();

  if (!settings.announcementEnabled) {
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
