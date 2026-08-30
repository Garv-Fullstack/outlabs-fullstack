import React, { useState, useEffect } from 'react';
import { campaignApi } from '../../api/campaign.api.js';
import { TimelineDataPoint } from '../../types/campaign.types.js';

interface PerformanceChartProps {
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  showDropdown?: boolean;
  initialData?: TimelineDataPoint[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  showDropdown = true,
  initialData
}) => {
  const [selectedRange, setSelectedRange] = useState<'Last 7 days' | 'Last 30 days' | 'Last 90 days'>('Last 7 days');
  const [dataPoints, setDataPoints] = useState<TimelineDataPoint[]>(initialData || []);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const rangeKey = selectedRange === 'Last 90 days' ? '90d' : selectedRange === 'Last 30 days' ? '30d' : '7d';
        const data = await campaignApi.getTimeline(rangeKey);
        if (isMounted) {
          setDataPoints(data || []);
        }
      } catch {
        if (isMounted) {
          // Generate legitimate zero baseline for the days
          const days = selectedRange === 'Last 90 days' ? 90 : selectedRange === 'Last 30 days' ? 30 : 7;
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const empty = Array.from({ length: days }).map((_, i) => {
            const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
            return {
              date: `${d.getDate()} ${monthNames[d.getMonth()]}`,
              sent: 0,
              opens: 0,
              replies: 0
            };
          });
          setDataPoints(empty);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTimeline();
    return () => {
      isMounted = false;
    };
  }, [selectedRange]);

  const activePoints = dataPoints.length > 0 ? dataPoints : [
    { date: 'Day 1', sent: 0, opens: 0, replies: 0 },
    { date: 'Day 2', sent: 0, opens: 0, replies: 0 }
  ];

  // Calculate dynamic maximum value from real data
  const rawMax = Math.max(...activePoints.map(p => p.sent), 10);
  const maxVal = Math.ceil(rawMax / 10) * 10;

  const svgWidth = 620;
  const svgHeight = 150;
  const paddingX = 40;
  const paddingY = 20;

  const getX = (index: number) => {
    if (activePoints.length <= 1) return paddingX;
    return paddingX + (index / (activePoints.length - 1)) * (svgWidth - paddingX * 2);
  };
  const getY = (val: number) => svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);

  const generatePath = (key: 'sent' | 'opens' | 'replies') => {
    return activePoints.reduce((acc, curr, idx) => {
      const x = getX(idx);
      const y = getY(curr[key] || 0);
      if (idx === 0) return `M ${x} ${y}`;
      const prevX = getX(idx - 1);
      const prevY = getY(activePoints[idx - 1]![key] || 0);
      const cp1x = prevX + (x - prevX) / 2;
      const cp2x = prevX + (x - prevX) / 2;
      return `${acc} C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
    }, '');
  };

  const sentPath = generatePath('sent');

  return (
    <div className="chart-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-dot purple"></span>
            <span>Emails Sent</span>
          </div>
        </div>

        {showDropdown && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as any)}
              style={{
                backgroundColor: 'var(--bg-card-secondary)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-main)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ width: '100%', overflowX: 'auto', opacity: loading ? 0.8 : 1, transition: 'opacity 0.2s' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', minWidth: '460px' }}>
          <defs>
            <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, maxVal * 0.33, maxVal * 0.66, maxVal].map((level, i) => {
            const y = getY(level);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="var(--border-card)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  fill="var(--text-subtle)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="inherit"
                >
                  {level === 0 ? '0' : `${Math.round(level)} / day`}
                </text>
              </g>
            );
          })}

          {/* Sent Area & Line */}
          <path
            d={`${sentPath} L ${getX(activePoints.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`}
            fill="url(#purpleGlow)"
          />
          <path
            d={sentPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Data Nodes & Hover Interactivity */}
          {activePoints.map((pt, idx) => {
            const x = getX(idx);
            const ySent = getY(pt.sent);

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Vertical Guideline on Hover */}
                {hoverIndex === idx && (
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={svgHeight - paddingY}
                    stroke="#6366f1"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                )}

                {/* Sent Node */}
                <circle cx={x} cy={ySent} r={hoverIndex === idx ? 5 : 3.5} fill="#6366f1" stroke="#ffffff" strokeWidth="2" />

                {/* X Axis Label */}
                <text
                  x={x}
                  y={svgHeight - 4}
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="inherit"
                >
                  {pt.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Tooltip if Hovered */}
      {hoverIndex !== null && activePoints[hoverIndex] && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '20px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-md)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.75rem',
            zIndex: 10,
            display: 'flex',
            gap: '12px'
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{activePoints[hoverIndex]?.date}</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>Delivered: {activePoints[hoverIndex]?.sent}</span>
        </div>
      )}
    </div>
  );
};
