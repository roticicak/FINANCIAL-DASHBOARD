import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  layoutId: string;
  size?: 'sm' | 'md';
  activeTone?: 'dark' | 'emerald' | 'amber' | 'blue';
  className?: string;
}

const ACTIVE_BG: Record<string, string> = {
  dark: 'bg-slate-900 shadow-sm shadow-slate-900/20',
  emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/25',
  amber: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm shadow-amber-500/25',
  blue: 'bg-gradient-to-r from-blue-600 to-sky-500 shadow-sm shadow-blue-500/25',
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  size = 'md',
  activeTone = 'dark',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/85 p-1 backdrop-blur-sm ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center gap-1.5 rounded-xl font-semibold transition-colors cursor-pointer select-none ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
            } ${isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className={`absolute inset-0 rounded-xl ${ACTIVE_BG[activeTone]}`}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
