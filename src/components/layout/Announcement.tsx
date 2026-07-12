import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const messages = [
  "DESIGNED IN ITALY · MADE IN SRI LANKA",
  "THE FIRST RELEASE IS NOW AVAILABLE",
  "SHIPPING INFORMATION AVAILABLE AT CHECKOUT",
];

export default function Announcement() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="announcement">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
