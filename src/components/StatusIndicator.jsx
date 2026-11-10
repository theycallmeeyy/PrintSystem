import React from 'react';

/**
 * Real-Time Order Status Indicator
 * Requirements:
 * - Green Dot – Finished: The printing job is completed and ready for pickup or release.
 * - Yellow Dot – In Progress: The printing shop staff is currently processing the order.
 * - Red Dot – New / Pending: The order has been received but printing has not started yet.
 */
export default function StatusIndicator({
  status = 'new',
  size = 'md',
  showLabel = true,
  showPulse = true,
  className = ''
}) {
  const normalizedStatus = (status || 'new').toLowerCase();

  const config = {
    new: {
      colorClass: 'bg-red-500 text-red-700 border-red-200',
      dotColor: 'bg-red-500',
      pulseClass: 'pulse-dot-red',
      label: 'New / Pending',
      shortLabel: 'Pending',
      description: 'Order received – awaiting printing',
      badgeBg: 'bg-red-50 border-red-200 text-red-700'
    },
    'in-progress': {
      colorClass: 'bg-amber-500 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-500',
      pulseClass: 'pulse-dot-yellow',
      label: 'In Progress',
      shortLabel: 'In Progress',
      description: 'Currently processing & printing',
      badgeBg: 'bg-amber-50 border-amber-200 text-amber-700'
    },
    finished: {
      colorClass: 'bg-emerald-500 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
      pulseClass: 'pulse-dot-green',
      label: 'Finished',
      shortLabel: 'Finished',
      description: 'Completed – ready for pickup/delivery',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }
  };

  const current = config[normalizedStatus] || config.new;

  const dotSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-xs font-medium',
    md: 'text-sm font-semibold',
    lg: 'text-base font-bold',
    xl: 'text-lg font-bold'
  };

  return (
    <div
      className={`inline-flex items-center gap-2 ${showLabel ? current.badgeBg : ''} px-2.5 py-1 rounded-full border border-opacity-75 transition-all duration-300 ${className}`}
      title={`${current.label}: ${current.description}`}
    >
      <span className="relative flex items-center justify-center">
        <span
          className={`inline-block rounded-full ${current.dotColor} ${dotSizes[size] || dotSizes.md} ${
            showPulse ? current.pulseClass : ''
          }`}
        />
      </span>
      {showLabel && (
        <span className={`${textSizes[size] || textSizes.md} tracking-tight`}>
          {current.label}
        </span>
      )}
    </div>
  );
}

