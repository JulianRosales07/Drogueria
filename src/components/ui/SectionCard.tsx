import type { PropsWithChildren, ReactNode } from 'react'

type SectionCardProps = PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
  className?: string
}>

export function SectionCard({
  title,
  description,
  action,
  className = '',
  children,
}: SectionCardProps) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
