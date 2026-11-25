import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Sparkles, TrendingDown, Info, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

const TONE_STYLES = {
  emerald: {
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-600',
    Icon: CheckCircle2,
  },
  amber: {
    border: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-600',
    Icon: Sparkles,
  },
  rose: {
    border: 'border-rose-200',
    iconBg: 'bg-rose-100 text-rose-600',
    Icon: TrendingDown,
  },
  blue: {
    border: 'border-sky-200',
    iconBg: 'bg-sky-100 text-sky-600',
    Icon: Info,
  },
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useFinance();

  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const cfg = TONE_STYLES[t.tone];
          const Icon = cfg.Icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white/95 p-3.5 shadow-xl shadow-slate-900/8 backdrop-blur-xl ${cfg.border}`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
