'use client';

import { motion } from 'framer-motion';

/**
 * Animated conic “spiral” ring around password fields (signup).
 */
export function SpiralPasswordField({ children, className = '' }) {
  return (
    <div className={`relative rounded-xl p-[2px] overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-[-50%] opacity-90"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0%, rgba(16, 185, 129, 0.35) 25%, rgba(16, 185, 129, 0.85) 50%, transparent 75%, transparent 100%)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      />
      <div className="relative rounded-[10px] bg-[#0d1117]">{children}</div>
    </div>
  );
}
