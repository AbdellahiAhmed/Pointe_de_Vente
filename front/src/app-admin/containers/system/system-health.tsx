import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {SYSTEM_HEALTH} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, SYSTEM_HEALTH as SYSTEM_HEALTH_ROUTE} from "../../routes/frontend.routes";

interface Anomaly {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  messageKey: string;
  messageParams: Record<string, string>;
  entityId: number;
  entityType: string;
}

interface HealthSummary {
  critical: number;
  warning: number;
  info: number;
  lastScan: string;
}

interface HealthData {
  summary: HealthSummary;
  anomalies: Anomaly[];
}

type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

const severityConfig = {
  critical: {bg: 'bg-danger', icon: 'bi-exclamation-octagon-fill'},
  warning: {bg: 'bg-warning text-dark', icon: 'bi-exclamation-triangle-fill'},
  info: {bg: 'bg-info text-dark', icon: 'bi-info-circle-fill'},
};

export const SystemHealth: FunctionComponent = () => {
  const {t} = useTranslation();
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jsonRequest(SYSTEM_HEALTH);
      const json = await response.json();
      setData(json);
    } catch {
      setError(t('An error occurred while loading data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const filtered = data?.anomalies.filter(a => filter === 'all' || a.severity === filter) || [];

  const detailMessage = (anomaly: Anomaly): string => {
    return t(anomaly.messageKey, anomaly.messageParams || {});
  };

  return (
    <DashboardLayout
      title={t("System Health")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('System Health'), current: true},
      ]}
    >
      {/* Summary cards */}
      {data && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-start border-danger border-4">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-octagon-fill text-danger fs-3 me-3"></i>
                  <div>
                    <div className="text-muted small">{t('Critical')}</div>
                    <div className="fs-4 fw-bold">{data.summary.critical}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-start border-warning border-4">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle-fill text-warning fs-3 me-3"></i>
                  <div>
                    <div className="text-muted small">{t('Warning')}</div>
                    <div className="fs-4 fw-bold">{data.summary.warning}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-start border-info border-4">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-info-circle-fill text-info fs-3 me-3"></i>
                  <div>
                    <div className="text-muted small">{t('Info')}</div>
                    <div className="fs-4 fw-bold">{data.summary.info}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-start border-success border-4">
              <div className="card-body py-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-clock text-success fs-3 me-3"></i>
                  <div>
                    <div className="text-muted small">{t('Last Scan')}</div>
                    <div className="fs-6 fw-bold">
                      {new Date(data.summary.lastScan).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter + Refresh */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body py-3">
              <div className="d-flex align-items-center gap-2">
                <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFilter('all')}>
                  {t('All')} ({data ? data.anomalies.length : 0})
                </button>
                <button className={`btn btn-sm ${filter === 'critical' ? 'btn-danger' : 'btn-outline-danger'}`} onClick={() => setFilter('critical')}>
                  {t('Critical')} ({data?.summary.critical || 0})
                </button>
                <button className={`btn btn-sm ${filter === 'warning' ? 'btn-warning' : 'btn-outline-warning'}`} onClick={() => setFilter('warning')}>
                  {t('Warning')} ({data?.summary.warning || 0})
                </button>
                <button className={`btn btn-sm ${filter === 'info' ? 'btn-info' : 'btn-outline-info'}`} onClick={() => setFilter('info')}>
                  {t('Info')} ({data?.summary.info || 0})
                </button>
                <div className="ms-auto">
                  <button className="btn btn-sm btn-outline-secondary" onClick={fetchHealth} disabled={loading}>
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i> {t('Refresh')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anomalies table */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">{t('Loading...')}</span>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-check-circle text-success fs-1 d-block mb-2"></i>
                  {filter === 'all'
                    ? t('No anomalies detected — system is healthy')
                    : t('No anomalies for this filter')}
                </div>
              ) : (
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th style={{width: '100px'}}>{t('Severity')}</th>
                      <th style={{width: '100px'}}>{t('Category')}</th>
                      <th>{t('Name')}</th>
                      <th>{t('Detail')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(anomaly => {
                      const config = severityConfig[anomaly.severity as keyof typeof severityConfig]
                        ?? {bg: 'bg-secondary', icon: 'bi-question-circle'};
                      return (
                        <tr key={anomaly.id}>
                          <td>
                            <span className={`badge ${config.bg}`}>
                              <i className={`bi ${config.icon} me-1`}></i>
                              {t(anomaly.severity === 'critical' ? 'Critical' : anomaly.severity === 'warning' ? 'Warning' : 'Info')}
                            </span>
                          </td>
                          <td>{t(anomaly.category)}</td>
                          <td className="fw-semibold">{anomaly.title}</td>
                          <td className="text-muted">{detailMessage(anomaly)}</td>
                        </tr>
                      );
                    })}
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
