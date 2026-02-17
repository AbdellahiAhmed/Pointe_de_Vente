import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_DAILY} from "../../../api/routing/routes/backend.app";
import {Link} from "react-router-dom";
import {REPORTS_SALES, REPORTS_PROFIT, REPORTS_DAILY} from "../../routes/frontend.routes";

export interface DashboardProps {}

export const Dashboard: FunctionComponent<DashboardProps> = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await jsonRequest(`${REPORT_DAILY}?date=${new Date().toISOString().split('T')[0]}`);
        const json = await response.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {style: 'decimal', minimumFractionDigits: 2}).format(value) + ' MRU';
  };

  return (
    <DashboardLayout
      title={t("Dashboard")}
      breadCrumbs={[
        {title: t('Home')},
        {title: t('Dashboard'), current: true},
      ]}
    >
      <div className="row">
        <div className="col-lg-8">
          <div className="row">
            <div className="col-xxl-4 col-md-6">
              <div className="card info-card sales-card">
                <div className="card-body">
                  <h5 className="card-title">{t("Sales")} <span>| {t("Today")}</span></h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-cart"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{loading ? '...' : (data?.totalOrders ?? 0)}</h6>
                      <span className="text-muted small">{t('Completed Orders').toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-4 col-md-6">
              <div className="card info-card revenue-card">
                <div className="card-body">
                  <h5 className="card-title">{t("Revenue")} <span>| {t("Today")}</span></h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-currency-exchange"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{loading ? '...' : formatCurrency(data?.netRevenue ?? 0)}</h6>
                      <span className="text-muted small">{t('Net Revenue').toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-4 col-xl-12">
              <div className="card info-card customers-card">
                <div className="card-body">
                  <h5 className="card-title">{t("Profit")} <span>| {t("Today")}</span></h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-graph-up-arrow"></i>
                    </div>
                    <div className="ps-3">
                      <h6 className={!loading && data?.grossProfit >= 0 ? 'text-success' : 'text-danger'}>
                        {loading ? '...' : formatCurrency(data?.grossProfit ?? 0)}
                      </h6>
                      <span className="text-muted small">{t('Gross Profit').toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          {!loading && data?.payments?.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Payment Breakdown')} <span>| {t("Today")}</span></h5>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>{t('Payment type')}</th>
                      <th className="text-end">{t('Amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((p: any, i: number) => (
                      <tr key={i}>
                        <td>{p.paymentType}</td>
                        <td className="text-end fw-bold">{formatCurrency(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          {/* Quick Links to Reports */}
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">{t('Reports')}</h5>
              <div className="d-grid gap-2">
                <Link to={REPORTS_SALES} className="btn btn-outline-primary">
                  <i className="bi bi-cart-check me-2"></i>{t('Sales Report')}
                </Link>
                <Link to={REPORTS_PROFIT} className="btn btn-outline-success">
                  <i className="bi bi-graph-up-arrow me-2"></i>{t('Profit Report')}
                </Link>
                <Link to={REPORTS_DAILY} className="btn btn-outline-info">
                  <i className="bi bi-calendar-day me-2"></i>{t('Daily Report')}
                </Link>
              </div>
            </div>
          </div>

          {/* Top Products */}
          {!loading && data?.topProducts?.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Top Products')} <span>| {t("Today")}</span></h5>
                {data.topProducts.map((p: any, i: number) => (
                  <div className="d-flex align-items-center mb-3" key={i}>
                    <span className="badge bg-primary rounded-circle me-3" style={{width: 28, height: 28, lineHeight: '28px', textAlign: 'center'}}>
                      {i + 1}
                    </span>
                    <div className="flex-grow-1">
                      <div className="fw-bold">{p.productName}</div>
                      <small className="text-muted">{Number(p.totalQty).toFixed(0)} {t('items')}</small>
                    </div>
                    <span className="fw-bold">{formatCurrency(Number(p.revenue))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          {!loading && data && (
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Daily Summary')}</h5>
                <table className="table table-sm">
                  <tbody>
                    <tr>
                      <td className="text-muted">{t('Gross Revenue')}</td>
                      <td className="text-end">{formatCurrency(data.grossRevenue ?? 0)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('Total Discounts')}</td>
                      <td className="text-end text-danger">-{formatCurrency(data.totalDiscounts ?? 0)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('Total Cost')}</td>
                      <td className="text-end text-danger">-{formatCurrency(data.totalCost ?? 0)}</td>
                    </tr>
                    <tr className="table-success">
                      <td className="fw-bold">{t('Gross Profit')}</td>
                      <td className="text-end fw-bold">{formatCurrency(data.grossProfit ?? 0)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('Profit Margin')}</td>
                      <td className="text-end">{data.profitMargin ?? 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
