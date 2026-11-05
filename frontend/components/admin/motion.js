// Shared framer-motion variants: a parent staggers its children in.
export const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } };
export const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 0.8, 0.3, 1] } } };
