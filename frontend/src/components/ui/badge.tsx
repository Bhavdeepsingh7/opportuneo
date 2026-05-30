import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  tone?: 'green' | 'neutral'
}

export function Badge({ children, className = '', tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span className={['ui-badge', `ui-badge--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  )
}
