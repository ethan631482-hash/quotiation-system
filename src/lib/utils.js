import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...inputs) => twMerge(clsx(inputs))
export const formatCurrency = value => `NT$${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(Number(value || 0))}`
export const today = () => new Date().toISOString().slice(0, 10)
