import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_PROFIT} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, REPORTS_PROFIT} from "../../routes/frontend.routes";
import {ResponsiveBar} from '@nivo/bar';

interface ProfitData {
  dateFrom: string;
  dateTo: string;
  totalRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  totalOrders: number;
  topProducts: Array<{
    productName: string;
    totalQty: string;
    revenue: string;
    cost: string;
    profit: string;
    margin: number;
  }>;
}

export const ProfitReport: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jsonRequest(`${REPORT_PROFIT}?dateFrom=${dateFrom}&dateTo=${dateTo}`);
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

  return (
    <DashboardLayout
      title={t("Profit Report")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Reports')},
        {title: t('Profit Report'), current: true},
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
          {/* KPI Cards */}
          <div className="row">
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
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-md-6">
              <div className="card info-card" style={{borderLeft: '4px solid #dc3545'}}>
                <div className="card-body">
                  <h5 className="card-title">{t('Total Cost')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center" style={{background: '#fce4ec'}}>
                      <i className="bi bi-box-seam" style={{color: '#dc3545'}}></i>
                    </div>
                    <div className="ps-3">
                      <h6>{formatCurrency(data.totalCost)}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-3 col-md-6">
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

            <div className="col-xxl-3 col-md-6">
              <div className="card info-card customers-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Profit Margin')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-percent"></i>
                    </div>
                    <div className="ps-3">
                      <h6 className={data.profitMargin >= 0 ? 'text-success' : 'text-danger'}>
                        {data.profitMargin}%
                      </h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Products Bar Chart */}
          {data.topProducts.length > 0 && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">{t('Profit by Product')}</h5>
                    <div style={{ height: 350 }}>
                      <ResponsiveBar
                        data={data.topProducts.slice(0, 10).map(p => ({
                          product: p.productName.length > 20 ? p.productName.substring(0, 20) + '...' : p.productName,
                          profit: Number(p.profit),
                          revenue: Number(p.revenue),
                        }))}
                        keys={['profit', 'revenue']}
                        indexBy="product"
                        groupMode="grouped"
                        margin={{ top: 10, right: 20, bottom: 60, left: 80 }}
                        padding={0.2}
                        colors={['#10b981', '#3b82f6']}
                        axisBottom={{ tickRotation: -45 }}
                        enableLabel={false}
                        legends={[
                          {
                            dataFrom: 'keys',
                            anchor: 'top-right',
                            direction: 'row',
                            translateY: -10,
                            itemWidth: 80,
                            itemHeight: 20,
                            symbolSize: 12,
                          }
                        ]}
                        tooltip={({ id, indexValue, value }) => (
                          <div style={{ padding: 8, background: '#fff', border: '1px solid #ccc', borderRadius: 4 }}>
                            <strong>{indexValue}</strong> - {id}: {new Intl.NumberFormat('fr-FR').format(value as number)} MRU
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Products Table */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Top Products')}</h5>
                  {data.topProducts.length > 0 ? (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('Product')}</th>
                          <th className="text-end">{t('Qty Sold')}</th>
                          <th className="text-end">{t('Revenue')}</th>
                          <th className="text-end">{t('Cost Price')}</th>
                          <th className="text-end">{t('Profit')}</th>
                          <th className="text-end">{t('Margin')} %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProducts.map((p, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{p.productName}</td>
                            <td className="text-end">{Number(p.totalQty).toFixed(0)}</td>
                            <td className="text-end">{formatCurrency(Number(p.revenue))}</td>
                            <td className="text-end">{formatCurrency(Number(p.cost))}</td>
                            <td className={`text-end fw-bold ${Number(p.profit) >= 0 ? 'text-success' : 'text-danger'}`}>
                              {formatCurrency(Number(p.profit))}
                            </td>
                            <td className={`text-end ${Number(p.margin) >= 0 ? 'text-success' : 'text-danger'}`}>
                              {Number(p.margin).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
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
