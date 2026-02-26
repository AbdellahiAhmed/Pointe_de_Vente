import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {REPORT_CUSTOMERS} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, CUSTOMERS_REPORT} from "../../routes/frontend.routes";

interface CustomerData {
  id: number;
  name: string;
  phone: string;
  allowCreditSale: boolean;
  creditLimit: number;
  totalSales: number;
  totalPayments: number;
  openingBalance: number;
  outstanding: number;
}

interface CustomerReportData {
  customers: CustomerData[];
  totalOutstanding: number;
  totalCustomers: number;
  creditCustomers: number;
}

export const CustomerReport: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<CustomerReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jsonRequest(REPORT_CUSTOMERS);
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
    return '\u200E' + new Intl.NumberFormat('fr-FR', {minimumFractionDigits: 2}).format(value) + ' MRU\u200E';
  };

  const getCreditStatus = (customer: CustomerData): { label: string; badgeClass: string } => {
    if (!customer.creditLimit || Number(customer.creditLimit) <= 0) {
      return {label: '-', badgeClass: ''};
    }
    const totalDebt = customer.outstanding;
    const ratio = totalDebt / Number(customer.creditLimit);
    if (ratio >= 1) {
      return {label: t('Over Limit'), badgeClass: 'badge bg-danger'};
    } else if (ratio >= 0.5) {
      return {label: t('Warning'), badgeClass: 'badge bg-warning text-dark'};
    }
    return {label: t('Healthy'), badgeClass: 'badge bg-success'};
  };

  return (
    <DashboardLayout
      title={t("Customers & Credit")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Customers & Credit'), current: true},
      ]}
    >
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
          {/* Summary Cards */}
          <div className="row mb-4">
            <div className="col-xxl-4 col-md-6">
              <div className="card info-card sales-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Total Customers')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-people-fill"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{data.totalCustomers}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-4 col-md-6">
              <div className="card info-card revenue-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Customers with Credit')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-credit-card"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{data.creditCustomers}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-4 col-md-6">
              <div className="card info-card customers-card">
                <div className="card-body">
                  <h5 className="card-title">{t('Total Outstanding')}</h5>
                  <div className="d-flex align-items-center">
                    <div className="card-icon rounded-circle d-flex align-items-center justify-content-center">
                      <i className="bi bi-cash-coin"></i>
                    </div>
                    <div className="ps-3">
                      <h6>{formatCurrency(data.totalOutstanding)}</h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">{t('Customer Details')}</h5>
                  {data.customers.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>{t('Name')}</th>
                            <th>{t('Phone')}</th>
                            <th className="text-end">{t('Credit Limit')}</th>
                            <th className="text-end">{t('Sales (credit)')}</th>
                            <th className="text-end">{t('Payments')}</th>
                            <th className="text-end">{t('Outstanding')}</th>
                            <th className="text-center">{t('Status')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.customers.map((customer) => {
                            const status = getCreditStatus(customer);
                            return (
                              <tr key={customer.id}>
                                <td className="fw-semibold">{customer.name}</td>
                                <td>{customer.phone || '-'}</td>
                                <td className="text-end">
                                  {customer.creditLimit && Number(customer.creditLimit) > 0
                                    ? formatCurrency(Number(customer.creditLimit))
                                    : '-'}
                                </td>
                                <td className="text-end">{formatCurrency(customer.totalSales)}</td>
                                <td className="text-end">{formatCurrency(customer.totalPayments)}</td>
                                <td className="text-end fw-bold">
                                  {formatCurrency(customer.outstanding)}
                                </td>
                                <td className="text-center">
                                  {status.badgeClass ? (
                                    <span className={status.badgeClass}>{status.label}</span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="table-primary fw-bold">
                            <td colSpan={4}>{t('Total')}</td>
                            <td className="text-end">
                              {formatCurrency(data.customers.reduce((sum, c) => sum + c.totalPayments, 0))}
                            </td>
                            <td className="text-end">
                              {formatCurrency(data.totalOutstanding)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
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
