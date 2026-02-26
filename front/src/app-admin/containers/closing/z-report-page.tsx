import React, {FunctionComponent, useEffect, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {CLOSING_LIST, CLOSING_ZREPORT_DATA} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, Z_REPORTS} from "../../routes/frontend.routes";
import {pdf} from '@react-pdf/renderer';
import ZReportDocument from './ZReportDocument';
import {generateZReportArabicPdf} from './generateZReportArabicPdf';
import {Closing} from "../../../api/model/closing";
import {notify} from "../../../app-common/components/confirm/notification";

export const ZReportPage: FunctionComponent = () => {
  const {t} = useTranslation();
  const [closings, setClosings] = useState<Closing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchClosings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await jsonRequest(CLOSING_LIST);
      const json = await response.json();
      // Filter to only show closed sessions with Z-Report
      const closed = (json.list || []).filter(
        (c: Closing) => c.closedAt && c.zReportNumber
      );
      setClosings(closed);
    } catch (e) {
      setError(t('An error occurred while loading data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosings();
  }, []);

  const downloadPdf = async (closingId: string, lang: 'fr' | 'ar') => {
    setDownloading(`${closingId}-${lang}`);
    try {
      const res = await jsonRequest(CLOSING_ZREPORT_DATA.replace(':id', closingId));
      const snapshot = await res.json();
      // Arabic: use html2pdf (browser renders Arabic perfectly)
      // French: use react-pdf (vector PDF with correct Latin metrics)
      const blob = lang === 'ar'
        ? await generateZReportArabicPdf(snapshot)
        : await pdf(<ZReportDocument data={snapshot} lang={lang} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `z-report-${snapshot.zReportNumber}-${lang}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notify({type: 'error', description: t('Failed to download Z-Report PDF.')});
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <DashboardLayout
      title={t("Z-Reports")}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Reports')},
        {title: t('Z-Reports'), current: true},
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
      ) : closings.length > 0 ? (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{t('Closed Sessions')}</h5>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>{t('Z-Report')} #</th>
                      <th>{t('Terminal')}</th>
                      <th>{t('Store')}</th>
                      <th>{t('Date Range')}</th>
                      <th>{t('Closed By')}</th>
                      <th>{t('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closings.map((c) => (
                      <tr key={c.id}>
                        <td className="fw-bold">Z-{c.zReportNumber}</td>
                        <td>{c.terminal?.code || '-'}</td>
                        <td>{c.store?.name || '-'}</td>
                        <td>
                          {formatDate(c.dateFrom?.datetime)} - {formatDate(c.dateTo?.datetime)}
                        </td>
                        <td>{c.closedBy?.displayName || '-'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary me-2"
                            onClick={() => downloadPdf(c.id, 'fr')}
                            disabled={downloading === `${c.id}-fr`}
                          >
                            <i className="bi bi-file-earmark-pdf me-1"></i>
                            {downloading === `${c.id}-fr` ? '...' : 'PDF FR'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => downloadPdf(c.id, 'ar')}
                            disabled={downloading === `${c.id}-ar`}
                          >
                            <i className="bi bi-file-earmark-pdf me-1"></i>
                            {downloading === `${c.id}-ar` ? '...' : 'PDF AR'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="bi bi-file-earmark-pdf display-4 text-muted"></i>
                <p className="text-muted mt-3">{t('No closed sessions found')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
