import React, { FunctionComponent, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../layout/dashboard.layout';
import { DASHBOARD, BANK_JOURNAL } from '../../routes/frontend.routes';
import { jsonRequest } from '../../../api/request/request';
import {
  BANK_JOURNAL_SUMMARY,
  BANK_JOURNAL_TRANSACTIONS,
} from '../../../api/routing/routes/backend.app';
import { withCurrency } from '../../../lib/currency/currency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentSummary {
  id: number;
  name: string;
  type: string;
  category: string;
  totalIn: number;
  totalOut: number;
  balance: number;
}

interface SummaryResponse {
  dateFrom: string;
  dateTo: string;
  payments: PaymentSummary[];
  grandTotalIn: number;
  grandTotalOut: number;
  grandBalance: number;
}

interface Transaction {
  date: string;
  type: string;
  reference: string;
  description: string;
  amountIn: number;
  amountOut: number;
}

interface TransactionsResponse {
  paymentId: number;
  paymentName: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: Transaction[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getDefaultDateFrom = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

const getDefaultDateTo = (): string => new Date().toISOString().split('T')[0];

const categoryIcon = (category: string): string => {
  switch (category) {
    case 'mobile':
      return 'bi-phone';
    case 'cash':
      return 'bi-cash-stack';
    default:
      return 'bi-credit-card';
  }
};

const txTypeBadge = (type: string): string => {
  switch (type) {
    case 'sale':
      return 'bg-success';
    case 'expense':
      return 'bg-danger';
    case 'debt_payment':
      return 'bg-primary';
    default:
      return 'bg-secondary';
  }
};

const txTypeLabel = (type: string, t: (key: string) => string): string => {
  switch (type) {
    case 'sale':
      return t('Sale');
    case 'expense':
      return t('Expense');
    case 'debt_payment':
      return t('Debt Payment');
    default:
      return type;
  }
};

const TX_LIMIT = 50;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BankJournal: FunctionComponent = () => {
  const { t } = useTranslation();

  // Date filter state
  const [dateFrom, setDateFrom] = useState<string>(getDefaultDateFrom());
  const [dateTo, setDateTo] = useState<string>(getDefaultDateTo());

  // Summary state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  // Transaction drill-down state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TransactionsResponse | null>(null);
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txPage, setTxPage] = useState<number>(1);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    setTransactions(null);
    try {
      const response = await jsonRequest(
        `${BANK_JOURNAL_SUMMARY}?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      );
      const json: SummaryResponse = await response.json();
      setSummary(json);
    } catch {
      setError(t('An error occurred while loading data'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, t]);

  const fetchTransactions = useCallback(
    async (paymentId: number, page: number) => {
      setTxLoading(true);
      setTxError(null);
      try {
        const url = BANK_JOURNAL_TRANSACTIONS.replace(':paymentId', String(paymentId));
        const response = await jsonRequest(
          `${url}?dateFrom=${dateFrom}&dateTo=${dateTo}&page=${page}&limit=${TX_LIMIT}`,
        );
        const json: TransactionsResponse = await response.json();
        setTransactions(json);
        setTxPage(page);
      } catch {
        setTxError(t('An error occurred while loading transactions'));
      } finally {
        setTxLoading(false);
      }
    },
    [dateFrom, dateTo, t],
  );

  // Fetch summary on mount
  useEffect(() => {
    fetchSummary();
  }, []);

  // -------------------------------------------------------------------------
  // Interaction handlers
  // -------------------------------------------------------------------------

  const handleSearch = () => {
    fetchSummary();
  };

  const handleCardClick = (payment: PaymentSummary) => {
    if (expandedId === payment.id) {
      // Collapse
      setExpandedId(null);
      setTransactions(null);
      return;
    }
    setExpandedId(payment.id);
    setTransactions(null);
    setTxPage(1);
    fetchTransactions(payment.id, 1);
  };

  const handleTxPageChange = (page: number) => {
    if (expandedId === null) return;
    fetchTransactions(expandedId, page);
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderPageButtons = (totalPages: number, currentPage: number) => {
    const pages: number[] = [];
    // Show at most 7 page buttons around the current page
    const start = Math.max(1, currentPage - 3);
    const end = Math.min(totalPages, currentPage + 3);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return (
      <nav aria-label={t('Transactions pagination')}>
        <ul className="pagination pagination-sm mb-0">
          <li className={classNames('page-item', { disabled: currentPage === 1 })}>
            <button
              className="page-link"
              onClick={() => handleTxPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
          </li>
          {start > 1 && (
            <>
              <li className="page-item">
                <button className="page-link" onClick={() => handleTxPageChange(1)}>1</button>
              </li>
              {start > 2 && (
                <li className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              )}
            </>
          )}
          {pages.map(p => (
            <li key={p} className={classNames('page-item', { active: p === currentPage })}>
              <button className="page-link" onClick={() => handleTxPageChange(p)}>{p}</button>
            </li>
          ))}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && (
                <li className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              )}
              <li className="page-item">
                <button className="page-link" onClick={() => handleTxPageChange(totalPages)}>
                  {totalPages}
                </button>
              </li>
            </>
          )}
          <li className={classNames('page-item', { disabled: currentPage === totalPages })}>
            <button
              className="page-link"
              onClick={() => handleTxPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <DashboardLayout
      title={t('Bank Journal')}
      breadCrumbs={[
        { title: t('Home'), link: DASHBOARD },
        { title: t('Reports') },
        { title: t('Bank Journal'), current: true },
      ]}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Date filter row                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body pt-3">
              <div className="row align-items-end g-3">
                <div className="col-md-3">
                  <label className="form-label">{t('From')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">{t('To')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-primary"
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    <i className="bi bi-search me-1"></i>
                    {t('Search')}
                  </button>
                  <button
                    className="btn btn-outline-secondary ms-2"
                    onClick={() => window.print()}
                  >
                    <i className="bi bi-printer me-1"></i>
                    {t('Print')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global error */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ------------------------------------------------------------------ */}
      {/* Loading spinner                                                      */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">{t('Loading...')}</p>
        </div>
      ) : summary ? (
        <>
          {/* ---------------------------------------------------------------- */}
          {/* Payment summary cards                                             */}
          {/* ---------------------------------------------------------------- */}
          <div className="row g-3 mb-3">
            {summary.payments.map(payment => {
              const isExpanded = expandedId === payment.id;
              return (
                <div key={payment.id} className="col-xxl-3 col-lg-4 col-md-6">
                  <div
                    className={classNames(
                      'card h-100',
                      'bank-journal-card',
                      { 'border-primary': isExpanded },
                    )}
                    style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => handleCardClick(payment)}
                    role="button"
                    aria-expanded={isExpanded}
                    aria-label={`${payment.name} – ${t('click to view transactions')}`}
                  >
                    <div className="card-body">
                      {/* Card header */}
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className={classNames(
                              'card-icon rounded-circle d-flex align-items-center justify-content-center',
                              { 'bg-primary bg-opacity-10': isExpanded },
                            )}
                          >
                            <i
                              className={classNames(
                                'bi',
                                categoryIcon(payment.category),
                                isExpanded ? 'text-primary' : '',
                              )}
                            ></i>
                          </div>
                          <h5 className="card-title mb-0 fw-semibold">{payment.name}</h5>
                        </div>
                        <i
                          className={classNames(
                            'bi text-muted',
                            isExpanded ? 'bi-chevron-up' : 'bi-chevron-down',
                          )}
                        ></i>
                      </div>

                      {/* Amounts */}
                      <div className="row text-center g-0">
                        <div className="col-4">
                          <small className="text-muted d-block">{t('In')}</small>
                          <span className="fw-semibold text-success">
                            {withCurrency(payment.totalIn)}
                          </span>
                        </div>
                        <div className="col-4 border-start border-end">
                          <small className="text-muted d-block">{t('Out')}</small>
                          <span className="fw-semibold text-danger">
                            {withCurrency(payment.totalOut)}
                          </span>
                        </div>
                        <div className="col-4">
                          <small className="text-muted d-block">{t('Balance')}</small>
                          <span
                            className={classNames('fw-bold', {
                              'text-primary': payment.balance >= 0,
                              'text-danger': payment.balance < 0,
                            })}
                          >
                            {withCurrency(payment.balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Grand totals row                                                  */}
          {/* ---------------------------------------------------------------- */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card border-0 bg-light">
                <div className="card-body py-3">
                  <div className="row align-items-center g-0 text-center">
                    <div className="col-md-4">
                      <p className="mb-0 text-muted small text-uppercase fw-semibold">
                        {t('Grand Total In')}
                      </p>
                      <p className="mb-0 fs-5 fw-bold text-success">
                        {withCurrency(summary.grandTotalIn)}
                      </p>
                    </div>
                    <div className="col-md-4 border-start border-end">
                      <p className="mb-0 text-muted small text-uppercase fw-semibold">
                        {t('Grand Total Out')}
                      </p>
                      <p className="mb-0 fs-5 fw-bold text-danger">
                        {withCurrency(summary.grandTotalOut)}
                      </p>
                    </div>
                    <div className="col-md-4">
                      <p className="mb-0 text-muted small text-uppercase fw-semibold">
                        {t('Grand Balance')}
                      </p>
                      <p
                        className={classNames('mb-0 fs-5 fw-bold', {
                          'text-primary': summary.grandBalance >= 0,
                          'text-danger': summary.grandBalance < 0,
                        })}
                      >
                        {withCurrency(summary.grandBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Transaction detail panel                                          */}
          {/* ---------------------------------------------------------------- */}
          {expandedId !== null && (
            <div className="row">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    {/* Panel header */}
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h5 className="card-title mb-0">
                        {transactions
                          ? `${transactions.paymentName} – ${t('Transactions')}`
                          : t('Transactions')}
                      </h5>
                      {transactions && (
                        <span className="badge bg-secondary">
                          {t('Total')}: {transactions.total}
                        </span>
                      )}
                    </div>

                    {/* Transaction error */}
                    {txError && <div className="alert alert-danger">{txError}</div>}

                    {/* Loading */}
                    {txLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                        <span className="ms-2 text-muted">{t('Loading...')}</span>
                      </div>
                    ) : transactions && transactions.items.length > 0 ? (
                      <>
                        <div className="table-responsive">
                          <table className="table table-striped table-hover align-middle mb-3">
                            <thead className="table-light">
                              <tr>
                                <th>{t('Date')}</th>
                                <th>{t('Type')}</th>
                                <th>{t('Reference')}</th>
                                <th>{t('Description')}</th>
                                <th className="text-end">{t('In')}</th>
                                <th className="text-end">{t('Out')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions.items.map((tx, idx) => (
                                <tr key={idx}>
                                  <td className="text-nowrap text-muted small">{tx.date}</td>
                                  <td>
                                    <span
                                      className={classNames(
                                        'badge',
                                        txTypeBadge(tx.type),
                                      )}
                                    >
                                      {txTypeLabel(tx.type, t)}
                                    </span>
                                  </td>
                                  <td className="fw-semibold">{tx.reference}</td>
                                  <td className="text-muted">{tx.description || '—'}</td>
                                  <td className="text-end">
                                    {tx.amountIn > 0 ? (
                                      <span className="text-success fw-semibold">
                                        {withCurrency(tx.amountIn)}
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    {tx.amountOut > 0 ? (
                                      <span className="text-danger fw-semibold">
                                        {withCurrency(tx.amountOut)}
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {transactions.totalPages > 1 && (
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <small className="text-muted">
                              {t('Page')} {transactions.page} {t('of')} {transactions.totalPages}
                              {' '}({transactions.total} {t('entries')})
                            </small>
                            {renderPageButtons(transactions.totalPages, transactions.page)}
                          </div>
                        )}
                      </>
                    ) : !txLoading && transactions ? (
                      <p className="text-muted">{t('No transactions found for this period.')}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted">{t('No data available')}</p>
      )}
    </DashboardLayout>
  );
};
