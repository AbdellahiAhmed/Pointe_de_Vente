import React, {useState, useEffect, useCallback, FunctionComponent} from 'react';
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../../api/request/request";
import {
  RETURN_REQUEST_LIST,
  RETURN_REQUEST_APPROVE,
  RETURN_REQUEST_REJECT,
} from "../../../../api/routing/routes/backend.app";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faTimes,
  faChevronDown,
  faChevronUp,
  faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
import {notify} from "../../../../app-common/components/confirm/notification";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

interface ReturnItemProduct {
  name: string;
}

interface ReturnItemOrderProduct {
  id: number;
  product: ReturnItemProduct;
  quantity: number;
  price: number;
}

interface ReturnItem {
  id: number;
  orderProduct: ReturnItemOrderProduct;
  quantity: number;
  reason: string | null;
}

interface ReturnOrder {
  id: number;
  orderId: string;
  createdAt: string;
}

interface ReturnUser {
  id: number;
  displayName: string;
}

interface ReturnRequest {
  id: number;
  order: ReturnOrder;
  requestedBy: ReturnUser;
  approvedBy: ReturnUser | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  items: ReturnItem[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ReturnRequest['status'], string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
};

const StatusBadge: FunctionComponent<{status: ReturnRequest['status']}> = ({status}) => {
  const {t} = useTranslation();
  const label: Record<ReturnRequest['status'], string> = {
    PENDING: t('Pending'),
    APPROVED: t('Approved'),
    REJECTED: t('Rejected'),
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: STATUS_COLORS[status],
      }}
    >
      {label[status]}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Items sub-table
// ---------------------------------------------------------------------------

const ItemsTable: FunctionComponent<{items: ReturnItem[]}> = ({items}) => {
  const {t} = useTranslation();
  const formatPrice = (v: number) =>
    new Intl.NumberFormat('fr-FR', {minimumFractionDigits: 2}).format(v) + ' MRU';

  if (items.length === 0) {
    return <p style={{color: '#9ca3af', fontStyle: 'italic', margin: 0}}>{t('No items listed for this return.')}</p>;
  }

  return (
    <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse'}}>
      <thead>
        <tr style={{borderBottom: '1px solid var(--pos-border, #e5e7eb)'}}>
          <th style={{padding: '6px 8px', textAlign: 'start'}}>{t('Product')}</th>
          <th style={{padding: '6px 8px', textAlign: 'center'}}>{t('Qty Ordered')}</th>
          <th style={{padding: '6px 8px', textAlign: 'center'}}>{t('Qty Returned')}</th>
          <th style={{padding: '6px 8px', textAlign: 'end'}}>{t('Unit Price')}</th>
          <th style={{padding: '6px 8px', textAlign: 'end'}}>{t('Return Total')}</th>
          <th style={{padding: '6px 8px', textAlign: 'start'}}>{t('Item Note')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id} style={{borderBottom: '1px solid var(--pos-border, #e5e7eb)'}}>
            <td style={{padding: '6px 8px'}}>{item.orderProduct.product.name}</td>
            <td style={{padding: '6px 8px', textAlign: 'center'}}>{item.orderProduct.quantity}</td>
            <td style={{padding: '6px 8px', textAlign: 'center', fontWeight: 600}}>{item.quantity}</td>
            <td style={{padding: '6px 8px', textAlign: 'end'}}>{formatPrice(item.orderProduct.price)}</td>
            <td style={{padding: '6px 8px', textAlign: 'end', fontWeight: 600, color: '#ef4444'}}>
              {formatPrice(item.quantity * item.orderProduct.price)}
            </td>
            <td style={{padding: '6px 8px', color: '#9ca3af', fontStyle: 'italic'}}>
              {item.reason ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const STATUS_FILTERS: {label: string; value: ReturnStatus}[] = [
  {label: 'Pending', value: 'PENDING'},
  {label: 'Approved', value: 'APPROVED'},
  {label: 'Rejected', value: 'REJECTED'},
  {label: 'All', value: 'ALL'},
];

// ---------------------------------------------------------------------------
// Main inline component (no DashboardLayout)
// ---------------------------------------------------------------------------

export const ReturnRequestsInline: FunctionComponent = () => {
  const {t} = useTranslation();

  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ReturnStatus>('PENDING');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);

  // Fetch
  const fetchRequests = useCallback(async (filter: ReturnStatus) => {
    setLoading(true);
    try {
      const url =
        filter === 'ALL'
          ? RETURN_REQUEST_LIST
          : `${RETURN_REQUEST_LIST}?status=${filter}`;
      const response = await jsonRequest(url);
      const json = await response.json();
      setRequests(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      notify({
        type: 'error',
        title: t('Error'),
        description: t('Failed to load return requests.'),
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRequests(activeFilter);
  }, [activeFilter, fetchRequests]);

  // Row expansion
  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Approve / Reject
  const handleAction = async (action: 'approve' | 'reject', requestId: number) => {
    const urlTemplate = action === 'approve' ? RETURN_REQUEST_APPROVE : RETURN_REQUEST_REJECT;
    const url = urlTemplate.replace(':id', String(requestId));

    setProcessing(true);
    try {
      const response = await jsonRequest(url, {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson?.message ?? response.statusText);
      }

      notify({
        type: 'success',
        title: t('Done'),
        description: action === 'approve'
          ? t('Return request approved successfully.')
          : t('Return request rejected successfully.'),
      });

      await fetchRequests(activeFilter);
    } catch (e: any) {
      console.error(e);
      notify({
        type: 'error',
        title: t('Error'),
        description: e?.message ?? t('An unexpected error occurred'),
      });
    } finally {
      setProcessing(false);
    }
  };

  // Date formatting
  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="return-requests-inline">
      {/* Filter tabs */}
      <div style={{display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap'}}>
        {STATUS_FILTERS.map(({label, value}) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setExpandedRows(new Set());
              setActiveFilter(value);
            }}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: activeFilter === value ? '2px solid var(--pos-accent, #0d9488)' : '1px solid var(--pos-border, #e5e7eb)',
              backgroundColor: activeFilter === value ? 'var(--pos-accent, #0d9488)' : 'transparent',
              color: activeFilter === value ? '#fff' : 'var(--pos-text, #1f2937)',
              fontSize: '13px',
              fontWeight: activeFilter === value ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{textAlign: 'center', padding: '40px 0', color: '#9ca3af'}}>
          <p>{t('Loading...')}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && requests.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px 0', color: '#9ca3af'}}>
          <FontAwesomeIcon icon={faBoxesStacked} style={{fontSize: '36px', opacity: 0.3, marginBottom: '12px'}} />
          <p style={{margin: 0}}>{t('No return requests found.')}</p>
        </div>
      )}

      {/* Table */}
      {!loading && requests.length > 0 && (
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
            <thead>
              <tr style={{borderBottom: '2px solid var(--pos-border, #e5e7eb)'}}>
                <th style={{width: '30px', padding: '8px'}} />
                <th style={{padding: '8px', textAlign: 'start'}}>{t('Date')}</th>
                <th style={{padding: '8px', textAlign: 'start'}}>{t('Order #')}</th>
                <th style={{padding: '8px', textAlign: 'start'}}>{t('Requested By')}</th>
                <th style={{padding: '8px', textAlign: 'center'}}>{t('Items')}</th>
                <th style={{padding: '8px', textAlign: 'start'}}>{t('Reason')}</th>
                <th style={{padding: '8px', textAlign: 'center'}}>{t('Status')}</th>
                <th style={{padding: '8px', textAlign: 'center'}}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const isExpanded = expandedRows.has(req.id);
                const isPending = req.status === 'PENDING';

                return (
                  <React.Fragment key={req.id}>
                    <tr
                      onClick={() => toggleRow(req.id)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: isExpanded ? 'none' : '1px solid var(--pos-border, #e5e7eb)',
                        backgroundColor: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent',
                      }}
                    >
                      <td style={{padding: '8px', textAlign: 'center', color: '#9ca3af'}}>
                        <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} size="sm" />
                      </td>
                      <td style={{padding: '8px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '13px'}}>
                        {formatDate(req.createdAt)}
                      </td>
                      <td style={{padding: '8px', fontWeight: 600}}>
                        {req.order.orderId}
                      </td>
                      <td style={{padding: '8px'}}>
                        {req.requestedBy.displayName}
                      </td>
                      <td style={{padding: '8px', textAlign: 'center'}}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                        }}>
                          {req.items.length}
                        </span>
                      </td>
                      <td style={{
                        padding: '8px',
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#6b7280',
                      }} title={req.reason}>
                        {req.reason || <span style={{fontStyle: 'italic'}}>—</span>}
                      </td>
                      <td style={{padding: '8px', textAlign: 'center'}}>
                        <StatusBadge status={req.status} />
                      </td>
                      <td style={{padding: '8px', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
                        {isPending ? (
                          <div style={{display: 'flex', gap: '6px', justifyContent: 'center'}}>
                            <button
                              type="button"
                              onClick={() => handleAction('approve', req.id)}
                              disabled={processing}
                              style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: processing ? 'not-allowed' : 'pointer',
                                opacity: processing ? 0.6 : 1,
                              }}
                            >
                              <FontAwesomeIcon icon={faCheck} style={{marginInlineEnd: '4px'}} />
                              {t('Approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAction('reject', req.id)}
                              disabled={processing}
                              style={{
                                padding: '4px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: processing ? 'not-allowed' : 'pointer',
                                opacity: processing ? 0.6 : 1,
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} style={{marginInlineEnd: '4px'}} />
                              {t('Reject')}
                            </button>
                          </div>
                        ) : (
                          <span style={{color: '#9ca3af', fontStyle: 'italic', fontSize: '12px'}}>
                            {t('No actions')}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: '12px 16px 16px 40px',
                            backgroundColor: 'rgba(0,0,0,0.02)',
                            borderBottom: '1px solid var(--pos-border, #e5e7eb)',
                          }}
                        >
                          <p style={{fontWeight: 600, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280'}}>
                            {t('Returned Items')}
                          </p>
                          <ItemsTable items={req.items} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
