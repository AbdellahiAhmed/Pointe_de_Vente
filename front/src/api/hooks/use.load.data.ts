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

export const useLoadData = (): [ReturnState, ReturnAction] => {
  const [list, setList] = useState<HomeProps['list']>(initialData);
  const [discountList, setDiscountList] = useState<HomeProps['discountList']>(initialData);
  const [taxList, setTaxList] = useState<HomeProps['taxList']>(initialData);
  const [paymentTypesList, setPaymentTypesList] = useState<HomeProps['paymentTypesList']>(initialData);
  const [deviceList, setDeviceList] = useState<HomeProps['deviceList']>(initialData);
  const [settingList, setSettingList] = useState<HomeProps['settingList']>(initialData);
  const dispatch = useDispatch();

  const loadProducts = async (offset = 1, limit = 100, accumulator: Product[] = []) => {
    const res = await jsonRequest(`${PRODUCT_LIST}?itemsPerPage=${limit}&page=${offset}&isActive=true`);
    const l = await res.json();
    const merged = [...accumulator, ...l['hydra:member']];

    setList({ list: merged });
    await localforage.setItem('list', { list: merged });

    if(l['hydra:member'].length > 0) {
      await loadProducts(offset + 1, limit, merged);
    }
  };

  const loadJsonList = async <T>(
    key: string,
    url: string,
    setter: (val: { list: T[] }) => void,
    label: string
  ) => {
    // Show cached data immediately while refreshing
    const cached: { list: T[] } | null = await localforage.getItem(key);
    if (cached) setter(cached);

    dispatch(progressAction(label));
    try {
      const res = await jsonRequest(url);
      const json = await res.json();
      json.list = json['hydra:member'];
      delete json['hydra:member'];
      setter(json);
      await localforage.setItem(key, json);
    } catch (e) {
      // If API fails, cached data is still shown
      if (!cached) throw e;
    }
  };

  const loadData = async () => {
    // Products: always refresh from API (paginated loader)
    const cachedList: HomeProps['list'] | null = await localforage.getItem('list');
    if (cachedList) setList(cachedList);
    dispatch(progressAction('Products'));
    try {
      await loadProducts();
    } catch (e) {
      if (!cachedList) throw e;
    }

    await loadJsonList<Discount>('discountList', `${DISCOUNT_LIST}?isActive=true`, setDiscountList, 'Discounts');
    await loadJsonList<Tax>('taxList', `${TAX_LIST}?isActive=true`, setTaxList, 'Taxes');
    await loadJsonList<PaymentType>('paymentTypesList', `${PAYMENT_TYPE_LIST}?isActive=true`, setPaymentTypesList, 'Payment types');
    await loadJsonList<Device>('deviceList', `${DEVICE_LIST}?isActive=true`, setDeviceList, 'Devices');
    await loadJsonList<Setting>('settingList', SETTING_LIST, setSettingList, 'Settings');

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
