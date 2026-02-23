import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from 'antd';
import { jsonRequest } from '../../../api/request/request';
import { STOCK_ALERTS } from '../../../api/routing/routes/backend.app';
import { useSelector } from 'react-redux';
import { getStore } from '../../../duck/store/store.selector';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes, faBoxOpen } from '@fortawesome/free-solid-svg-icons';

interface StockAlertItem {
  productId: number;
  productName: string;
  barcode: string | null;
  storeId: number;
  storeName: string;
  quantity: number;
  reOrderLevel: number;
}

export const StockAlertBadge = () => {
  const store = useSelector(getStore);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery(
    ['stock-alerts', store?.id],
    async () => {
      const res = await jsonRequest(STOCK_ALERTS + '?store=' + store?.id);
      return res.json();
    },
    {
      refetchInterval: 60_000,
      enabled: !!store?.id,
      refetchOnWindowFocus: false,
    }
  );

  const count = data?.count ?? 0;
  const items: StockAlertItem[] = data?.list ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-lg"
        onClick={() => count > 0 && setOpen(prev => !prev)}
        title={t('Low Stock Alerts')}
        style={{ cursor: count > 0 ? 'pointer' : 'default' }}
      >
        <Badge count={count} overflowCount={99} offset={[-5, 5]}>
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-warning"
            style={{ fontSize: '1.2rem' }}
          />
        </Badge>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineEnd: 0,
            width: 360,
            maxHeight: 400,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,.15)',
            border: '1px solid #e5e7eb',
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #f3f4f6',
              background: '#fffbeb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#d97706' }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>
                {t('Low Stock Alerts')}
              </span>
              <span
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: 14,
                padding: 4,
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: '#9ca3af',
                }}
              >
                <FontAwesomeIcon icon={faBoxOpen} style={{ fontSize: 24, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>{t('No stock alerts')}</p>
              </div>
            ) : (
              items.map((item) => {
                const isOut = item.quantity <= 0;
                return (
                  <div
                    key={`${item.productId}-${item.storeId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: '#1f2937',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.productName}
                      </div>
                      {item.barcode && (
                        <div
                          dir="ltr"
                          style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}
                        >
                          {item.barcode}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'end', flexShrink: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: isOut ? '#dc2626' : '#d97706',
                        }}
                      >
                        {Number(item.quantity).toFixed(0)}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>
                        / {Number(item.reOrderLevel).toFixed(0)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
