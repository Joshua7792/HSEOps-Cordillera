import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'

type AnimatedCounterProps = {
  to: number
  duration?: number
  decimals?: number
  suffix?: string
  className?: string
}

export function AnimatedCounter({
  to,
  duration = 1.2,
  decimals = 0,
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const controls = animate(0, to, {
      duration,
      ease: 'easeOut',
      onUpdate(value) {
        el.textContent = value.toFixed(decimals) + suffix
      },
    })
    return () => controls.stop()
  }, [to, duration, decimals, suffix])

  return (
    <span ref={ref} className={className}>
      {to.toFixed(decimals)}{suffix}
    </span>
  )
}
