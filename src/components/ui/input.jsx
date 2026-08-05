import { cn } from '../../lib/utils'
export function Input({ className, ...props }) { return <input className={cn('flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} /> }
