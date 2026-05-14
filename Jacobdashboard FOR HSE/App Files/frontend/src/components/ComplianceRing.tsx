type ComplianceRingProps = {
  pct: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function ComplianceRing({
  pct,
  size = 48,
  strokeWidth = 4,
  className,
}: ComplianceRingProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  const color =
    pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`${pct.toFixed(1)}% compliance`}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#30363d"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Label */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.22}
        fontWeight={600}
        fill={color}
      >
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}
