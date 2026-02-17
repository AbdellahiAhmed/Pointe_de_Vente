import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_SALES} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, REPORTS_SALES} from "../../routes/frontend.routes";

interface SalesData {
  dateFrom: string;
  dateTo: string;
  totalOrders: number;
  completedOrders: number;
  returnedOrders: number;
  grossRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  averageBasket: number;
  payments: Array<{ paymentType: string; amount: number }>;
}

export const SalesReport: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await jsonRequest(`${REPORT_SALES}?dateFrom=${dateFrom}&dateTo=${dateTo}`);
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
      title={t("Sales Report")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Reports')},
        {title: t('Sales Report'), current: true},
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
        <>
          {/* KPI Cards */}
          <div className="row">
            <div className="col-xxl-3 col-md-6">
              <div className="card info-card sales-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Completed Orders')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-cart-check"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{data.completedOrders}</h6>
                      {data.returnedOrders > 0 && (
                        <span className="text-danger small">{data.returnedOrders} {t('Returned Orders').toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-md-6">
              <div className="card info-card revenue-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Net Revenue')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-currency-exchange"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{formatCurrency(data.netRevenue)}</h6>
                      {data.totalDiscounts > 0 && (
                        <span className="text-muted small">-{formatCurrency(data.totalDiscounts)} {t('Discount').toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-md-6">
              <div className="card info-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Gross Revenue')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-cash-stack"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{formatCurrency(data.grossRevenue)}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-md-6">
              <div className="card info-card customers-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Average Basket')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-basket"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{formatCurrency(data.averageBasket)}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Payment Breakdown')}</h5>
                  {data.payments.length > 0 ? (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>{t('Payment type')}</th>
                          <th className="text-end">{t('Amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((p, i) => (
                          <tr key={i}>
                            <td>{p.paymentType}</td>
                            <td className="text-end fw-bold">{formatCurrency(Number(p.amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-primary">
                          <td className="fw-bold">{t('Total')}</td>
                          <td className="text-end fw-bold">
                            {formatCurrency(data.payments.reduce((sum, p) => sum + Number(p.amount), 0))}
                          </td>
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
        </>
      ) : (
        <p className="text-muted">{t('No data available')}</p>
      )}
    </DashboardLayout>
  );
};
