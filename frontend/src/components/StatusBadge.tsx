import React from 'react';

type BadgeType = 'status' | 'type' | 'challan' | 'stock';

interface StatusBadgeProps {
  type: BadgeType;
  value: string;
  isLowStock?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, isLowStock }) => {
  let styles = 'bg-slate-800 text-slate-300 border-slate-700';

  if (type === 'status') {
    switch (value) {
      case 'ACTIVE':
        styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        break;
      case 'LEAD':
        styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        break;
      case 'INACTIVE':
        styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        break;
    }
  } else if (type === 'challan') {
    switch (value) {
      case 'CONFIRMED':
        styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        break;
      case 'DRAFT':
        styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        break;
      case 'CANCELLED':
        styles = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        break;
    }
  } else if (type === 'stock') {
    if (isLowStock) {
      styles = 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse';
    } else {
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  } else if (type === 'type') {
    styles = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}
    >
      {type === 'stock' && isLowStock ? '⚠️ Low Stock' : value}
    </span>
  );
};
