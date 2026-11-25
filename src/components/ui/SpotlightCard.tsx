import React, { useRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type AccentTone = 'emerald' | 'amber' | 'blue' | 'rose' | 'violet' | 'neutral';

const SPOTLIGHT_COLORS: Record<AccentTone, string> = {
  emerald: 'rgba(16, 185, 129, 0.14)',
  amber: 'rgba(245, 158, 11, 0.15)',
  blue: 'rgba(14, 165, 233, 0.14)',
  rose: 'rgba(244, 63, 94, 0.13)',
  violet: 'rgba(139, 92, 246, 0.14)',
  neutral: 'rgba(15, 23, 42, 0.05)',
};

const BORDER_GLOW: Record<AccentTone, string> = {
  emerald: 'hover:border-emerald-300/80',
  amber: 'hover:border-amber-300/80',
  blue: 'hover:border-sky-300/80',
  rose: 'hover:border-rose-300/80',
  violet: 'hover:border-violet-300/80',
  neutral: 'hover:border-slate-300/90',
};

interface SpotlightCardProps extends HTMLMotionProps<'div'> {
  accent?: AccentTone;
  interactive?: boolean;
  children: React.ReactNode;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  accent = 'emerald',
  interactive = true,
  className = '',
  children,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`bento-surface relative overflow-hidden rounded-3xl transition-colors duration-300 ${BORDER_GLOW[accent]} ${className}`}
      {...props}
    >
      {interactive && (
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            background: `radial-gradient(420px circle at ${coords.x}px ${coords.y}px, ${SPOTLIGHT_COLORS[accent]}, transparent 65%)`,
          }}
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
};
