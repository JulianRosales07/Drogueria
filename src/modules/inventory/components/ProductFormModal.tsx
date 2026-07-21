import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  createProduct,
  updateProduct,
  adjustProductStock,
  deleteProduct,
  listCategories,
  createCategory,
  listProductUnits,
  createProductUnit,
  deleteProductUnit,
  type Product,
} from '../../../services/api/products'

function money(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

type ProductFormValues = {
  sku: string
  barcode: string
  name: string
  description: string
  categoryId: string
  cost: number
  price: number
  stock: number
  initialStock: number
  minStock: number
  isActive: boolean
}

type ProductFormModalProps = {
  open: boolean
  product?: Product | null
  onClose: () => void
}

export function ProductFormModal({ open, product, onClose }: ProductFormModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(product)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const { register, handleSubmit, reset, formState, setValue } = useForm<ProductFormValues>({
    defaultValues: {
      sku: '',
      barcode: '',
      name: '',
      description: '',
      categoryId: '',
      cost: 0,
      price: 0,
      stock: 0,
      initialStock: 0,
      minStock: 0,
      isActive: true,
    },
  })

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return

    if (product) {
      reset({
        sku: product.sku,
        barcode: product.barcode ?? '',
        name: product.name,
        description: product.description ?? '',
        categoryId: product.categoryId ?? '',
        cost: product.cost,
        price: product.price,
        stock: product.stock,
        initialStock: 0,
        minStock: product.minStock,
        isActive: product.isActive,
      })
    } else {
      reset({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        categoryId: '',
        cost: 0,
        price: 0,
        stock: 0,
        initialStock: 0,
        minStock: 0,
        isActive: true,
      })
    }
    setShowNewCategory(false)
    setNewCategoryName('')
    setDraftUnits([])
    setNewUnit({ name: '', factor: '', cost: '', price: '', barcode: '' })
  }, [open, product, reset])

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setValue('categoryId', category.id)
      setShowNewCategory(false)
      setNewCategoryName('')
      toast.success('Categoría creada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear la categoría')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const payload = {
        sku: values.sku.trim(),
        barcode: values.barcode.trim() || undefined,
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        categoryId: values.categoryId || null,
        cost: Number(values.cost),
        price: Number(values.price),
        minStock: Number(values.minStock),
        isActive: values.isActive,
      }

      if (isEditing && product) {
        const updated = await updateProduct(product.id, payload)
        const newStock = Number(values.stock)
        if (!Number.isNaN(newStock) && newStock !== product.stock) {
          return adjustProductStock(product.id, newStock)
        }
        return updated
      }

      const created = await createProduct({ ...payload, initialStock: Number(values.initialStock) || 0 })

      // Crear las presentaciones agregadas como borrador antes de guardar el producto
      for (const draft of draftUnits) {
        await createProductUnit(created.id, {
          name: draft.name,
          factor: draft.factor,
          cost: draft.cost,
          price: draft.price,
          barcode: draft.barcode || undefined,
        })
      }

      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(isEditing ? 'Producto actualizado' : 'Producto creado')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar el producto')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!product) return
      return deleteProduct(product.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto eliminado')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar el producto')
    },
  })

  // ===== Presentaciones (Unidad, Caja x10, Caja completa, etc.) =====
  // En modo edición se guardan/eliminan directo contra la API.
  // En modo creación se acumulan como "borrador" y se envían justo después
  // de crear el producto (porque product_units necesita el productId).
  type DraftUnit = { name: string; factor: number; cost: number; price: number; barcode: string }

  const unitsQuery = useQuery({
    queryKey: ['product-units', product?.id],
    queryFn: () => listProductUnits(product!.id),
    enabled: open && isEditing && Boolean(product),
  })

  const [draftUnits, setDraftUnits] = useState<DraftUnit[]>([])
  const [newUnit, setNewUnit] = useState({ name: '', factor: '', cost: '', price: '', barcode: '' })

  const addUnitMutation = useMutation({
    mutationFn: async () => {
      if (!product) return
      return createProductUnit(product.id, {
        name: newUnit.name.trim(),
        factor: Number(newUnit.factor),
        cost: Number(newUnit.cost),
        price: Number(newUnit.price),
        barcode: newUnit.barcode.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-units', product?.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setNewUnit({ name: '', factor: '', cost: '', price: '', barcode: '' })
      toast.success('Presentación agregada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al agregar la presentación')
    },
  })

  const deleteUnitMutation = useMutation({
    mutationFn: deleteProductUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-units', product?.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Presentación eliminada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar la presentación')
    },
  })

  const validateNewUnit = (): DraftUnit | null => {
    const factor = Number(newUnit.factor)
    const cost = Number(newUnit.cost)
    const price = Number(newUnit.price)
    if (!newUnit.name.trim()) {
      toast.error('Ingresa el nombre de la presentación (ej. Caja x10)')
      return null
    }
    if (!factor || factor <= 1) {
      toast.error('El factor debe ser mayor a 1 (unidades que contiene)')
      return null
    }
    if (newUnit.cost.trim() === '' || cost < 0) {
      toast.error('Ingresa el costo de la presentación')
      return null
    }
    if (!price || price <= 0) {
      toast.error('Ingresa el precio de venta de la presentación')
      return null
    }
    return { name: newUnit.name.trim(), factor, cost, price, barcode: newUnit.barcode.trim() }
  }

  const handleAddUnit = () => {
    const draft = validateNewUnit()
    if (!draft) return

    if (isEditing) {
      addUnitMutation.mutate()
    } else {
      setDraftUnits((current) => [...current, draft])
      setNewUnit({ name: '', factor: '', cost: '', price: '', barcode: '' })
    }
  }

  const removeDraftUnit = (index: number) => {
    setDraftUnits((current) => current.filter((_, i) => i !== index))
  }

  const onSubmit = handleSubmit((values) => {
    saveMutation.mutate(values)
  })

  const handleDelete = () => {
    if (!product) return
    if (
      confirm(
        `¿Eliminar "${product.name}"? Esto también borrará sus ventas, compras y movimientos de inventario asociados. Esta acción no se puede deshacer.`,
      )
    ) {
      deleteMutation.mutate()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                SKU / Código *
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('sku', { required: true })}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Código de barras
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('barcode')}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre del producto *
              </span>
              <input
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('name', { required: true })}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Descripción
              </span>
              <textarea
                rows={2}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('description')}
              />
            </label>

            <div className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Categoría
              </span>
              {!showNewCategory ? (
                <div className="flex gap-2">
                  <select
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    {...register('categoryId')}
                  >
                    <option value="">Sin categoría</option>
                    {(categoriesQuery.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    + Nueva
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la categoría"
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                    onClick={() => createCategoryMutation.mutate(newCategoryName.trim())}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Costo *
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('cost', { required: true, min: 0, valueAsNumber: true })}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Precio de venta *
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('price', { required: true, min: 0, valueAsNumber: true })}
              />
            </label>

            {isEditing ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Stock actual
                </span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('stock', { min: 0, valueAsNumber: true })}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Normalmente se ajusta con compras y ventas. Cambiarlo aquí registra un ajuste manual.
                </span>
              </label>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Stock inicial
                </span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  {...register('initialStock', { min: 0, valueAsNumber: true })}
                />
                <span className="mt-1 block text-xs text-slate-400">
                  Cantidad con la que ingresa el producto al inventario
                </span>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Stock mínimo
              </span>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                {...register('minStock', { min: 0, valueAsNumber: true })}
              />
            </label>

            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60 md:col-span-2">
              <input type="checkbox" className="size-4" {...register('isActive')} />
              <span className="text-sm text-slate-700 dark:text-slate-200">Producto activo (visible en el POS)</span>
            </label>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Presentaciones de venta
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              La "Unidad" siempre existe con el costo y precio base del producto. Agrega otras
              presentaciones como "Caja x10" o "Caja completa", cada una con su propio costo,
              precio de venta y código de barras.
            </p>

            <div className="mt-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">Unidad (base)</p>
                  <p className="mt-0.5 text-xs text-slate-400">Presentación individual del producto</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right text-sm">
                    <p className="text-xs text-slate-400">Costo</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {money(Number(product?.cost ?? 0))}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-xs text-slate-400">Precio</p>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      {money(Number(product?.price ?? 0))}
                    </p>
                  </div>
                </div>
              </div>

              {isEditing ? (
                <>
                  {unitsQuery.isLoading && (
                    <p className="text-xs text-slate-400">Cargando presentaciones…</p>
                  )}
                  {(unitsQuery.data ?? []).map((unit) => (
                    <div
                      key={unit.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{unit.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Contiene {unit.factor} unidades{unit.barcode ? ` · Código ${unit.barcode}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right text-sm">
                          <p className="text-xs text-slate-400">Costo</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{money(unit.cost)}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-xs text-slate-400">Precio</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{money(unit.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteUnitMutation.mutate(unit.id)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                          title="Eliminar presentación"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {draftUnits.length === 0 && (
                    <p className="text-xs text-slate-400">
                      Aún no has agregado presentaciones adicionales. Se guardarán al crear el producto.
                    </p>
                  )}
                  {draftUnits.map((unit, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{unit.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Contiene {unit.factor} unidades{unit.barcode ? ` · Código ${unit.barcode}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right text-sm">
                          <p className="text-xs text-slate-400">Costo</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{money(unit.cost)}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-xs text-slate-400">Precio</p>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{money(unit.price)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraftUnit(index)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
                          title="Quitar presentación"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
              <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                Agregar nueva presentación
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Nombre
                  </span>
                  <input
                    placeholder="Ej. Caja x10"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit((u) => ({ ...u, name: e.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Unidades que contiene
                  </span>
                  <input
                    type="number"
                    min="2"
                    placeholder="Ej. 10"
                    value={newUnit.factor}
                    onChange={(e) => setNewUnit((u) => ({ ...u, factor: e.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Costo de la presentación
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$ 0"
                    value={newUnit.cost}
                    onChange={(e) => setNewUnit((u) => ({ ...u, cost: e.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Precio de venta
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$ 0"
                    value={newUnit.price}
                    onChange={(e) => setNewUnit((u) => ({ ...u, price: e.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                    Código de barras (opcional)
                  </span>
                  <input
                    placeholder="Código propio de esta presentación"
                    value={newUnit.barcode}
                    onChange={(e) => setNewUnit((u) => ({ ...u, barcode: e.target.value }))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <button
                    type="button"
                    onClick={handleAddUnit}
                    disabled={addUnitMutation.isPending}
                    className="w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900"
                  >
                    + Agregar presentación
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar producto'}
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formState.isSubmitting || saveMutation.isPending}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
