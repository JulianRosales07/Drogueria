import { forwardRef } from 'react';
import { type ReceiptConfig, RECEIPT_CONFIG_DEFAULTS, getPaddingH, getPaddingV } from '../hooks/useReceiptConfig';

type ReceiptProps = {
  saleId: string;
  date: string;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  /** Optional: receipt layout config from settings. Falls back to defaults. */
  config?: Partial<ReceiptConfig>;
};

const FONT_SIZE_MAP: Record<string, string> = {
  xs: '10px',
  sm: '12px',
  base: '14px',
}

const BORDER_MAP: Record<string, string> = {
  dashed: '2px dashed #000',
  solid: '2px solid #000',
  double: '4px double #000',
  none: 'none',
}

const BORDER_LIGHT_MAP: Record<string, string> = {
  dashed: '1px dashed #bbb',
  solid: '1px solid #bbb',
  double: '2px double #bbb',
  none: 'none',
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ saleId, date, customerName, items, subtotal, tax, discount, total, config }, ref) => {
    const cfg: ReceiptConfig = { ...RECEIPT_CONFIG_DEFAULTS, ...config };

    const fontSize = FONT_SIZE_MAP[cfg.fontSize] ?? '12px';
    const paddingH = getPaddingH(cfg);
    const paddingV = getPaddingV(cfg);
    const borderMain = BORDER_MAP[cfg.separatorStyle] ?? BORDER_MAP.solid;
    const borderLight = BORDER_LIGHT_MAP[cfg.separatorStyle] ?? BORDER_LIGHT_MAP.solid;
    const paperWidth = cfg.paperWidth === 'A4' ? '210mm' : cfg.paperWidth;

    const formatMoney = (value: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

    const formatDate = (dateString: string) => {
      const parsed = new Date(dateString);
      if (Number.isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
    };

    return (
      <div
        ref={ref}
        className="receipt-print bg-white text-black"
        style={{ width: paperWidth, maxWidth: '100%', padding: `${paddingV} ${paddingH}`, fontSize }}
      >
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', borderBottom: borderMain, paddingBottom: paddingV, marginBottom: paddingV }}>
          <h1 style={{ fontSize: '1.4em', fontWeight: 'bold', letterSpacing: '0.05em' }}>{cfg.storeName}</h1>
          {cfg.storeSlogan && <p style={{ fontSize: '0.9em', marginTop: '2px' }}>{cfg.storeSlogan}</p>}
          {cfg.storeNit && <p style={{ fontSize: '0.85em', marginTop: '1px' }}>NIT: {cfg.storeNit}</p>}
          {cfg.storeAddress && <p style={{ fontSize: '0.85em', marginTop: '1px' }}>{cfg.storeAddress}</p>}
          {cfg.storePhone && <p style={{ fontSize: '0.85em', marginTop: '1px' }}>Tel: {cfg.storePhone}</p>}
        </div>

        {/* ── Sale meta ── */}
        <div style={{ marginBottom: paddingV }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Factura:</span>
            <span>{saleId.substring(0, 8).toUpperCase()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Fecha:</span>
            <span>{formatDate(date)}</span>
          </div>
          {customerName && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Cliente:</span>
              <span>{customerName}</span>
            </div>
          )}
        </div>

        {/* ── Items ── */}
        <div style={{ borderTop: borderMain, paddingTop: '4px', marginBottom: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: borderLight }}>
                {cfg.showSku && <th style={{ textAlign: 'left', padding: '2px 0' }}>Cód</th>}
                <th style={{ textAlign: 'left', padding: '2px 0' }}>Producto</th>
                <th style={{ textAlign: 'center', padding: '2px 0' }}>Cant</th>
                {cfg.showUnitPrice && <th style={{ textAlign: 'right', padding: '2px 0' }}>P.Unit</th>}
                {cfg.showLineTotal && <th style={{ textAlign: 'right', padding: '2px 0' }}>Total</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} style={{ borderBottom: borderLight }}>
                  {cfg.showSku && <td style={{ padding: '3px 0' }}>—</td>}
                  <td style={{ padding: '3px 0', paddingRight: '4px' }}>{item.name}</td>
                  <td style={{ textAlign: 'center', padding: '3px 0' }}>{item.quantity}</td>
                  {cfg.showUnitPrice && (
                    <td style={{ textAlign: 'right', padding: '3px 0', paddingLeft: '4px' }}>
                      {formatMoney(item.unitPrice)}
                    </td>
                  )}
                  {cfg.showLineTotal && (
                    <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 600 }}>
                      {formatMoney(item.lineTotal)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div style={{ borderTop: borderMain, paddingTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>IVA:</span>
              <span>{formatMoney(tax)}</span>
            </div>
          )}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Descuento:</span>
              <span style={{ color: '#dc2626' }}>-{formatMoney(discount)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.2em',
              fontWeight: 'bold',
              borderTop: borderMain,
              paddingTop: '4px',
              marginTop: '4px',
            }}
          >
            <span>TOTAL:</span>
            <span>{formatMoney(total)}</span>
          </div>
        </div>

        {/* ── Footer ── */}
        {(cfg.footerMessage || cfg.footerNote) && (
          <div style={{ textAlign: 'center', marginTop: paddingV, paddingTop: '4px', borderTop: borderLight }}>
            {cfg.footerMessage && <p>{cfg.footerMessage}</p>}
            {cfg.footerNote && <p style={{ marginTop: '4px', opacity: 0.65 }}>{cfg.footerNote}</p>}
          </div>
        )}

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .receipt-print, .receipt-print * { visibility: visible; }
            .receipt-print {
              position: absolute;
              left: 0;
              top: 0;
              width: ${paperWidth};
              margin: 0;
              padding: ${paddingV} ${paddingH};
              font-size: ${fontSize};
            }
          }
        `}</style>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
