import React, {FC, PropsWithChildren, useEffect, useMemo, useState} from "react";
import {Button} from "../../../app-common/components/input/button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEye, faArrowDown, faArrowUp} from "@fortawesome/free-solid-svg-icons";
import {Modal} from "../../../app-common/components/modal/modal";
import {Customer} from "../../../api/model/customer";
import {DateTime} from "luxon";
import classNames from "classnames";
import * as _ from 'lodash';
import {OrderPayment} from "../../../api/model/order.payment";
import {ViewOrder} from "../sale/view.order";
import {useTranslation} from "react-i18next";
import {withCurrency} from "../../../lib/currency/currency";


interface Props extends PropsWithChildren {
  customer: Customer;
  onCreate?: () => void;
}

export const CustomerPayments: FC<Props> = ({
  customer: customerProp, children
}) => {
  const {t, i18n} = useTranslation();
  const [modal, setModal] = useState(false);

  const [customer, setCustomer] = useState<Customer>(customerProp);

  useEffect(() => {
    setCustomer(customerProp);
  }, [customerProp]);

  const diff = useMemo(() => {
    return customer.outstanding;
  }, [customer]);

  const list = useMemo(() => {
    let list: any = [];
    customer.payments.forEach(item => {
      list.push({...item, _type: 'payment'});
    });
    customer.orders.forEach(item => {
      list.push({...item, _type: 'order'});
    });

    list = _.sortBy(list, (item) => {
      return item.createdAt;
    }).reverse();

    return list;
  }, [customer]);

  return (
    <>
      <Button variant="primary" onClick={() => {
        setModal(true);
      }}>
        {children || t('History')}
      </Button>

      <Modal open={modal} onClose={() => {
        setModal(false);
      }} title={`${t("Payment history of")} ${customer.name}`}>

        <div className="grid grid-cols-5 gap-3 mb-5">
          <div className="border border-slate-300 bg-slate-50 p-4 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">{t("Opening Balance")}</div>
            <div className="text-lg font-bold text-slate-800" dir="ltr">{withCurrency(customer.openingBalance)}</div>
          </div>
          <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
            <div className="text-xs text-blue-600 mb-1">{t("Total Credit Sale")}</div>
            <div className="text-lg font-bold text-blue-800" dir="ltr">{withCurrency(customer.sale)}</div>
          </div>
          <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
            <div className="text-xs text-green-600 mb-1">{t("Total Payments")}</div>
            <div className="text-lg font-bold text-green-800" dir="ltr">{withCurrency(customer.paid)}</div>
          </div>
          <div className={classNames(
            "border p-4 rounded-lg",
            diff > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
          )}>
            <div className={classNames("text-xs mb-1", diff > 0 ? 'text-red-600' : 'text-green-600')}>{t("Outstanding")}</div>
            <div className={classNames("text-lg font-bold", diff > 0 ? 'text-red-800' : 'text-green-800')} dir="ltr">{withCurrency(diff)}</div>
          </div>
          <div className={classNames(
            "border p-4 rounded-lg",
            customer?.creditLimit && diff > 0 ? 'border-red-200 bg-red-50' : 'border-slate-300 bg-slate-50'
          )}>
            <div className={classNames("text-xs mb-1", customer?.creditLimit && diff > 0 ? 'text-red-600' : 'text-slate-500')}>{t("Credit limit")}</div>
            <div className={classNames("text-lg font-bold", customer?.creditLimit && diff > 0 ? 'text-red-800' : 'text-slate-800')} dir="ltr">
              {customer?.creditLimit ? withCurrency(customer?.creditLimit) : t('no limit')}
            </div>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="text-center text-slate-400 py-12 text-lg">
            {t("No transactions found")}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t("Time")}</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t("Type")}</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t("Amount")}</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t("Description")}</th>
                <th className="px-4 py-3 text-sm font-semibold text-slate-600">{t("Order#")}</th>
              </tr>
              </thead>
              <tbody>
              {list.map((item: any, index: number) => {
                const isPayment = item._type === 'payment';
                return (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {DateTime.fromISO(item.createdAt).setLocale(i18n.language).toLocaleString(DateTime.DATETIME_MED)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={classNames(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        isPayment
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      )}>
                        <FontAwesomeIcon icon={isPayment ? faArrowDown : faArrowUp} className="text-[10px]" />
                        {isPayment ? t("Payment") : t("Sale")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" dir="ltr">
                      {isPayment ? (
                        <span className="text-green-700">{withCurrency(item.amount)}</span>
                      ) : (
                        <div className="space-y-1">
                          {item.payments.map((p: OrderPayment, idx: number) => (
                            <div key={idx} className="text-blue-700">
                              {withCurrency(p.received)}
                              <span className="text-slate-400 text-xs ms-1">({p?.type?.name})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {isPayment ? (
                        item.description || '—'
                      ) : (
                        t('Sale')
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.orderId && !isPayment && (
                        <ViewOrder order={item}>
                          <FontAwesomeIcon icon={faEye} className="me-1"/> {item.orderId}
                        </ViewOrder>
                      )}
                      {item.order && (
                        <ViewOrder order={item.order}>
                          <FontAwesomeIcon icon={faEye} className="me-1"/> {item.order.orderId}
                        </ViewOrder>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
};
