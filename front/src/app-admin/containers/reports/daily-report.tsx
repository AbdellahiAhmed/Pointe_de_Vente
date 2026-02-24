import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_DAILY} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, REPORTS_DAILY} from "../../routes/frontend.routes";
import {ResponsiveBar} from '@nivo/bar';
import {ResponsivePie} from '@nivo/pie';

interface DailyData {
  date: string;
  totalOrders: number;
  returnedOrders: number;
  grossRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  averageBasket: number;
  payments: Array<{ paymentType: string; amount: number }>;
  topProducts: Array<{ productName: string; totalQty: string; revenue: string }>;
  topVendors: Array<{ vendorName: string; totalOrders: string; revenue: string }>;
  yesterday: {
    date: string;
    grossRevenue: number;
    netRevenue: number;
    totalOrders: number;
  };
}

export const DailyReport: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jsonRequest(`${REPORT_DAILY}?date=${date}`);
      const json = await response.json();
      setData(json);
    } catch (e) {
      setError(t('An error occurred while loading data'));
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <DashboardLayout
      title={t("Daily Report")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Reports')},
        {title: t('Daily Report'), current: true},
      ]}
    >
      {/* Date Filter */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body pt-3">
              <div className="row align-items-end">
                <div className="col-md-4">
                  <label className="form-label">{t('Date')}</label>
                  <input type="date" className="form-control" value={date}
                    onChange={e => setDate(e.target.value)} />
                </div>
                <div className="col-md-4">
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

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">{t('Loading...')}</p>
        </div>
      ) : data ? (
        <>
          {/* Date Header */}
          <div className="row mb-3">
            <div className="col-12">
              <h4 className="text-center text-capitalize">{formatDate(data.date)}</h4>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="row">
            <div className="col-md-3">
              <div className="card info-card sales-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Orders')} {t('of the day')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-receipt"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{data.totalOrders}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card info-card revenue-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Net Revenue')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-currency-exchange"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{formatCurrency(data.netRevenue)}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card info-card sales-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Gross Profit')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-graph-up-arrow"></i>
                    </div>
                    <div className="ps-3">
                      <h6 className={data.grossProfit >= 0 ? 'text-success' : 'text-danger'}>
                        {formatCurrency(data.grossProfit)}
                      </h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card info-card customers-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Profit Margin')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-percent"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{data.profitMargin}%</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Average Basket + Yesterday Comparison */}
          <div className="row">
            <div className="col-md-6">
              <div className="card info-card">
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

            {data.yesterday && (
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{t('Comparison J-1')}</h5>
                    <table className="table">
                      <thead>
                        <tr>
                          <th></th>
                          <th className="text-end">{t('Today')}</th>
                          <th className="text-end">{t('Yesterday')}</th>
                          <th className="text-end">{t('Change')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{t('Net Revenue')}</td>
                          <td className="text-end">{formatCurrency(data.netRevenue)}</td>
                          <td className="text-end">{formatCurrency(data.yesterday.netRevenue)}</td>
                          <td className={`text-end fw-bold ${
                            ((data.netRevenue - data.yesterday.netRevenue) / Math.max(data.yesterday.netRevenue, 1)) * 100 >= 0
                              ? 'text-success' : 'text-danger'
                          }`}>
                            {(() => {
                              const delta = ((data.netRevenue - data.yesterday.netRevenue) / Math.max(data.yesterday.netRevenue, 1)) * 100;
                              return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
                            })()}
                          </td>
                        </tr>
                        <tr>
                          <td>{t('Orders')}</td>
                          <td className="text-end">{data.totalOrders}</td>
                          <td className="text-end">{data.yesterday.totalOrders}</td>
                          <td className={`text-end fw-bold ${
                            ((data.totalOrders - data.yesterday.totalOrders) / Math.max(data.yesterday.totalOrders, 1)) * 100 >= 0
                              ? 'text-success' : 'text-danger'
                          }`}>
                            {(() => {
                              const delta = ((data.totalOrders - data.yesterday.totalOrders) / Math.max(data.yesterday.totalOrders, 1)) * 100;
                              return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="row">
            {/* Payment Breakdown with chart */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Payment Breakdown')}</h5>
                  {data.payments.length > 0 ? (
                    <>
                      <div style={{ height: 250 }} className="mb-3">
                        <ResponsiveBar
                          data={data.payments.map(p => ({
                            type: p.paymentType,
                            amount: Number(p.amount),
                          }))}
                          keys={['amount']}
                          indexBy="type"
                          margin={{ top: 10, right: 20, bottom: 40, left: 80 }}
                          padding={0.3}
                          colors={{ scheme: 'paired' }}
                          enableLabel={false}
                          axisLeft={{ format: (v: number) => new Intl.NumberFormat('fr-FR').format(v) }}
                        />
                      </div>
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
                              {formatCurrency(data.payments.reduce((s, p) => s + Number(p.amount), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </>
                  ) : (
                    <p className="text-muted">{t('No data available')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Top Products with pie chart */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Top Products')} {t('of the day')}</h5>
                  {data.topProducts.length > 0 ? (
                    <>
                      <div style={{ height: 250 }} className="mb-3">
                        <ResponsivePie
                          data={data.topProducts.map(p => ({
                            id: p.productName,
                            label: p.productName,
                            value: Number(p.revenue),
                          }))}
                          margin={{ top: 10, right: 60, bottom: 10, left: 60 }}
                          innerRadius={0.4}
                          padAngle={0.7}
                          colors={{ scheme: 'paired' }}
                          arcLinkLabelsSkipAngle={10}
                          arcLabelsSkipAngle={10}
                          valueFormat={(v) => new Intl.NumberFormat('fr-FR').format(v) + ' MRU'}
                        />
                      </div>
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t('Product')}</th>
                            <th className="text-end">{t('Qty Sold')}</th>
                            <th className="text-end">{t('Revenue')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topProducts.map((p, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>{p.productName}</td>
                              <td className="text-end">{Number(p.totalQty).toFixed(0)}</td>
                              <td className="text-end fw-bold">{formatCurrency(Number(p.revenue))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <p className="text-muted">{t('No data available')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Vendors */}
          {data.topVendors && data.topVendors.length > 0 && (
            <div className="row">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{t('Top Vendors')} {t('of the day')}</h5>
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('Vendor')}</th>
                          <th className="text-end">{t('Orders')}</th>
                          <th className="text-end">{t('Revenue')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topVendors.map((v, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{v.vendorName}</td>
                            <td className="text-end">{Number(v.totalOrders).toFixed(0)}</td>
                            <td className="text-end fw-bold">{formatCurrency(Number(v.revenue))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Summary Table */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Daily Summary')}</h5>
                  <table className="table">
                    <tbody>
                      <tr>
                        <td>{t('Gross Revenue')}</td>
                        <td className="text-end">{formatCurrency(data.grossRevenue)}</td>
                      </tr>
                      <tr>
                        <td>{t('Total Discounts')}</td>
                        <td className="text-end text-danger">-{formatCurrency(data.totalDiscounts)}</td>
                      </tr>
                      <tr className="table-light">
                        <td className="fw-bold">{t('Net Revenue')}</td>
                        <td className="text-end fw-bold">{formatCurrency(data.netRevenue)}</td>
                      </tr>
                      <tr>
                        <td>{t('Total Cost')} ({t('Cost Price')})</td>
                        <td className="text-end text-danger">-{formatCurrency(data.totalCost)}</td>
                      </tr>
                      <tr className="table-success">
                        <td className="fw-bold">{t('Gross Profit')}</td>
                        <td className={`text-end fw-bold ${data.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(data.grossProfit)}
                        </td>
                      </tr>
                      <tr>
                        <td>{t('Profit Margin')}</td>
                        <td className="text-end">{data.profitMargin}%</td>
                      </tr>
                      <tr>
                        <td>{t('Returned Orders')}</td>
                        <td className="text-end">{data.returnedOrders}</td>
                      </tr>
                    </tbody>
                  </table>
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
