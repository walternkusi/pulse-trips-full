'use client';
// The basic glass panel. Lifts 5px on hover, and fades in when inside a <Stagger>.
import { motion } from 'framer-motion';
import { item } from './motion';

export default function GlassCard({ as = 'section', hover = true, className = '', children, ...rest }) {
  const Comp = motion[as] || motion.section;
  return (
    <Comp variants={item} whileHover={hover ? { y: -5 } : undefined} transition={{ type: 'spring', stiffness: 300, damping: 22 }} className={`glass-card ${className}`} {...rest}>
      {children}
    </Comp>
  );
}
