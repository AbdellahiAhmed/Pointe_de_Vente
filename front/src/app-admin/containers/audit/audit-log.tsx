import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {AUDIT_LOG} from "../../../api/routing/routes/backend.app";
import {DASHBOARD} from "../../routes/frontend.routes";

interface AuditEntry {
  id: number;
  action: string;
  loggedAt: string;
  objectId: string;
  objectClass: string;
  version: number;
  data: Record<string, any> | null;
  username: string | null;
}

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-success',
  update: 'bg-warning text-dark',
  remove: 'bg-danger',
};

const ENTITY_TYPES = [
  'Product', 'Order', 'Customer', 'User', 'Store',
  'Category', 'Payment', 'Discount', 'Tax', 'Expense',
];

export const AuditLog: FunctionComponent = () => {
  const {t} = useTranslation();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [username, setUsername] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const limit = 50;

  const fetchEntries = async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params: string[] = [`page=${targetPage}`, `limit=${limit}`];
      if (entity) params.push(`entity=${entity}`);
      if (action) params.push(`action=${action}`);
      if (username) params.push(`username=${username}`);
      if (dateFrom) params.push(`dateFrom=${dateFrom}`);
      if (dateTo) params.push(`dateTo=${dateTo}`);

      const url = `${AUDIT_LOG}?${params.join('&')}`;
      const response = await jsonRequest(url);
      const json = await response.json();
      setEntries(json.list || []);
      setTotal(json.total || 0);
      setPage(json.page || 1);
      setPages(json.pages || 1);
    } catch {
      setError(t('An error occurred while loading data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries(1);
  }, []);

  const handleFilter = () => fetchEntries(1);

  const formatData = (data: Record<string, any> | null): string => {
    if (!data || Object.keys(data).length === 0) return '-';
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  };

  return (
    <DashboardLayout
      title={t("Audit Log")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Administration')},
        {title: t('Audit Log'), current: true},
      ]}
    >
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row align-items-end g-3">
                <div className="col-md-2">
                  <label className="form-label">{t('Entity')}</label>
                  <select className="form-select" value={entity} onChange={e => setEntity(e.target.value)}>
                    <option value="">{t('All')}</option>
                    {ENTITY_TYPES.map(e => (
                      <option key={e} value={e}>{t(e)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('Action')}</label>
                  <select className="form-select" value={action} onChange={e => setAction(e.target.value)}>
                    <option value="">{t('All')}</option>
                    <option value="create">{t('Create')}</option>
                    <option value="update">{t('Update')}</option>
                    <option value="remove">{t('Delete')}</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('User')}</label>
                  <input type="text" className="form-control" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('Username...')} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('Date From')}</label>
                  <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">{t('Date To')}</label>
                  <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button className="btn btn-primary" onClick={handleFilter} disabled={loading}>
                    {t('Filter')}
                  </button>
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
              {error && <div className="alert alert-danger">{error}</div>}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">{t('Loading...')}</span>
                  </div>
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  {t('No audit entries found')}
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead>
                        <tr>
                          <th>{t('Date')}</th>
                          <th>{t('User')}</th>
                          <th>{t('Action')}</th>
                          <th>{t('Entity')}</th>
                          <th>{t('ID')}</th>
                          <th>{t('Changes')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map(entry => (
                          <tr key={entry.id}>
                            <td className="text-nowrap">{entry.loggedAt}</td>
                            <td>{entry.username || '-'}</td>
                            <td>
                              <span className={`badge ${ACTION_BADGE[entry.action] || 'bg-secondary'}`}>
                                {t(entry.action === 'create' ? 'Create' : entry.action === 'update' ? 'Update' : entry.action === 'remove' ? 'Delete' : entry.action)}
                              </span>
                            </td>
                            <td>{entry.objectClass}</td>
                            <td>{entry.objectId}</td>
                            <td style={{maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                              <small title={formatData(entry.data)}>{formatData(entry.data)}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="text-muted">
                      {t('Total')}: {total} &mdash; {t('Page')} {page} {t('of')} {pages}
                    </span>
                    <div className="btn-group">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchEntries(page - 1)} disabled={page <= 1 || loading}>
                        {t('Previous')}
                      </button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => fetchEntries(page + 1)} disabled={page >= pages || loading}>
                        {t('Next')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
