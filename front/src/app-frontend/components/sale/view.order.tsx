import React, {FunctionComponent, PropsWithChildren, useMemo, useState} from "react";
import {Order} from "../../../api/model/order";
import {Button} from "../../../app-common/components/input/button";
import {Modal} from "../../../app-common/components/modal/modal";
import {OrderItem} from "../../../api/model/order.item";
import { withCurrency } from "../../../lib/currency/currency";
import {useTranslation} from "react-i18next";

interface ViewOrderProps extends PropsWithChildren{
  order: Order;
}

export const ViewOrder: FunctionComponent<ViewOrderProps> = ({
  order, children
}) => {
  const {t} = useTranslation();
  const [modal, setModal] = useState(false);

  const itemTax = (item: OrderItem) => {
    return item.taxesTotal
  };

  const itemsTotal = useMemo(() => {
    return (order.items ?? []).reduce((prev, item) => (
      (prev + (Number(item.quantity) * Number(item.price))) + Number(item.taxesTotal ?? 0) - Number(item.discount ?? 0)
    ), 0);
  }, [order]);

  const orderTotal = useMemo(() => {
    return Number(itemsTotal) + Number(order?.adjustment || 0) - Number(order?.discount?.amount || 0);
  }, [order, itemsTotal]);

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setModal(true)}>
        {children}
      </Button>
      <Modal open={modal} onClose={() => {
        setModal(false);
      }} title={`${t("Order#")} ${order.orderId}`}>
        <div className="grid grid-cols-6 md:grid-cols-4 gap-3 mb-5">
          <div className="border border-gray-500 p-5 rounded">
            <div className="text-2xl" dir="ltr">{`+ ${withCurrency(itemsTotal)}`}</div>
            {t("Items total with tax")}
          </div>
          <div className="border border-gray-500 p-5 rounded">
            <div className="text-2xl" dir="ltr">{`+ ${withCurrency(order.tax ? order.tax.amount : 0)}`}</div>
            {t("Tax")}
          </div>
          <div className="border border-gray-500 p-5 rounded">
            <div className="text-2xl" dir="ltr">{`- ${withCurrency(order.discount ? (order.discount.amount) : 0)}`}</div>
            {t("Discount")}
          </div>
          <div className="border border-gray-500 p-5 rounded">
            <div className="text-2xl" dir="ltr">{withCurrency(order.adjustment ? order.adjustment : 0)}</div>
            {t("Adjustment")}
          </div>
          <div className="border border-success-500 p-5 bg-success-100 text-success-900 rounded font-bold">
            <div className="text-2xl" dir="ltr">{`= ${withCurrency(orderTotal)}`}</div>
            {t("Total")}
          </div>
          <div className="border border-primary-500 p-5 bg-primary-100 text-primary-900 rounded">
            <div className="text-sm font-bold uppercase">{t("Payments")}</div>
            <ul className="font-normal">
              {(order.payments ?? []).map(item => (
                <li key={item["@id"]} className="font-bold">{item.type?.name ?? '-'}: <span className="float-end">{withCurrency(item.received ?? 0)}</span></li>
              ))}
            </ul>
          </div>
        </div>

        {order.notes && (
          <>
            <h4 className="text-lg">{t("Notes")}</h4>
            <p className="mb-5">{order.notes}</p>
          </>
        )}

        <table className="table border border-collapse">
          <thead>
          <tr>
            <th className="text-start">{t("Item")}</th>
            <th className="text-end">{t("Quantity")}</th>
            <th className="text-end">{t("Tax")}</th>
            <th className="text-end">{t("Discount")}</th>
            <th className="text-end">{t("Price")}</th>
            <th className="text-end">{t("Total")}</th>
          </tr>
          </thead>
          <tbody>
          {order.items.map((item, index) => (
            <tr key={index} className="hover:bg-gray-100">
              <td>
                {item.product?.name ?? '-'}
                {item.variant && (
                  <>
                    <br/>
                    {item.variant?.attributeValue}
                  </>
                )}
              </td>
              <td className="text-end">{item.quantity}</td>
              <td className="text-end">
                {withCurrency(itemTax(item))}
              </td>
              <td className="text-end">{withCurrency(item.discount)}</td>
              <td className="text-end">{withCurrency(item.price)}</td>
              <td className="text-end">{withCurrency((item.price * item.quantity) + itemTax(item) - item.discount)}</td>
            </tr>
          ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="text-start">{t("Total")}</th>
              <th className="text-end">{(order.items.reduce((prev, item) => prev + Number(item.quantity), 0))}</th>
              <th></th>
              <th></th>
              <th></th>
              <th className="text-end">{withCurrency(itemsTotal)}</th>
            </tr>
          </tfoot>
        </table>
      </Modal>
    </>
  );
};
