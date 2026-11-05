'use client';
// Wrap a group of GlassCards: they fade and slide in one after another.
import { motion } from 'framer-motion';
import { container } from './motion';

export default function Stagger({ className = '', children, ...rest }) {
  return <motion.div variants={container} initial="hidden" animate="show" className={className} {...rest}>{children}</motion.div>;
}
