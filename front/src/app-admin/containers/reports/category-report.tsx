import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_CATEGORY} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, REPORTS_CATEGORY} from "../../routes/frontend.routes";
import {ResponsivePie} from '@nivo/pie';

interface CategoryData {
  dateFrom: string;
  dateTo: string;
  categories: Array<{
    categoryId: number;
    categoryName: string;
    totalOrders: number;
    grossRevenue: number;
    totalDiscounts: number;
    netRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
  }>;
}

export const CategoryReport: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jsonRequest(`${REPORT_CATEGORY}?dateFrom=${dateFrom}&dateTo=${dateTo}`);
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
    return '\u200E' + new Intl.NumberFormat('fr-FR', {style: 'decimal', minimumFractionDigits: 2}).format(value) + ' MRU\u200E';
  };

  return (
    <DashboardLayout
      title={t("Category Report")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Reports')},
        {title: t('Category Report'), current: true},
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
          {/* Pie chart for revenue distribution */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Revenue by Category')}</h5>
                  {data.categories.length > 0 && (
                    <div style={{ height: 350 }}>
                      <ResponsivePie
                        data={data.categories.map(c => ({
                          id: c.categoryName,
                          label: c.categoryName,
                          value: c.netRevenue,
                        }))}
                        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                        innerRadius={0.5}
                        padAngle={0.7}
                        cornerRadius={3}
                        colors={{ scheme: 'paired' }}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        arcLinkLabelsSkipAngle={10}
                        arcLabelsSkipAngle={10}
                        arcLinkLabelsTextColor="#333"
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: 'color' }}
                        valueFormat={(v) => '\u200E' + new Intl.NumberFormat('fr-FR').format(v) + ' MRU\u200E'}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Category Performance Table */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Category Performance')}</h5>
                  {data.categories.length > 0 ? (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('Category')}</th>
                          <th className="text-end">{t('Orders')}</th>
                          <th className="text-end">{t('Gross Revenue')}</th>
                          <th className="text-end">{t('Cost Price')}</th>
                          <th className="text-end">{t('Profit')}</th>
                          <th className="text-end">{t('Margin')} %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.categories.map((c, i) => (
                          <tr key={c.categoryId}>
                            <td>{i + 1}</td>
                            <td>{c.categoryName}</td>
                            <td className="text-end">{c.totalOrders}</td>
                            <td className="text-end">{formatCurrency(c.grossRevenue)}</td>
                            <td className="text-end">{formatCurrency(c.totalCost)}</td>
                            <td className={`text-end fw-bold ${c.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                              {formatCurrency(c.grossProfit)}
                            </td>
                            <td className={`text-end ${c.profitMargin >= 0 ? 'text-success' : 'text-danger'}`}>
                              {Number(c.profitMargin).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const totals = data.categories.reduce(
                            (acc, c) => ({
                              orders: acc.orders + c.totalOrders,
                              revenue: acc.revenue + c.grossRevenue,
                              cost: acc.cost + c.totalCost,
                              profit: acc.profit + c.grossProfit,
                            }),
                            { orders: 0, revenue: 0, cost: 0, profit: 0 }
                          );
                          const totalMargin = totals.revenue > 0
                            ? ((totals.profit / totals.revenue) * 100)
                            : 0;
                          return (
                            <tr className="table-primary">
                              <td colSpan={2} className="fw-bold">{t('Total')}</td>
                              <td className="text-end fw-bold">{totals.orders}</td>
                              <td className="text-end fw-bold">{formatCurrency(totals.revenue)}</td>
                              <td className="text-end fw-bold">{formatCurrency(totals.cost)}</td>
                              <td className={`text-end fw-bold ${totals.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                {formatCurrency(totals.profit)}
                              </td>
                              <td className={`text-end fw-bold ${totalMargin >= 0 ? 'text-success' : 'text-danger'}`}>
                                {totalMargin.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })()}
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
