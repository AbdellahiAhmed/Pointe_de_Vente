import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_VENDOR} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, REPORTS_VENDOR} from "../../routes/frontend.routes";

interface VendorData {
  dateFrom: string;
  dateTo: string;
  vendors: Array<{
    vendorId: number;
    vendorName: string;
    totalOrders: number;
    grossRevenue: number;
    totalDiscounts: number;
    netRevenue: number;
    averageBasket: number;
  }>;
}

export const VendorReport: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await jsonRequest(`${REPORT_VENDOR}?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      const json = await response.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {style: 'decimal', minimumFractionDigits: 2}).format(value) + ' MRU';
  };

  return (
    <DashboardLayout
      title={t("Vendor Report")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Reports')},
        {title: t('Vendor Report'), current: true},
      ]}
    >
      {/* Date Filter */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body pt-3">
              <div className="row align-items-end">
                <div className="col-md-3">
                  <label className="form-label">{t('From')}</label>
                  <input type="date" className="form-control" value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">{t('To')}</label>
                  <input type="date" className="form-control" value={dateTo}
                    onChange={e => setDateTo(e.target.value)} />
                </div>
                <div className="col-md-3">
                  <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
                    <i className="bi bi-search me-1"></i> {t('Apply')}
                  </button>
                  <button className="btn btn-outline-secondary ms-2" onClick={() => window.print()}>
                    <i className="bi bi-printer me-1"></i> {t('Print Report')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">{t('Loading...')}</p>
        </div>
      ) : data ? (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Vendor Performance')}</h5>
                {data.vendors.length > 0 ? (
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('Vendor')}</th>
                        <th className="text-end">{t('Orders')}</th>
                        <th className="text-end">{t('Gross Revenue')}</th>
                        <th className="text-end">{t('Discounts')}</th>
                        <th className="text-end">{t('Net Revenue')}</th>
                        <th className="text-end">{t('Avg Basket')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.vendors.map((v, i) => (
                        <tr key={v.vendorId}>
                          <td>{i + 1}</td>
                          <td>{v.vendorName}</td>
                          <td className="text-end">{v.totalOrders}</td>
                          <td className="text-end">{formatCurrency(v.grossRevenue)}</td>
                          <td className="text-end text-danger">-{formatCurrency(v.totalDiscounts)}</td>
                          <td className="text-end fw-bold">{formatCurrency(v.netRevenue)}</td>
                          <td className="text-end">{formatCurrency(v.averageBasket)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-primary">
                        <td colSpan={2} className="fw-bold">{t('Total')}</td>
                        <td className="text-end fw-bold">
                          {data.vendors.reduce((s, v) => s + v.totalOrders, 0)}
                        </td>
                        <td className="text-end fw-bold">
                          {formatCurrency(data.vendors.reduce((s, v) => s + v.grossRevenue, 0))}
                        </td>
                        <td className="text-end fw-bold text-danger">
                          -{formatCurrency(data.vendors.reduce((s, v) => s + v.totalDiscounts, 0))}
                        </td>
                        <td className="text-end fw-bold">
                          {formatCurrency(data.vendors.reduce((s, v) => s + v.netRevenue, 0))}
                        </td>
                        <td className="text-end">-</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-muted">{t('No data available')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-muted">{t('No data available')}</p>
      )}
    </DashboardLayout>
  );
};
