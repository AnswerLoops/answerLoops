import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

const variants = {
  primary:
    'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 active:bg-brand-800 disabled:opacity-50 disabled:shadow-none',
  secondary:
    'bg-surface text-ink-700 border border-border-strong hover:bg-gray-50 hover:border-brand-200 disabled:opacity-50',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:shadow-none',
  ghost:
    'text-ink-600 hover:bg-gray-100 hover:text-ink-900 disabled:opacity-50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
}
