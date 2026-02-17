import { Product } from "../../../../api/model/product";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Modal } from "../../../../app-common/components/modal/modal";
import { Tab, TabContent, TabControl, TabNav } from "../../../../app-common/components/tabs/tabs";
import { withCurrency } from "../../../../lib/currency/currency";
import { createColumnHelper } from "@tanstack/react-table";
import { OrderItem, OrderItemSimple } from "../../../../api/model/order.item";
import { ImportItems } from "./import.items";
import { ExportItems } from "./export.items";
import { TableComponent } from "../../../../app-common/components/table/table";
import useApi from "../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../api/model/hydra";
import { ORDER_PRODUCTS_LIST, PRODUCT_LIST, PURCHASE_ITEM_LIST } from "../../../../api/routing/routes/backend.app";
import { DateTime } from "luxon";
import { DynamicValue } from "../../../../app-common/components/dynamic.value/dynamic.value";
import { PurchaseItem } from "../../../../api/model/purchase.item";

interface Props{
  product: Product;
  show?: boolean;
  onClose?: () => void;
}

export const ItemComponent = ({
  product, show, onClose
}: Props) => {
  const {t} = useTranslation();
  const [modal, setModal] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setModal(true)}>
        <FontAwesomeIcon icon={faEye} />
      </Button>

      <Modal
        title={product.name}
        onClose={() => setModal(false)}
        shouldCloseOnEsc={true}
        open={modal}
      >
        <TabControl
          defaultTab="information"
          render={({isTabActive, setActiveTab}) => (
            <>
              <TabNav position={'top'}>
                <Tab isActive={isTabActive('information')} onClick={() => setActiveTab('information')}>{t("Item Information")}</Tab>
                <Tab isActive={isTabActive('stores')} onClick={() => setActiveTab('stores')}>{t("Stores")}</Tab>
                <Tab isActive={isTabActive('variants')} onClick={() => setActiveTab('variants')}>{t("Variants")}</Tab>
                <Tab isActive={isTabActive('sales')} onClick={() => setActiveTab('sales')}>{t("Sales")}</Tab>
                <Tab isActive={isTabActive('purchases')} onClick={() => setActiveTab('purchases')}>{t("Purchases")}</Tab>
              </TabNav>
              <TabContent isActive={isTabActive('information')}>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <table className="table table-hover">
                      <tbody>
                      <tr>
                        <th className="text-right w-[200px]">{t("Item name")}</th>
                        <td>{product.name}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Barcode")}</th>
                        <td>{product.barcode}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Sale Price")}</th>
                        <td>{withCurrency(product.basePrice)} / {product.saleUnit}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("PMP (Avg. Cost)")}</th>
                        <td>{withCurrency(product.cost)} / {product.purchaseUnit}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Taxes")}</th>
                        <td>
                          {product.taxes.map(item => (
                            <span className="badge bg-primary-100 p-3 rounded-full mr-2">{item.name} {item.rate}%</span>
                          ))}
                        </td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex-1">
                    <table className="table table-hover">
                      <tbody>
                      <tr>
                        <th className="text-right w-[200px]">{t("Department")}</th>
                        <td>
                          <span className="badge bg-primary-100 p-3 rounded-full mr-2">{product?.department?.name}</span>
                        </td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Brands")}</th>
                        <td>{product.brands.map(item => (
                          <span className="badge bg-primary-100 p-3 rounded-full mr-2">{item.name}</span>
                        ))}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Categories")}</th>
                        <td>{product.categories.map(item => (
                          <span className="badge bg-primary-100 p-3 rounded-full mr-2">{item.name}</span>
                        ))}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Suppliers")}</th>
                        <td>{product.suppliers.map(item => (
                          <span className="badge bg-primary-100 p-3 rounded-full mr-2">{item.name}</span>
                        ))}</td>
                      </tr>
                      <tr>
                        <th className="text-right w-[200px]">{t("Terminals")}</th>
                        <td>{product.terminals.map(item => (
                          <span className="badge bg-primary-100 p-3 rounded-full mr-2">{item.code}</span>
                        ))}</td>
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabContent>
              <TabContent isActive={isTabActive('variants')}>
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t("Name")}</th>
                      <th>{t("Barcode")}</th>
                      <th>{t("Price")}</th>
                      <th>{t("Stock remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                  {product.variants.map(item => (
                    <tr>
                      <td>{item.attributeValue}</td>
                      <td>{item.barcode}</td>
                      <td>{item.price}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </TabContent>
              <TabContent isActive={isTabActive('sales')}>
                <ItemSales product={product} />
              </TabContent>
              <TabContent isActive={isTabActive('purchases')}>
                <ItemPurchases product={product} />
              </TabContent>
              <TabContent isActive={isTabActive('stores')}>
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>{t("Store")}</th>
                      <th>{t("Stock")}</th>
                      <th>{t("Location")}</th>
                      <th>{t("Re Order Level")}</th>
                    </tr>
                  </thead>
                  <tbody>
                  {product.stores.map(store => (
                    <tr key={store.id}>
                      <td>{store.store.name}</td>
                      <td>{store.quantity}</td>
                      <td>{store.location}</td>
                      <td>{store.reOrderLevel}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </TabContent>
            </>
          )}
          position="top"
        />
      </Modal>
    </>
  )
}

interface ItemSaleProps {
  product: Product
}
export const ItemSales = ({
  product
}: ItemSaleProps) => {
  const {t} = useTranslation();
  const useLoadHook = useApi<HydraCollection<OrderItemSimple>>('order_products', `${ORDER_PRODUCTS_LIST}?product.id=${product['@id']}`, {}, '', 'asc', 1, 1);

  const columnHelper = createColumnHelper<OrderItemSimple>();
  const columns: any[] = [
    columnHelper.accessor('order', {
      header: t('Order#'),
      cell: info => (
        <DynamicValue url={info.getValue()} cacheKey={info.getValue() || 'order'} displayLoader={true} properties={['orderId']} />
      )
    }),
    columnHelper.accessor('variant', {
      header: t('Variant'),
      cell: info => <DynamicValue url={info.getValue()} cacheKey={info.getValue() || 'variant'} displayLoader={true} properties={['attributeValue']} />
    }),
    columnHelper.accessor('createdAt', {
      header: t('Ordered at'),
      cell: info => DateTime.fromISO(info.getValue()).toFormat(import.meta.env.VITE_DATE_TIME_FORMAT)
    }),
    columnHelper.accessor('quantity', {
      header: t('Quantity')
    }),
    columnHelper.accessor('price', {
      header: t('Price'),
      cell: info => withCurrency(info.getValue())
    }),
    columnHelper.accessor('discount', {
      header: t('Discount'),
      cell: info => withCurrency(info.getValue()),
    }),
    columnHelper.accessor('taxesTotal', {
      header: t('Taxes'),
      cell: info => withCurrency(info.getValue()),
      enableColumnFilter: false,
      enableSorting: false
    }),
    columnHelper.accessor('id', {
      header: t('Total'),
      cell: info => withCurrency((info.row.original.price * info.row.original.quantity) - info.row.original.discount + info.row.original.taxesTotal),
      enableColumnFilter: false,
      enableSorting: false
    })
  ];

  return (
    <TableComponent
      columns={columns}
      useLoadList={useLoadHook}
      loaderLineItems={7}
      loaderLines={10}
    />
  )
}


interface ItemPurchaseProps {
  product: Product
}
export const ItemPurchases = ({
  product
}: ItemPurchaseProps) => {
  const {t} = useTranslation();
  const useLoadHook = useApi<HydraCollection<PurchaseItem>>('purchase_products', `${PURCHASE_ITEM_LIST}?item.id=${product['@id']}`, {}, '', 'asc', 1, 1);

  const columnHelper = createColumnHelper<PurchaseItem>();
  const columns: any[] = [
    columnHelper.accessor('purchase.@id', {
      id: 'purchase.purchaseNumber',
      header: t('Purchase#'),
      cell: info => <DynamicValue cacheKey={info.getValue() || 'purchase_product'} url={info.getValue()} properties={['purchaseNumber']} displayLoader={true} />
    }),
    columnHelper.accessor('quantityRequested', {
      header: t('Quantity Requested')
    }),
    columnHelper.accessor('quantity', {
      header: t('Quantity')
    }),
    columnHelper.accessor('purchasePrice', {
      header: t('Price'),
      cell: info => withCurrency(info.getValue())
    }),
    columnHelper.accessor('id', {
      header: t('Total'),
      cell: info => withCurrency((Number(info.row.original.purchasePrice) * Number(info.row.original.quantity))),
      enableColumnFilter: false,
      enableSorting: false
    }),
    columnHelper.accessor('createdAt', {
      header: t('Created at'),
      cell: info => DateTime.fromISO(info.getValue()).toFormat(import.meta.env.VITE_DATE_TIME_FORMAT)
    })
  ];

  return (
    <TableComponent
      columns={columns}
      useLoadList={useLoadHook}
      loaderLineItems={6}
      loaderLines={10}
    />
  )
}
