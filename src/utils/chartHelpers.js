import { Chart } from 'chart.js';

// Custom Chart.js Plugin to draw target goal lines without forcing axis re-scale
export const goalLinePlugin = {
  id: 'goalLine',
  afterDraw: (chart) => {
    const goalOpts = chart.options.plugins?.goalLine;
    if (!goalOpts || !goalOpts.lines || goalOpts.lines.length === 0) return;
    
    const yScale = chart.scales.y;
    const ctx = chart.ctx;
    const xLeft = chart.scales.x.left;
    const xRight = chart.scales.x.right;
    
    goalOpts.lines.forEach(line => {
      const value = line.value;
      if (value === undefined || value === null) return;
      
      if (value >= yScale.min && value <= yScale.max) {
        const y = yScale.getPixelForValue(value);

        ctx.save();
        ctx.strokeStyle = line.color || '#8b5cf6';
        ctx.lineWidth = line.lineWidth || 1.5;

        if (line.dashed) {
          ctx.setLineDash([5, 5]); // Dashed line
        } else {
          ctx.setLineDash([]); // Solid line
        }

        ctx.beginPath();
        ctx.moveTo(xLeft, y);
        ctx.lineTo(xRight, y);
        ctx.stroke();

        ctx.fillStyle = line.textColor || line.color || '#a78bfa';
        ctx.font = '10px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${line.label || 'Goal'}: ${value}${goalOpts.unit || ''}`, xRight - 6, y - 3);
        ctx.restore();
      }
    });
  }
};

// Generates multiple goal lines configuration based on paliers for weight, fat, lean, and fat mass charts
export function getGoalLinesForMetric(metricType, paliers = [], activePalier = null) {
  if (!paliers || paliers.length === 0) return [];

  const activeIndex = activePalier ? paliers.findIndex(p => p.id === activePalier.id) : -1;

  return paliers.map((palier, index) => {
    let value = null;
    let label = `Palier ${index + 1}`;
    let baseColor = '';

    if (metricType === 'weight') {
      value = palier.mass;
      baseColor = '139, 92, 246'; // violet
    } else if (metricType === 'fat') {
      value = palier.fat;
      baseColor = '16, 185, 129'; // emerald
    } else if (metricType === 'lean') {
      value = (palier.mass !== null && palier.fat !== null)
        ? palier.mass - (palier.mass * (palier.fat / 100))
        : null;
      baseColor = '59, 130, 246'; // blue
    } else if (metricType === 'fat_mass') {
      value = (palier.mass !== null && palier.fat !== null)
        ? palier.mass * (palier.fat / 100)
        : null;
      baseColor = '245, 158, 11'; // amber
    }

    if (value === null) return null;

    let dashed = !palier.validated;
    let opacity = 0.8;
    let strokeColor = '';

    if (palier.validated) {
      strokeColor = `rgba(16, 185, 129, 0.4)`;
    } else {
      if (activeIndex !== -1) {
        const diff = Math.abs(index - activeIndex);
        opacity = Math.max(0.15, 0.8 - (diff * 0.25));
      }
      strokeColor = `rgba(${baseColor}, ${opacity})`;
    }

    return {
      value,
      label,
      color: strokeColor,
      textColor: strokeColor,
      dashed,
      lineWidth: activeIndex === index ? 2 : 1.2
    };
  }).filter(Boolean);
}

// Helper to calculate Y-axis scaling to show all data points and paliers with a small extra margin
export function getScaleLimits(dataPointsList, metricType, paliers = [], activePalier = null) {
  const values = dataPointsList.flatMap(dp => dp.map(item => item.y)).filter(v => v !== null && v !== undefined && !isNaN(v));
  const goalLines = getGoalLinesForMetric(metricType, paliers, activePalier);
  const goalValues = goalLines.map(gl => gl.value).filter(v => v !== null && v !== undefined && !isNaN(v));

  const allValues = [...values, ...goalValues];
  if (allValues.length === 0) return {};

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  const margin = (metricType === 'fat') ? 1.5 : 2.0;

  return {
    min: Math.max(0, minVal - margin),
    max: maxVal + margin
  };
}

export const commonMonthlyTimeScaleOptions = {
  type: 'time',
  time: {
    unit: 'month',
    tooltipFormat: 'MMM yyyy',
    displayFormats: {
      month: 'MMM yyyy'
    }
  },
  grid: { display: false },
  ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
};

export const commonWeeklyTimeScaleOptions = {
  type: 'time',
  time: {
    unit: 'week',
    tooltipFormat: 'MMM d, yyyy',
    displayFormats: {
      week: 'MMM d'
    }
  },
  grid: { display: false },
  ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 10 } }
};

// Color palettes configuration for charts
export const CHART_THEMES = {
  violet: {
    strokeStart: '#a78bfa',
    strokeEnd: '#4f46e5',
    fillColor: 'rgba(139, 92, 246, 0.2)',
    pointBorder: '#8b5cf6',
    avgBorder: 'rgba(167, 139, 250, 0.7)',
    dotBg: 'bg-violet-500'
  },
  blue: {
    strokeStart: '#60a5fa',
    strokeEnd: '#2563eb',
    fillColor: 'rgba(59, 130, 246, 0.2)',
    pointBorder: '#3b82f6',
    avgBorder: 'rgba(147, 197, 253, 0.7)',
    dotBg: 'bg-blue-500'
  },
  emerald: {
    strokeStart: '#34d399',
    strokeEnd: '#059669',
    fillColor: 'rgba(16, 185, 129, 0.2)',
    pointBorder: '#10b981',
    avgBorder: 'rgba(110, 231, 183, 0.7)',
    dotBg: 'bg-emerald-500'
  },
  amber: {
    strokeStart: '#fbbf24',
    strokeEnd: '#d97706',
    fillColor: 'rgba(245, 158, 11, 0.2)',
    pointBorder: '#f59e0b',
    avgBorder: 'rgba(252, 211, 77, 0.7)',
    dotBg: 'bg-amber-500'
  }
};
