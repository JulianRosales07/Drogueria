import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import 'chart.js/auto'
import { StatCard } from '../../../components/ui/StatCard'
import { SectionCard } from '../../../components/ui/SectionCard'
import { getDashboardSummary } from '../../../services/api/dashboard'
import { useUiStore } from '../../../store/ui-store'

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DashboardPage() {
  const storeName = useUiStore((state) => state.user?.storeName)

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  })

  const summary = summaryQuery.data

  // Indicadores del día calculados en el backend: ventas, costo de lo vendido
  // (COGS) y utilidad real. Antes se estimaba en el cliente.
  const today = summary?.today
  const salesTodayTotal = today?.salesTotal ?? 0
  const salesTodayCount = today?.salesCount ?? 0
  const cogsToday = today?.cogs ?? 0
  const profitToday = today?.profit ?? 0
  const marginToday = salesTodayTotal > 0 ? (profitToday / salesTodayTotal) * 100 : 0

  // Serie diaria real de ventas / costo / utilidad (últimos 14 días)
  const daily = summary?.profitDaily ?? []
  const dailyLabels = daily.map((d) =>
    new Date(`${d.day}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
  )

  return (
    <div className="space-y-6">
      {/* Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Resumen Operativo
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Panel de Control de {storeName || 'la Droguería'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Monitoreo del inventario crítico, volumen de ventas diarias y gestión integral del negocio.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Compras del día</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {money(today?.purchasesTotal ?? 0)}
              </p>
              <p className="text-xs text-slate-400">Mercancía ingresada hoy</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-sm text-slate-500 dark:text-slate-400">Productos con Bajo Stock</p>
              <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                {summary?.lowStock?.length ?? 0} alertas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rentabilidad del día: Utilidad = Ventas - Costo de lo vendido */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Ventas del día</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {money(salesTodayTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{salesTodayCount} ventas registradas hoy</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Costo de lo vendido (COGS)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {money(cogsToday)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Costo real de los productos que salieron hoy
          </p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-500/5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Utilidad del día</p>
          <p
            className={`mt-2 text-2xl font-semibold ${
              profitToday >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {money(profitToday)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Ventas − Costo · Margen {marginToday.toFixed(1)}%
          </p>
        </article>
      </section>

      {/* Stats grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Productos"
          value={summary?.counts?.products?.toString() ?? '0'}
          change="Catálogo activo"
          tone="blue"
        />
        <StatCard
          label="Clientes"
          value={summary?.counts?.customers?.toString() ?? '0'}
          change="Clientes registrados"
          tone="emerald"
        />
        <StatCard
          label="Proveedores"
          value={summary?.counts?.suppliers?.toString() ?? '0'}
          change="Socios comerciales"
          tone="violet"
        />
        <StatCard
          label="Total Ventas"
          value={summary?.counts?.sales?.toString() ?? '0'}
          change="Facturas emitidas"
          tone="amber"
        />
        <StatCard
          label="Total Compras"
          value={summary?.counts?.purchases?.toString() ?? '0'}
          change="Entradas registradas"
          tone="blue"
        />
      </section>

      {/* Main dashboard content */}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Trend chart */}
        <SectionCard
          title="Ventas, costo y utilidad (últimos 14 días)"
          description="Utilidad = Ventas − Costo de los productos vendidos"
        >
          {daily.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">
              Aún no hay ventas para calcular la rentabilidad.
            </p>
          ) : (
            <Line
              data={{
                labels: dailyLabels,
                datasets: [
                  {
                    label: 'Ventas',
                    data: daily.map((d) => d.salesTotal),
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.15)',
                    borderWidth: 3,
                    tension: 0.35,
                  },
                  {
                    label: 'Costo (COGS)',
                    data: daily.map((d) => d.cogs),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderWidth: 2,
                    tension: 0.35,
                  },
                  {
                    label: 'Utilidad',
                    data: daily.map((d) => d.profit),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: ${money(Number(ctx.parsed.y))}`,
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value) => money(Number(value)),
                    },
                  },
                },
              }}
            />
          )}
        </SectionCard>

        {/* Low Stock Alerts */}
        <SectionCard title="Alertas de Inventario" description="Productos debajo del stock mínimo sugerido">
          <div className="space-y-3">
            {summary?.lowStock && summary.lowStock.length > 0 ? (
              summary.lowStock.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{prod.name}</p>
                    <p className="text-[10px] text-slate-400">SKU: {prod.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600 dark:text-red-400">Stock: {prod.stock}</p>
                    <p className="text-[10px] text-slate-400">Mín: {prod.min_stock}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-400 py-6">🎉 Todo el stock está en niveles correctos.</p>
            )}
          </div>
        </SectionCard>
      </section>

      {/* Recent Activity lists */}
      <section className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Últimas Ventas (POS)" description="Recientes tickets de caja">
          <div className="space-y-2.5">
            {summary?.recentSales && summary.recentSales.length > 0 ? (
              summary.recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex justify-between items-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      👤 {sale.customers?.full_name || 'Venta de Mostrador (Anon)'}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(sale.created_at)}</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{money(sale.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-400 py-4">No hay ventas registradas.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Últimas Compras (Abastecimiento)" description="Recientes entradas de inventario">
          <div className="space-y-2.5">
            {summary?.recentPurchases && summary.recentPurchases.length > 0 ? (
              summary.recentPurchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="flex justify-between items-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      🚚 {purchase.suppliers?.business_name || 'Proveedor'}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatDate(purchase.created_at)}</p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{money(purchase.total)}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-400 py-4">No hay compras registradas.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  )
}
