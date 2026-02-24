import {useEffect, useState} from "react";
import {
  DEVICE_LIST,
  DISCOUNT_LIST,
  PAYMENT_TYPE_LIST,
  PRODUCT_LIST,
  SETTING_LIST,
  TAX_LIST
} from "../routing/routes/backend.app";
import localforage from '../../lib/localforage/localforage';
import {jsonRequest} from "../request/request";
import {Product} from "../model/product";
import {Discount} from "../model/discount";
import {Tax} from "../model/tax";
import {PaymentType} from "../model/payment.type";
import {Device} from "../model/device";
import {Setting} from "../model/setting";
import { message as AntMessage} from 'antd';
import {useDispatch} from "react-redux";
import {progressAction} from "../../duck/progress/progress.action";

interface ReturnAction{
  load: () => void;
}

export interface HomeProps {
  list: {
    list: Product[];
  },
  discountList: {
    list: Discount[];
  },
  taxList: {
    list: Tax[];
  },
  paymentTypesList: {
    list: PaymentType[];
  },
  deviceList: {
    list: Device[];
  },
  settingList: {
    list: Setting[];
  }
}

interface ReturnState{
  list: HomeProps['list'];
  discountList: HomeProps['discountList'];
  taxList: HomeProps['taxList'];
  paymentTypesList: HomeProps['paymentTypesList'];
  deviceList: HomeProps['deviceList'];
  settingList: HomeProps['settingList']
}

export const initialData = {
  list: []
};

// Cache max age: 30 minutes — after this, cached data is ignored on load
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;

interface CachedData<T> {
  list: T[];
  _cachedAt?: number;
}

export const useLoadData = (): [ReturnState, ReturnAction] => {
  const [list, setList] = useState<HomeProps['list']>(initialData);
  const [discountList, setDiscountList] = useState<HomeProps['discountList']>(initialData);
  const [taxList, setTaxList] = useState<HomeProps['taxList']>(initialData);
  const [paymentTypesList, setPaymentTypesList] = useState<HomeProps['paymentTypesList']>(initialData);
  const [deviceList, setDeviceList] = useState<HomeProps['deviceList']>(initialData);
  const [settingList, setSettingList] = useState<HomeProps['settingList']>(initialData);
  const dispatch = useDispatch();

  const loadProducts = async () => {
    const limit = 100;
    // Fetch first page to get total count
    const firstRes = await jsonRequest(`${PRODUCT_LIST}?itemsPerPage=${limit}&page=1&isActive=true`);
    const firstData = await firstRes.json();
    const total = firstData['hydra:totalItems'] || 0;
    let allProducts: Product[] = [...firstData['hydra:member']];

    const totalPages = Math.ceil(total / limit);

    if (totalPages > 1) {
      // Load remaining pages in parallel (batches of 3 to avoid overwhelming server)
      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      for (let i = 0; i < remaining.length; i += 3) {
        const batch = remaining.slice(i, i + 3);
        const results = await Promise.all(
          batch.map(page =>
            jsonRequest(`${PRODUCT_LIST}?itemsPerPage=${limit}&page=${page}&isActive=true`)
              .then(r => r.json())
          )
        );
        results.forEach(r => allProducts.push(...(r['hydra:member'] || [])));
      }
    }

    setList({ list: allProducts });
    await localforage.setItem('list', { list: allProducts, _cachedAt: Date.now() });
  };

  const loadJsonList = async <T>(
    key: string,
    url: string,
    setter: (val: { list: T[] }) => void,
    label: string
  ) => {
    // Show cached data immediately while refreshing (only if fresh enough)
    const cached: CachedData<T> | null = await localforage.getItem(key);
    const isFresh = cached?._cachedAt && (Date.now() - cached._cachedAt) < CACHE_MAX_AGE_MS;
    if (cached && isFresh) setter(cached);

    dispatch(progressAction(label));
    try {
      const res = await jsonRequest(url);
      const json = await res.json();
      json.list = json['hydra:member'];
      delete json['hydra:member'];
      json._cachedAt = Date.now();
      setter(json);
      await localforage.setItem(key, json);
    } catch (e) {
      // If API fails, show any cached data (even stale) as fallback
      if (cached && !isFresh) setter(cached);
      if (!cached) throw e;
    }
  };

  const loadData = async () => {
    // Products: show fresh cache immediately, always refresh from API
    const cachedList: CachedData<Product> | null = await localforage.getItem('list');
    const isListFresh = cachedList?._cachedAt && (Date.now() - cachedList._cachedAt) < CACHE_MAX_AGE_MS;
    if (cachedList && isListFresh) setList(cachedList);
    dispatch(progressAction('Products'));
    try {
      await loadProducts();
    } catch (e) {
      if (!cachedList) throw e;
    }

    // Load secondary data in parallel (all independent)
    await Promise.all([
      loadJsonList<Discount>('discountList', `${DISCOUNT_LIST}?isActive=true`, setDiscountList, 'Discounts'),
      loadJsonList<Tax>('taxList', `${TAX_LIST}?isActive=true`, setTaxList, 'Taxes'),
      loadJsonList<PaymentType>('paymentTypesList', `${PAYMENT_TYPE_LIST}?isActive=true`, setPaymentTypesList, 'Payment types'),
      loadJsonList<Device>('deviceList', `${DEVICE_LIST}?isActive=true`, setDeviceList, 'Devices'),
      loadJsonList<Setting>('settingList', SETTING_LIST, setSettingList, 'Settings'),
    ]);

    dispatch(progressAction('Done'));
  };

  useEffect(() => {
    loadData();
  }, []);

  return [
    {
      list, discountList, paymentTypesList, taxList, deviceList, settingList
    }, {
      load: loadData
    }
  ];
};
