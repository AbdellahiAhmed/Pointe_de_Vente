import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {STOCK_ALERTS, STORE_LIST} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, INVENTORY_ALERTS} from "../../routes/frontend.routes";

interface StockAlert {
  productId: number;
  productName: string;
  barcode: string;
  storeId: number;
  storeName: string;
  quantity: number;
  reOrderLevel: number;
}

interface StoreOption {
  id: number;
  name: string;
}

export const StockAlerts: FunctionComponent = () => {
  const {t} = useTranslation();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const fetchAlerts = async (storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = storeId ? `${STOCK_ALERTS}?store=${storeId}` : STOCK_ALERTS;
      const response = await jsonRequest(url);
      const json = await response.json();
      setAlerts(json.list || []);
      setCount(json.count || 0);
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
    fetchAlerts();
  }, []);

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedStore(val);
    fetchAlerts(val || undefined);
  };

  return (
    <DashboardLayout
      title={t("Stock Alerts")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Inventory')},
        {title: t('Stock Alerts'), current: true},
      ]}
    >
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row align-items-end">
                <div className="col-md-4">
                  <label className="form-label">{t('Store')}</label>
                  <select
                    className="form-select"
                    value={selectedStore}
                    onChange={handleStoreChange}
                  >
                    <option value="">{t('All Stores')}</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <span className="badge bg-danger fs-6 p-2">
                    {count} {t('products below threshold')}
                  </span>
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
              ) : alerts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  {t('No products below stock threshold')}
                </div>
              ) : (
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t('Product')}</th>
                      <th>{t('Barcode')}</th>
                      <th>{t('Store')}</th>
                      <th className="text-end">{t('Current Stock')}</th>
                      <th className="text-end">{t('Reorder Level')}</th>
                      <th className="text-end">{t('Shortage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, idx) => (
                      <tr key={`${alert.productId}-${alert.storeId}-${idx}`}>
                        <td>{alert.productName}</td>
                        <td>{alert.barcode}</td>
                        <td>{alert.storeName}</td>
                        <td className="text-end">
                          <span className={alert.quantity <= 0 ? 'text-danger fw-bold' : 'text-warning'}>
                            {alert.quantity}
                          </span>
                        </td>
                        <td className="text-end">{alert.reOrderLevel}</td>
                        <td className="text-end text-danger">
                          {Math.max(0, alert.reOrderLevel - alert.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
