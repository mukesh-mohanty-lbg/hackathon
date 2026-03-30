import * as React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'

const alertVariants = cva(
  'relative w-full rounded-xl border px-4 py-3 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-3.5 [&>svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border [&>svg]:text-foreground',
        destructive: 'border-destructive/20 bg-destructive/10 text-destructive [&>svg]:text-destructive',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 [&>svg]:text-emerald-600',
        warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300 [&>svg]:text-amber-600',
        info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 [&>svg]:text-blue-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const ICONS = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: TriangleAlert,
  info: Info,
}

function Alert({ className, variant = 'default', children, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  const Icon = ICONS[variant ?? 'default']
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon />
      {children}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
