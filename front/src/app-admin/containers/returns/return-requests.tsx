import React, {useState, useEffect, useCallback, FunctionComponent} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {
  RETURN_REQUEST_LIST,
  RETURN_REQUEST_APPROVE,
  RETURN_REQUEST_REJECT,
  PAYMENT_TYPE_LIST,
} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, RETURN_REQUESTS} from "../../routes/frontend.routes";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faTimes,
  faChevronDown,
  faChevronUp,
  faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
import {notify} from "../../../app-common/components/confirm/notification";
import {withCurrency} from "../../../lib/currency/currency";
import {PrintReturnReceipt, ReturnReceiptData} from "../../../app-frontend/components/sale/sale.print";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'ALL';

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REFUNDED';
  reason: string;
  items: ReturnItem[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<ReturnRequest['status'], string> = {
  PENDING: 'bg-warning text-dark',
  APPROVED: 'bg-info',
  REJECTED: 'bg-danger',
  REFUNDED: 'bg-success',
};

interface StatusBadgeProps {
  status: ReturnRequest['status'];
}

const StatusBadge: FunctionComponent<StatusBadgeProps> = ({status}) => {
  const {t} = useTranslation();
  const label: Record<ReturnRequest['status'], string> = {
    PENDING: t('Pending'),
    APPROVED: t('Approved'),
    REJECTED: t('Rejected'),
    REFUNDED: t('Refunded'),
  };
  return (
    <span className={`badge ${STATUS_BADGE[status]}`}>
      {label[status]}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Confirmation modal
// ---------------------------------------------------------------------------

type ModalAction = 'approve' | 'reject' | null;

interface PaymentTypeOption {
  id: number;
  name: string;
}

interface ConfirmModalProps {
  show: boolean;
  action: ModalAction;
  requestId: number | null;
  processing: boolean;
  paymentTypes: PaymentTypeOption[];
  onConfirm: (reason: string, refundPaymentTypeId?: number) => void;
  onCancel: () => void;
}

const ConfirmModal: FunctionComponent<ConfirmModalProps> = ({
  show,
  action,
  processing,
  paymentTypes,
  onConfirm,
  onCancel,
}) => {
  const {t} = useTranslation();
  const [reason, setReason] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<number | ''>('');

  // Reset fields when modal closes or action changes
  useEffect(() => {
    if (!show) {
      setReason('');
      setSelectedPaymentType('');
    }
  }, [show]);

  if (!show || action === null) {
    return null;
  }

  const isApprove = action === 'approve';
  const headerClass = isApprove ? 'bg-success text-white' : 'bg-danger text-white';
  const confirmBtnClass = isApprove ? 'btn-success' : 'btn-danger';
  const title = isApprove ? t('Approve Return Request') : t('Reject Return Request');
  const description = isApprove
    ? t('Are you sure you want to approve this return request? Stock will be restored. The cashier will process the refund payment separately.')
    : t('Are you sure you want to reject this return request?');
  const reasonLabel = isApprove ? t('Approval note (optional)') : t('Rejection reason (optional)');
  const confirmText = isApprove ? t('Yes, Approve') : t('Yes, Reject');
  const canConfirm = true;

  const handleConfirm = () => {
    onConfirm(
      reason.trim(),
      isApprove && selectedPaymentType !== '' ? Number(selectedPaymentType) : undefined
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{zIndex: 1040}}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{zIndex: 1050}}
        aria-modal="true"
        aria-labelledby="confirmModalTitle"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className={`modal-header ${headerClass}`}>
              <h5 className="modal-title" id="confirmModalTitle">
                {isApprove ? (
                  <FontAwesomeIcon icon={faCheck} className="me-2" />
                ) : (
                  <FontAwesomeIcon icon={faTimes} className="me-2" />
                )}
                {title}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onCancel}
                disabled={processing}
                aria-label={t('Close')}
              />
            </div>
            <div className="modal-body">
              <p className="mb-3">{description}</p>

              <div className="mb-1">
                <label className="form-label fw-semibold">{reasonLabel}</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('Enter a note...')}
                  disabled={processing}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={processing}
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                className={`btn ${confirmBtnClass}`}
                onClick={handleConfirm}
                disabled={processing || !canConfirm}
              >
                {processing ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    {t('Processing...')}
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Expandable items sub-table
// ---------------------------------------------------------------------------

interface ItemsTableProps {
  items: ReturnItem[];
}

const ItemsTable: FunctionComponent<ItemsTableProps> = ({items}) => {
  const {t} = useTranslation();

  if (items.length === 0) {
    return (
      <p className="text-muted mb-0 fst-italic">
        {t('No items listed for this return.')}
      </p>
    );
  }

  return (
    <table className="table table-sm table-bordered mb-0">
      <thead className="table-light">
        <tr>
          <th>{t('Product')}</th>
          <th className="text-center">{t('Qty Ordered')}</th>
          <th className="text-center">{t('Qty Returned')}</th>
          <th className="text-end">{t('Unit Price')}</th>
          <th className="text-end">{t('Return Total')}</th>
          <th>{t('Item Note')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.orderProduct?.product?.name ?? '—'}</td>
            <td className="text-center">{item.orderProduct?.quantity}</td>
            <td className="text-center fw-semibold">{item.quantity}</td>
            <td className="text-end">{withCurrency(item.orderProduct?.price)}</td>
            <td className="text-end fw-semibold text-danger">
              {withCurrency(item.quantity * (item.orderProduct?.price ?? 0))}
            </td>
            <td className="text-muted fst-italic">
              {item.reason ?? <span className="text-muted">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ---------------------------------------------------------------------------
// Filter tab buttons
// ---------------------------------------------------------------------------

const STATUS_FILTERS: {label: string; value: ReturnStatus}[] = [
  {label: 'Pending', value: 'PENDING'},
  {label: 'Approved', value: 'APPROVED'},
  {label: 'Refunded', value: 'REFUNDED'},
  {label: 'Rejected', value: 'REJECTED'},
  {label: 'All', value: 'ALL'},
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const ReturnRequests: FunctionComponent = () => {
  const {t} = useTranslation();

  // Data state
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<ReturnStatus>('PENDING');

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchRequests = useCallback(async (filter: ReturnStatus) => {
    setLoading(true);
    try {
      const url =
        filter === 'ALL'
          ? RETURN_REQUEST_LIST
          : `${RETURN_REQUEST_LIST}?status=${filter}`;
      const response = await jsonRequest(url);
      const json = await response.json();
      // Backend returns array directly now
      const list = Array.isArray(json) ? json : (json?.list ?? []);
      setRequests(list);
    } catch (e) {
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

  // Load payment types for refund method selector
  useEffect(() => {
    (async () => {
      try {
        const res = await jsonRequest(PAYMENT_TYPE_LIST);
        const json = await res.json();
        const members = json?.['hydra:member'] ?? json ?? [];
        setPaymentTypes(
          members
            .filter((pt: any) => pt.isActive !== false)
            .map((pt: any) => ({ id: pt.id, name: pt.name }))
        );
      } catch {
        // Payment types not critical for page load
      }
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Row expansion
  // ---------------------------------------------------------------------------

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  const openModal = (action: ModalAction, requestId: number) => {
    setModalAction(action);
    setSelectedRequestId(requestId);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (processing) return;
    setModalVisible(false);
    setModalAction(null);
    setSelectedRequestId(null);
  };

  // ---------------------------------------------------------------------------
  // Approve / Reject
  // ---------------------------------------------------------------------------

  const handleConfirm = async (reason: string, refundPaymentTypeId?: number) => {
    if (selectedRequestId === null || modalAction === null) return;

    const urlTemplate =
      modalAction === 'approve' ? RETURN_REQUEST_APPROVE : RETURN_REQUEST_REJECT;
    const url = urlTemplate.replace(':id', String(selectedRequestId));

    const body: Record<string, any> = {};
    if (reason) body.reason = reason;
    if (refundPaymentTypeId) body.refundPaymentTypeId = refundPaymentTypeId;

    setProcessing(true);
    try {
      const response = await jsonRequest(url, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson?.errorMessage ?? errorJson?.message ?? response.statusText);
      }

      const responseData = await response.json().catch(() => ({}));

      const successMsg =
        modalAction === 'approve'
          ? t('Return request approved successfully.')
          : t('Return request rejected successfully.');

      notify({
        type: 'success',
        title: t('Done'),
        description: successMsg,
      });

      // Print return receipt on approval
      if (modalAction === 'approve' && responseData?.returnOrderRefId) {
        const req = requests.find(r => r.id === selectedRequestId);
        if (req) {
          const selectedPt = paymentTypes.find(pt => pt.id === refundPaymentTypeId);
          const receiptData: ReturnReceiptData = {
            returnOrderRefId: responseData.returnOrderRefId,
            originalOrderRefId: req.order?.orderId ?? String(selectedRequestId),
            date: new Date().toLocaleDateString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            }),
            items: (req.items || []).map(item => ({
              productName: item.orderProduct?.product?.name ?? '—',
              quantity: item.quantity,
              unitPrice: item.orderProduct?.price ?? 0,
            })),
            refundTotal: responseData.refundTotal ?? 0,
            refundMethod: selectedPt?.name ?? '—',
          };
          PrintReturnReceipt(receiptData);
        }
      }

      setModalVisible(false);
      setModalAction(null);
      setSelectedRequestId(null);

      // Collapse the row if it was expanded
      setExpandedRows(prev => {
        const next = new Set(prev);
        next.delete(selectedRequestId);
        return next;
      });

      // Refresh the list
      await fetchRequests(activeFilter);
    } catch (e: any) {
      notify({
        type: 'error',
        title: t('Error'),
        description: e?.message ?? t('An unexpected error occurred'),
      });
    } finally {
      setProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Date formatting
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render pending badge count
  // ---------------------------------------------------------------------------

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout
      title={t('Return Requests')}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Return Requests'), current: true},
      ]}
    >
      {/* Confirmation modal */}
      <ConfirmModal
        show={modalVisible}
        action={modalAction}
        requestId={selectedRequestId}
        processing={processing}
        paymentTypes={paymentTypes}
        onConfirm={handleConfirm}
        onCancel={closeModal}
      />

      {/* Filter tabs */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body py-2 px-3">
              <ul className="nav nav-tabs border-0 gap-1">
                {STATUS_FILTERS.map(({label, value}) => (
                  <li className="nav-item" key={value}>
                    <button
                      type="button"
                      className={`nav-link border-0 rounded px-3 py-2 ${
                        activeFilter === value
                          ? 'active fw-semibold'
                          : 'text-secondary'
                      }`}
                      onClick={() => {
                        setExpandedRows(new Set());
                        setActiveFilter(value);
                      }}
                    >
                      {t(label)}
                      {value === 'PENDING' && pendingCount > 0 && activeFilter !== 'PENDING' && (
                        <span className="badge bg-warning text-dark ms-2">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">

              {/* Loading state */}
              {loading && (
                <div className="text-center py-5">
                  <div
                    className="spinner-border text-primary"
                    role="status"
                    aria-label={t('Loading...')}
                  >
                    <span className="visually-hidden">{t('Loading...')}</span>
                  </div>
                  <p className="mt-2 text-muted">{t('Loading...')}</p>
                </div>
              )}

              {/* Empty state */}
              {!loading && requests.length === 0 && (
                <div className="text-center py-5 text-muted">
                  <FontAwesomeIcon
                    icon={faBoxesStacked}
                    size="3x"
                    className="mb-3 opacity-25"
                  />
                  <p className="mb-0 fs-5">
                    {t('No return requests found.')}
                  </p>
                  <p className="small mt-1">
                    {activeFilter !== 'ALL'
                      ? t('Try switching to a different filter tab.')
                      : ''}
                  </p>
                </div>
              )}

              {/* Table */}
              {!loading && requests.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{width: '1%'}} aria-label={t('Expand')} />
                        <th>{t('Date')}</th>
                        <th>{t('Order #')}</th>
                        <th>{t('Requested By')}</th>
                        <th className="text-center">{t('Items')}</th>
                        <th>{t('Reason')}</th>
                        <th className="text-center">{t('Status')}</th>
                        <th>{t('Approved By')}</th>
                        <th className="text-center">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(req => {
                        const isExpanded = expandedRows.has(req.id);
                        const isPending = req.status === 'PENDING';

                        return (
                          <React.Fragment key={req.id}>
                            {/* Main row */}
                            <tr
                              className={isExpanded ? 'table-active' : ''}
                              style={{cursor: 'pointer'}}
                              onClick={() => toggleRow(req.id)}
                            >
                              {/* Expand toggle */}
                              <td
                                className="text-center text-muted ps-3"
                                onClick={e => {
                                  e.stopPropagation();
                                  toggleRow(req.id);
                                }}
                                aria-label={
                                  isExpanded ? t('Collapse') : t('Expand')
                                }
                              >
                                <FontAwesomeIcon
                                  icon={isExpanded ? faChevronUp : faChevronDown}
                                  size="sm"
                                />
                              </td>

                              {/* Date */}
                              <td className="text-nowrap text-muted small">
                                {formatDate(req.createdAt)}
                              </td>

                              {/* Order # */}
                              <td>
                                <span className="fw-semibold">
                                  {req.order.orderId}
                                </span>
                              </td>

                              {/* Requested by */}
                              <td>{req.requestedBy.displayName}</td>

                              {/* Items count */}
                              <td className="text-center">
                                <span className="badge bg-secondary">
                                  {req.items.length}
                                </span>
                              </td>

                              {/* Reason */}
                              <td
                                className="text-muted"
                                style={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={req.reason}
                              >
                                {req.reason || <span className="fst-italic">—</span>}
                              </td>

                              {/* Status */}
                              <td className="text-center">
                                <StatusBadge status={req.status} />
                              </td>

                              {/* Approved by */}
                              <td className="text-muted">
                                {req.approvedBy?.displayName ?? '—'}
                              </td>

                              {/* Actions */}
                              <td
                                className="text-center"
                                onClick={e => e.stopPropagation()}
                              >
                                {isPending ? (
                                  <div className="d-flex gap-2 justify-content-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-success"
                                      title={t('Approve')}
                                      onClick={() => openModal('approve', req.id)}
                                      disabled={processing}
                                      aria-label={`${t('Approve')} ${req.order.orderId}`}
                                    >
                                      <FontAwesomeIcon icon={faCheck} className="me-1" />
                                      {t('Approve')}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-danger"
                                      title={t('Reject')}
                                      onClick={() => openModal('reject', req.id)}
                                      disabled={processing}
                                      aria-label={`${t('Reject')} ${req.order.orderId}`}
                                    >
                                      <FontAwesomeIcon icon={faTimes} className="me-1" />
                                      {t('Reject')}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-muted fst-italic small">
                                    {t('No actions')}
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Expanded detail row */}
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="bg-light p-3"
                                  style={{borderTop: 'none'}}
                                >
                                  <div className="ps-3">
                                    <p className="fw-semibold mb-2 text-secondary small text-uppercase">
                                      {t('Returned Items')}
                                    </p>
                                    <ItemsTable items={req.items} />
                                  </div>
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
