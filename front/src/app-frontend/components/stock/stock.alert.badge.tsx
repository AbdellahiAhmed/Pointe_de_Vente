import { useQuery } from '@tanstack/react-query';
import { Badge, Tooltip } from 'antd';
import { jsonRequest } from '../../../api/request/request';
import { STOCK_ALERTS } from '../../../api/routing/routes/backend.app';
import { useSelector } from 'react-redux';
import { getStore } from '../../../duck/store/store.selector';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { STOCK_ALERTS_PAGE } from '../../routes/frontend.routes';

export const StockAlertBadge = () => {
  const store = useSelector(getStore);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data } = useQuery(
    ['stock-alerts', store?.id],
    async () => {
      const res = await jsonRequest(STOCK_ALERTS + '?store=' + store?.id);
      return res.json();
    },
    {
      refetchInterval: 60_000,
      enabled: !!store?.id,
      refetchOnWindowFocus: false,
    }
  );

  const count = data?.count ?? 0;

  return (
    <Tooltip title={t('Low Stock Alerts')}>
      <button
        className="btn btn-lg"
        onClick={() => navigate(STOCK_ALERTS_PAGE)}
        style={{ cursor: 'pointer' }}
      >
        <Badge count={count} overflowCount={99} offset={[-5, 5]}>
          <i className="fa fa-exclamation-triangle text-warning" style={{ fontSize: '1.2rem' }}></i>
        </Badge>
      </button>
    </Tooltip>
  );
};
