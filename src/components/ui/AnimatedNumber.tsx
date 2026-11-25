import React, { useEffect, useState } from 'react';
import { useSpring } from 'framer-motion';
import { CurrencyCode } from '../../types/finance';
import { formatMoney } from '../../utils/finance';

interface AnimatedNumberProps {
  value: number;
  currency?: CurrencyCode;
  format?: 'currency' | 'percent' | 'integer';
  compact?: boolean;
  showSign?: boolean;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  currency = 'USD',
  format = 'currency',
  compact = false,
  showSign = false,
  className = '',
}) => {
  const spring = useSpring(value, {
    stiffness: 150,
    damping: 26,
    mass: 0.65,
  });
  const [display, setDisplay] = useState<number>(value);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsub = spring.on('change', (latest) => {
      setDisplay(latest);
    });
    return () => unsub();
  }, [spring]);

  let formatted = '';
  if (format === 'currency') {
    formatted = formatMoney(display, currency, { compact, showSign });
  } else if (format === 'percent') {
    const sign = showSign && display > 0 ? '+' : '';
    formatted = `${sign}${display.toFixed(1)}%`;
  } else {
    formatted = Math.round(display).toLocaleString();
  }

  return <span className={`font-mono-num ${className}`}>{formatted}</span>;
};
