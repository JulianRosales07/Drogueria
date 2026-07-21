import { useUiStore } from '../store/ui-store'
import { getStoreLabels, type StoreLabels, type StoreType } from '../shared/utils/storeLabels'

export function useStoreContext() {
  const user = useUiStore((state) => state.user)
  const storeType: StoreType = user?.storeType ?? 'PHARMACY'
  const labels: StoreLabels = getStoreLabels(storeType)

  return {
    storeType,
    isPharmacy: storeType === 'PHARMACY',
    isStore: storeType === 'STORE',
    labels,
    storeTerm: labels.storeTerm,
    storeTermPlural: labels.storeTermPlural,
    adminRole: labels.adminRole,
    operatorRole: labels.operatorRole,
    operatorRolePlural: labels.operatorRolePlural,
    iconEmoji: labels.iconEmoji,
  }
}
