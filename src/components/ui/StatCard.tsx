type StatCardProps = {
  label: string
  value: string
  change: string
  tone?: 'emerald' | 'blue' | 'violet' | 'amber'
}

const toneClasses: Record<NonNullable<StatCardProps['tone']>, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  violet: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
}

export function StatCard({ label, value, change, tone = 'blue' }: StatCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        <span className={`text-xs font-medium ${toneClasses[tone]}`}>{change}</span>
      </div>
    </article>
  )
}
