import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_DAILY, REPORT_WEEKLY, STOCK_ALERTS} from "../../../api/routing/routes/backend.app";
import {Link} from "react-router-dom";
import {REPORTS_SALES, REPORTS_PROFIT, REPORTS_DAILY} from "../../routes/frontend.routes";
import {ResponsiveLine} from '@nivo/line';
import {ResponsiveBar} from '@nivo/bar';
import {ResponsivePie} from '@nivo/pie';

export interface DashboardProps {}

export const Dashboard: FunctionComponent<DashboardProps> = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [weeklyData, setWeeklyData] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await jsonRequest(`${REPORT_DAILY}?date=${new Date().toISOString().split('T')[0]}`);
        const json = await response.json();
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchLowStock = async () => {
      try {
        const response = await jsonRequest(STOCK_ALERTS);
        const json = await response.json();
        setLowStockCount(json['hydra:totalItems'] ?? json.count ?? 0);
      } catch (e) { /* ignore */ }
    };

    const fetchWeekly = async () => {
      try {
        const response = await jsonRequest(REPORT_WEEKLY);
        const json = await response.json();
        setWeeklyData(json);
      } catch { /* ignore */ }
    };

    fetchDashboard();
    fetchLowStock();
    fetchWeekly();
  }, []);

  const formatCurrency = (value: number) => {
    return '\u200E' + new Intl.NumberFormat('fr-FR', {style: 'decimal', minimumFractionDigits: 2}).format(value) + ' MRU\u200E';
  };

  return (
    <DashboardLayout
      title={t("Dashboard")}
      breadCrumbs={[
        {title: t('Home')},
        {title: t('Dashboard'), current: true},
      ]}
    >
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {t('Failed to load data')}
        </div>
      )}

      {/* KPI Cards - Row 1 */}
      <div className="row">
        <div className="col-xxl-4 col-md-4">
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

        <div className="col-xxl-4 col-md-4">
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

        <div className="col-xxl-4 col-md-4">
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

      {/* KPI Cards - Row 2 */}
      <div className="row">
        <div className="col-md-6">
          <div className="card info-card">
            <div className="card-body">
              <h5 className="card-title">{t("Average Basket")} <span>| {t("Today")}</span></h5>
              <div className="d-flex align-items-center">
                <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                  <i className="bi bi-basket"></i>
                </div>
                <div className="ps-3">
                  <h6>{loading ? '...' : formatCurrency(data?.averageBasket ?? 0)}</h6>
                  <span className="text-muted small">{t('per order').toLowerCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card info-card" style={{borderLeft: '4px solid #f59e0b'}}>
            <div className="card-body">
              <h5 className="card-title">{t("Low Stock")} <span>| {t("Now")}</span></h5>
              <div className="d-flex align-items-center">
                <div className="card-icon rounded-circle d-flex align-items-center justify-content-center" style={{background: '#fef3c7'}}>
                  <i className="bi bi-exclamation-triangle" style={{color: '#f59e0b'}}></i>
                </div>
                <div className="ps-3">
                  <h6 className={lowStockCount > 0 ? 'text-warning' : 'text-success'}>
                    {loading ? '...' : lowStockCount}
                  </h6>
                  <span className="text-muted small">{t('products').toLowerCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {weeklyData && (
        <div className="row">
          {/* Sales trend line chart */}
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Sales Trend')} <span>| {t('Last 7 days')}</span></h5>
                <div style={{height: 300}}>
                  <ResponsiveLine
                    data={[{
                      id: t('Revenue'),
                      data: (weeklyData.daily || []).map((d: any) => ({
                        x: d.label,
                        y: d.revenue,
                      })),
                    }]}
                    margin={{top: 20, right: 20, bottom: 50, left: 60}}
                    xScale={{type: 'point'}}
                    yScale={{type: 'linear', min: 0, max: 'auto'}}
                    curve="catmullRom"
                    axisBottom={{tickSize: 5, tickPadding: 5}}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      format: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString(),
                    }}
                    enablePoints={true}
                    pointSize={8}
                    pointColor={{theme: 'background'}}
                    pointBorderWidth={2}
                    pointBorderColor={{from: 'serieColor'}}
                    enableArea={true}
                    areaOpacity={0.1}
                    colors={['#4361ee']}
                    enableGridX={false}
                    useMesh={true}
                    tooltip={({point}) => (
                      <div style={{background: '#fff', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13}}>
                        <strong>{point.data.xFormatted}</strong>: {formatCurrency(point.data.y as number)}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment pie chart */}
          <div className="col-lg-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Payments')} <span>| {t('Last 7 days')}</span></h5>
                <div style={{height: 300}}>
                  {weeklyData.payments?.length > 0 ? (
                    <ResponsivePie
                      data={(weeklyData.payments || []).map((p: any) => ({
                        id: p.paymentType,
                        label: p.paymentType,
                        value: p.amount,
                      }))}
                      margin={{top: 20, right: 20, bottom: 20, left: 20}}
                      innerRadius={0.5}
                      padAngle={1}
                      cornerRadius={3}
                      activeOuterRadiusOffset={8}
                      colors={{scheme: 'nivo'}}
                      enableArcLabels={true}
                      enableArcLinkLabels={true}
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor="#333"
                      arcLinkLabelsThickness={2}
                      arcLabelsSkipAngle={10}
                      tooltip={({datum}) => (
                        <div style={{background: '#fff', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13}}>
                          <strong>{datum.label}</strong>: {formatCurrency(datum.value)}
                        </div>
                      )}
                    />
                  ) : (
                    <div className="text-center text-muted py-5">{t('No data')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Products Bar Chart */}
      {weeklyData?.topProducts?.length > 0 && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Top 5 Products')} <span>| {t('Last 7 days')}</span></h5>
                <div style={{height: 300}}>
                  <ResponsiveBar
                    data={(weeklyData.topProducts || []).map((p: any) => ({
                      product: p.productName.length > 15 ? p.productName.substring(0, 15) + '...' : p.productName,
                      [t('Quantity')]: p.totalQty,
                      [t('Revenue')]: p.revenue,
                    }))}
                    keys={[t('Revenue')]}
                    indexBy="product"
                    margin={{top: 20, right: 20, bottom: 60, left: 60}}
                    padding={0.3}
                    layout="horizontal"
                    valueScale={{type: 'linear'}}
                    indexScale={{type: 'band', round: true}}
                    colors={['#2ec4b6']}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      format: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString(),
                    }}
                    labelSkipWidth={12}
                    enableGridY={false}
                    tooltip={({indexValue, value}) => (
                      <div style={{background: '#fff', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13}}>
                        <strong>{indexValue}</strong>: {formatCurrency(value as number)}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-8">
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
                      <td className="text-end text-danger" dir="ltr">-{formatCurrency(data.totalDiscounts ?? 0)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">{t('Total Cost')}</td>
                      <td className="text-end text-danger" dir="ltr">-{formatCurrency(data.totalCost ?? 0)}</td>
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
