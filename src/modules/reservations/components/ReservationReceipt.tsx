import { forwardRef } from 'react';
import { type ReceiptConfig, RECEIPT_CONFIG_DEFAULTS, getPaddingH, getPaddingV } from '../../../hooks/useReceiptConfig';
import { type CourtReservation } from '../../../services/api/reservations';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../../services/api/sales';

type ReservationReceiptProps = {
  reservation: CourtReservation;
  config?: Partial<ReceiptConfig>;
};

const FONT_SIZE_MAP: Record<string, string> = {
  xs: '10px',
  sm: '12px',
  base: '14px',
};

const BORDER_MAP: Record<string, string> = {
  dashed: '2px dashed #000',
  solid: '2px solid #000',
  double: '4px double #000',
  none: 'none',
};

const BORDER_LIGHT_MAP: Record<string, string> = {
  dashed: '1px dashed #bbb',
  solid: '1px solid #bbb',
  double: '2px double #bbb',
  none: 'none',
};

export const ReservationReceipt = forwardRef<HTMLDivElement, ReservationReceiptProps>(
  ({ reservation, config }, ref) => {
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
      if (Number.isNaN(parsed.getTime())) return dateString;
      return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(parsed);
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

        {/* ── Reservation Title Banner ── */}
        <div style={{ border: '2px solid #000', padding: '6px 8px', marginBottom: paddingV, textAlign: 'center' }}>
          <p style={{ fontWeight: 'bold', fontSize: '1.1em' }}>COMPROBANTE DE RESERVA</p>
          <p style={{ fontSize: '0.9em' }}>#{reservation.id.substring(0, 8).toUpperCase()}</p>
        </div>

        {/* ── Meta Datos ── */}
        <div style={{ marginBottom: paddingV, lineHeight: '1.4em' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Cliente:</span>
            <span style={{ fontWeight: 'bold' }}>{reservation.customerName}</span>
          </div>
          {reservation.customerPhone && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Teléfono:</span>
              <span>{reservation.customerPhone}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Cancha:</span>
            <span style={{ fontWeight: 'bold' }}>{reservation.courtName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Fecha Partido:</span>
            <span style={{ fontWeight: 'bold' }}>{formatDate(reservation.reservationDate)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Horario:</span>
            <span>{reservation.startTime} – {reservation.endTime}</span>
          </div>
          {reservation.notes && (
            <div style={{ marginTop: '4px', fontSize: '0.9em', color: '#444' }}>
              <span>Nota: {reservation.notes}</span>
            </div>
          )}
        </div>

        {/* ── Desglose Financiero ── */}
        <div style={{ borderTop: borderMain, borderBottom: borderMain, padding: `${paddingV} 0`, marginBottom: paddingV }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>Valor Total Alquiler:</span>
            <span style={{ fontWeight: 'bold' }}>{formatMoney(reservation.totalPrice)}</span>
          </div>

          {/* Historial de abonos */}
          {reservation.advances.length > 0 ? (
            <div style={{ marginTop: '8px', borderTop: borderLight, paddingTop: '6px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.95em' }}>Abonos Recibidos:</p>
              {reservation.advances.map((adv, idx) => (
                <div key={adv.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', marginBottom: '2px' }}>
                  <span>
                    • {new Date(adv.createdAt).toLocaleDateString('es-CO')} ({PAYMENT_METHOD_LABELS[adv.paymentMethod as PaymentMethod] || adv.paymentMethod})
                  </span>
                  <span>{formatMoney(adv.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '6px', borderTop: borderLight, paddingTop: '4px' }}>
                <span>Total Abonado:</span>
                <span>{formatMoney(reservation.totalAdvanced)}</span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
              Sin abonos previos registrados
            </p>
          )}

          {/* Saldo Pendiente destacado */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.2em',
            fontWeight: 'bold',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '2px dashed #000'
          }}>
            <span>SALDO A PAGAR:</span>
            <span>{formatMoney(reservation.pendingBalance)}</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', fontSize: '0.85em', color: '#444' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '2px' }}>¡Gracias por tu reserva!</p>
          <p>Presenta este comprobante el día de tu partido para liquidar el saldo pendiente.</p>
          {cfg.footerMessage && <p style={{ marginTop: '6px', fontStyle: 'italic' }}>{cfg.footerMessage}</p>}
        </div>
      </div>
    );
  }
);

ReservationReceipt.displayName = 'ReservationReceipt';
