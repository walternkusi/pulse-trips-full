'use client';
// Smooth page transitions: every admin page slides and fades in (the shell around it stays put).
import { motion } from 'framer-motion';

export default function AdminTemplate({ children }) {
  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.22, 0.8, 0.3, 1] }}>{children}</motion.div>;
}
