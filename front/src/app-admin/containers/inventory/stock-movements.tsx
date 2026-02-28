import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {STOCK_MOVEMENTS, STORE_LIST} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, STOCK_MOVEMENTS as STOCK_MOVEMENTS_ROUTE} from "../../routes/frontend.routes";

interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  storeId: number;
  storeName: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  type: string;
  reference: string | null;
  reason: string | null;
  userName: string;
  createdAt: string;
}

interface StoreOption {
  id: number;
  name: string;
}

const MOVEMENT_TYPES = ['sale', 'purchase', 'adjustment', 'return', 'damage', 'loss'] as const;
type MovementType = typeof MOVEMENT_TYPES[number];

const TYPE_BADGE_CLASS: Record<MovementType, string> = {
  sale: 'bg-primary',
  purchase: 'bg-success',
  adjustment: 'bg-warning text-dark',
  return: 'bg-info',
  damage: 'bg-danger',
  loss: 'bg-dark',
};

export const StockMovements: FunctionComponent = () => {
  const {t} = useTranslation();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 50;

  const fetchMovements = async (targetPage: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: string[] = [`page=${targetPage}`, `limit=${limit}`];
      if (selectedStore) params.push(`store=${selectedStore}`);
      if (selectedType) params.push(`type=${selectedType}`);
      if (dateFrom) params.push(`dateFrom=${dateFrom}`);
      if (dateTo) params.push(`dateTo=${dateTo}`);

      const url = `${STOCK_MOVEMENTS}?${params.join('&')}`;
      const response = await jsonRequest(url);
      const json = await response.json();
      setMovements(json.list || []);
      setTotal(json.total || 0);
      setPage(json.page || 1);
      setPages(json.pages || 1);
    } catch (e) {
      setError(t('An error occurred while loading data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await jsonRequest(STORE_LIST);
      const json = await response.json();
      setStores((json['hydra:member'] || []).map((s: any) => ({id: s.id, name: s.name})));
    } catch {
      // silently handled
    }
  };

  useEffect(() => {
    fetchStores();
    fetchMovements(1);
  }, []);

  const handleFilter = () => {
    fetchMovements(1);
  };

  const handlePrev = () => {
    if (page > 1) {
      fetchMovements(page - 1);
    }
  };

  const handleNext = () => {
    if (page < pages) {
      fetchMovements(page + 1);
    }
  };

  const getTypeBadgeClass = (type: string): string => {
    return TYPE_BADGE_CLASS[type as MovementType] || 'bg-secondary';
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      sale: t('Sale'),
      purchase: t('Purchase'),
      adjustment: t('Adjustment'),
      return: t('Return'),
      damage: t('Damage'),
      loss: t('Loss'),
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout
      title={t("Stock Movements")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Inventory')},
        {title: t('Stock Movements'), current: true},
      ]}
    >
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row align-items-end g-3">
                <div className="col-md-3">
                  <label className="form-label">{t('Store')}</label>
                  <select
                    className="form-select"
                    value={selectedStore}
                    onChange={e => setSelectedStore(e.target.value)}
                  >
                    <option value="">{t('All Stores')}</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('Type')}</label>
                  <select
                    className="form-select"
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                  >
                    <option value="">{t('All')}</option>
                    {MOVEMENT_TYPES.map(type => (
                      <option key={type} value={type}>{getTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('Date From')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('Date To')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                  />
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <button
                    className="btn btn-primary"
                    onClick={handleFilter}
                    disabled={loading}
                  >
                    {t('Filter')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">{t('Loading...')}</span>
                  </div>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  {t('No stock movements found')}
                </div>
              ) : (
                <>
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>{t('Date')}</th>
                        <th>{t('Product')}</th>
                        <th>{t('Store')}</th>
                        <th>{t('Type')}</th>
                        <th className="text-end">{t('Qty Before')}</th>
                        <th className="text-end">{t('Qty Changed')}</th>
                        <th className="text-end">{t('Qty After')}</th>
                        <th>{t('User')}</th>
                        <th>{t('Reference')}</th>
                        <th>{t('Reason')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(movement => (
                        <tr key={movement.id}>
                          <td>{movement.createdAt}</td>
                          <td>{movement.productName}</td>
                          <td>{movement.storeName}</td>
                          <td>
                            <span className={`badge ${getTypeBadgeClass(movement.type)}`}>
                              {getTypeLabel(movement.type)}
                            </span>
                          </td>
                          <td className="text-end">{movement.quantityBefore}</td>
                          <td className="text-end">
                            <span className={movement.quantityChanged >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                              {movement.quantityChanged >= 0 ? `+${movement.quantityChanged}` : movement.quantityChanged}
                            </span>
                          </td>
                          <td className="text-end">{movement.quantityAfter}</td>
                          <td>{movement.userName}</td>
                          <td>{movement.reference || '-'}</td>
                          <td>{movement.reason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="text-muted">
                      {t('Total')}: {total} &mdash; {t('Page')} {page} {t('of')} {pages}
                    </span>
                    <div className="btn-group">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handlePrev}
                        disabled={page <= 1 || loading}
                      >
                        {t('Previous')}
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleNext}
                        disabled={page >= pages || loading}
                      >
                        {t('Next')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
