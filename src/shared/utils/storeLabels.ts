export type StoreType = 'PHARMACY' | 'STORE';

export type StoreLabels = {
  storeTerm: string;
  storeTermPlural: string;
  adminRole: string;
  operatorRole: string;
  operatorRolePlural: string;
  iconEmoji: string;
};

export const LABELS_BY_STORE_TYPE: Record<StoreType, StoreLabels> = {
  PHARMACY: {
    storeTerm: 'Droguería',
    storeTermPlural: 'Droguerías',
    adminRole: 'Administrador de Drogueria',
    operatorRole: 'Cajero',
    operatorRolePlural: 'Cajeros',
    iconEmoji: '💊',
  },
  STORE: {
    storeTerm: 'Tienda',
    storeTermPlural: 'Tiendas',
    adminRole: 'Administrador de Tienda',
    operatorRole: 'Vendedor',
    operatorRolePlural: 'Vendedores',
    iconEmoji: '🏪',
  },
};

export function getStoreLabels(type?: StoreType | null): StoreLabels {
  return LABELS_BY_STORE_TYPE[type || 'PHARMACY'] || LABELS_BY_STORE_TYPE.PHARMACY;
}
