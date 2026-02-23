import {Order} from "../../../api/model/order";
import React, {FC, useEffect, useMemo, useState} from "react";
import {Modal} from "../../../app-common/components/modal/modal";
import {Button} from "../../../app-common/components/input/button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPrint, faEnvelope} from "@fortawesome/free-solid-svg-icons";
import {Setting, SettingTypes} from "../../../api/model/setting";
import localforage from "../../../lib/localforage/localforage";
import {DateTime} from "luxon";
import ReactDOM from "react-dom";
import {Input} from "../../../app-common/components/input/input";
import { createRoot } from "react-dom/client";
import {useTranslation} from "react-i18next";
import {withCurrency} from "../../../lib/currency/currency";

interface SalePrintProps {
  order: Order;
}

export const PrintOrder = (order: Order) => {
  //open print window
  const myWindow: any = window.open('','', 'height: 500;width:500');

  const div = myWindow.document.createElement('div');
  div.id = 'print-root';

  myWindow.document.body.appendChild(div)

  const container = myWindow.document.querySelector('#print-root');
  const root = createRoot(container);
  root.render(<SalePrintMarkup order={order} />);

  myWindow.document.close();
  myWindow.focus();
  setTimeout(() => {
    myWindow.print();
    myWindow.close();
  }, 100)
};

export const SalePrint: FC<SalePrintProps> = (props) => {
  const {t} = useTranslation();
  const [show, setShow] = useState(false);

  const [sendEmail, setSendEmail] = useState(false);

  const isReturn = !!props.order.returnedFrom;

  return (
    <>
      <Button onClick={() => setShow(true)} variant="secondary">
        <FontAwesomeIcon icon={faPrint}/>
      </Button>

      <Modal open={show} onClose={() => {
        setShow(false)
      }} title={isReturn ? t("Print Return Receipt") : t("Duplicate Sale Receipt Print")}>
        <div className="flex justify-center flex-col items-center">
          <SalePrintMarkup order={props.order} />

          <div className="flex flex-row gap-3">
            <Button variant="success" onClick={() => PrintOrder(props.order)}>
              <FontAwesomeIcon icon={faPrint} />
            </Button>
            <Button active={sendEmail} variant="secondary" onClick={() => setSendEmail(!sendEmail)}>
              <FontAwesomeIcon icon={faEnvelope} />
            </Button>
          </div>

          {sendEmail && (
            <form className="mt-3">
              <div className="input-group w-full">
                <Input placeholder={t("Enter comma separated emails")}/>
                <Button variant="primary" type="button">{t("Send")}</Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
};

export const SalePrintMarkup = ({order}: {order: Order}) => {
  const {t} = useTranslation();
  const [settings, setSettings] = useState<Setting[]>([]);

  // Detect if this is a return order
  const isReturn = !!order.returnedFrom;

  // Color scheme: blue for sales, red for returns
  const headerBg = isReturn ? '#fde8e8' : 'rgb(200, 224, 235)';
  const headerColor = isReturn ? '#991b1b' : 'inherit';
  const accentBg = isReturn ? 'rgba(253, 232, 232, 0.18)' : 'rgba(218, 232, 239, 0.18)';

  useEffect(() => {
    localforage.getItem('settings').then((data: any) => {
      if(data) {
        let settings: Setting[] = JSON.parse(data);
        settings = settings.filter(item => item.type === SettingTypes.TYPE_RECEIPT);
        setSettings(settings)
      }
    });
  }, []);

  const itemsTotal = useMemo(() => {
    const raw = order.items.reduce((prev, item) => ((item.price * item.quantity) + item.taxesTotal - item.discount) + prev, 0);
    return isReturn ? Math.abs(raw) : raw;
  }, [order, isReturn]);

  const netTotal = useMemo(() => {
    let amount = order.items.reduce((prev, item) => ((item.price * item.quantity) + item.taxesTotal - item.discount) + prev, 0);
    if(order?.discount && order?.discount?.amount) {
      amount -= order?.discount?.amount
    }

    if(order?.tax && order?.tax?.amount){
      amount += order?.tax?.amount;
    }

    return isReturn ? Math.abs(amount) : amount;
  }, [order, isReturn]);

  const changeDue = useMemo(() => {
    return order.payments.reduce((prev, item) => prev + (item.total - item.received), 0)
  }, [order]);

  const itemsQuantity = useMemo(() => {
    const raw = order.items.reduce((prev, item) => item.quantity + prev, 0);
    return isReturn ? Math.abs(raw) : raw;
  }, [order, isReturn]);

  return (
    <div id="SaleInvoice3InchOffline" style={{width: "3.5in"}}>
      <div
        id="margindiv3inch"
        className="setReceiptWidth3Inch"
        style={{
          border: "none",
          fontSize: 11,
          fontWeight: "normal",
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          margin: 0
        }}
      >
        <img
          id="imgPreview3inch"
          src=""
          alt="logo"
          style={{width: "100%", height: 100, display: "none"}}
        />
        <div
          style={{
            textAlign: "center",
            background: headerBg,
            color: headerColor,
            padding: "6px 6px"
          }}
        >
          <h3
            className="h3Style"
            id="InvoiceCaption3Inch"
            style={{margin: "0 0", color: headerColor}}
          >
            {isReturn ? t("Return Receipt") : t("Sale Receipt")}
          </h3>
          {isReturn && (
            <div style={{fontSize: 9, color: '#991b1b', marginTop: 2}}>
              بون إرجاع
            </div>
          )}
        </div>
        <div
          style={{
            textAlign: "center",
            background: accentBg,
            padding: "5px 5px"
          }}
          id="ShopSection"
        >
          <h3 className="h3Style" id="shopName3Inch" style={{margin: "0 0"}}>
            {t("Shop name")}
          </h3>
          <h5
            className="h5Style"
            id="STNNo3inchid"
            style={{margin: 0, display: 'none'}}
          >
            {t("STN")}:
          </h5>
          <h5
            className="h5Style"
            id="TaxFormation3inchid"
            style={{margin: 0, display: 'none'}}
          >
            {t("Tax Formation")}:
          </h5>
          <h5
            className="h5Style"
            id="FBRPOS3incid"
            style={{margin: 0, display: 'none'}}
          >
            {t("POS No")}:
          </h5>
        </div>
        <div
          style={{
            textAlign: "center",
            background: accentBg,
            padding: "5px 2px"
          }}
        >
          <h4
            className="h4Style"
            style={{margin: "0 0", fontWeight: "normal"}}
            id="RegisterSection"
          >
            <span id="saleId3Inch" style={{float: "left"}}>
              {isReturn ? t("Return #") : t("Receipt #")}: {order.orderId}
            </span>
            <span id="RegisterCode3Inch" style={{float: "right", display: 'none'}}>
              {t("Register")}: RegDF01
            </span>
          </h4>
          <h4
            className="h4Style"
            id="saleDate3Inch"
            style={{
              textAlign: "left",
              margin: "0 0",
              fontWeight: "normal",
              clear: "both"
            }}
          >
            {t("Date")}: {DateTime.fromISO(order.createdAt).toFormat(import.meta.env.VITE_DATE_TIME_FORMAT as string)}
          </h4>
        </div>

        {/* Original order reference for returns */}
        {isReturn && order.returnedFrom && (
          <div style={{
            textAlign: "center",
            background: '#fef2f2',
            padding: '4px 6px',
            borderBottom: '1px dashed #fca5a5',
            fontSize: 11,
            color: '#991b1b',
          }}>
            <strong>{t("Original Order #")}:</strong> {order.returnedFrom.orderId}
          </div>
        )}

        {order.customer && (
          <div id="customerNameOffline_Div3Inch">
            <span>
              <strong>{t("Customer Name")}: </strong> {order.customer.name}
            </span>
          </div>
        )}

        <br/>
        <div className="col-sm-12">
          <table
            className="col-sm-12"
            id="saleLineItemTable3Inch"
            style={{borderCollapse: "collapse", fontSize: 11}}
            border={0}
          >
            <thead
              style={{
                borderTop: "dashed 1px #808080",
                borderBottom: "dashed 1px #808080"
              }}
            >
            <tr style={{background: headerBg}}>
              <td style={{width: 150, textAlign: "left"}}>
                <strong>{t("Item")}</strong>
              </td>
              <td
                style={{width: 75, textAlign: "right"}}
                id="HeaderPriceColumn"
              >
                <strong>{t("Price")}</strong>
              </td>
              <td style={{textAlign: "right", display: "none"}} id="Space"/>
              <td style={{width: 50, textAlign: "right"}} id="HeaderQtyColumn">
                <strong>{t("Qty")}</strong>
              </td>
              <td
                style={{
                  width: 63,
                  textAlign: "right",
                  paddingRight: 4,
                }}
                className="GSTClm"
              >
                <strong>{t("GST")}</strong>
              </td>
              <td
                className="DiscColumnData3Inch"
                style={{width: 50, textAlign: "right"}}
                id="DiscountColumnHeader"
              >
                <strong>{t("Disc.")}</strong>
              </td>
              <td
                style={{width: 63, textAlign: "right", paddingRight: 4}}
                id="HeaderAmtColumn"
              >
                <strong>{t("Amount")}</strong>
              </td>
            </tr>
            </thead>
            <tbody id="saleLineItemTableBody3Inch">
            {order.items.map((item, index) => {
              const qty = isReturn ? Math.abs(item.quantity) : item.quantity;
              const rowTotal = isReturn
                ? Math.abs((item.price * item.quantity) + item.taxesTotal - item.discount)
                : (item.price * item.quantity) + item.taxesTotal - item.discount;
              return (
              <tr key={index}>
                <td
                  style={{textAlign: "right", display: "none"}}
                  className="GSTClm"
                />
                <td style={{textAlign: "left"}}>
                  {item.product.name}
                  {item.variant && (
                    <>
                      <div className="ms-1">- {item.variant.attributeValue}</div>
                    </>
                  )}
                </td>
                <td style={{textAlign: "right"}}><span dir="ltr">{item.price}</span></td>
                <td style={{textAlign: "right"}}><span dir="ltr">{qty}</span></td>
                <td
                  style={{textAlign: "right", display: "none"}}
                  className="GSTClm"
                />
                <td
                  style={{textAlign: "right"}}
                ><span dir="ltr">{Math.abs(item.taxesTotal)}</span></td>
                <td
                  className="DiscColumnData3Inch"
                  style={{textAlign: "right"}}
                >
                  <span dir="ltr">{Math.abs(item.discount)}</span>
                </td>
                <td style={{textAlign: "right"}}><span dir="ltr">{rowTotal}</span></td>
              </tr>
              );
            })}
            <tr
              style={{
                borderTop: "dashed 1px #808080",
                borderBottom: "dashed 1px #808080"
              }}
            >
              <td
                style={{textAlign: "right", display: "none"}}
                className="GSTClm"
              />
              <td style={{textAlign: "left"}}>{t("Total")}:</td>
              <td style={{textAlign: "right"}}/>
              <td style={{textAlign: "right"}}><span dir="ltr">{itemsQuantity}</span></td>
              <td
                style={{textAlign: "right"}}
                className="GSTClm"
              ></td>
              <td></td>
              <td style={{textAlign: "right"}}><span dir="ltr">{itemsTotal}</span></td>
            </tr>
            </tbody>
          </table>
          <table
            style={{borderCollapse: "collapse", fontSize: 11, width: "100%"}}
            border={0}
          >
            <tbody id="DiscountTable3Inch">
            {order.discount && (
              <tr>
                <td style={{textAlign: "right", width: "60%"}}>{t("Disc")}:</td>
                <td style={{textAlign: "right", width: "40%"}}><span dir="ltr">{isReturn ? Math.abs(order.discount.amount) : order.discount.amount}</span></td>
              </tr>
            )}
            {order.tax && (
              <tr>
                <td style={{textAlign: "right", width: "60%"}}>{t("Tax")}@{order.tax.rate}:</td>
                <td style={{textAlign: "right", width: "40%"}}><span dir="ltr">{isReturn ? Math.abs(order.tax.amount) : order.tax.amount}</span></td>
              </tr>
            )}

            <tr>
              <td style={{textAlign: "right", width: "60%"}}>
                <strong>{isReturn ? t("Refund Total") : t("Net Total")}:</strong>
              </td>
              <td style={{textAlign: "right", width: "40%"}}>
                <strong style={isReturn ? {color: '#991b1b'} : undefined}><span dir="ltr">{netTotal}</span></strong>
              </td>
            </tr>
            {order.adjustment && (
              <tr>
                <td style={{textAlign: "right", width: "60%"}}>
                  <strong>{t("Adjustment")}:</strong>
                </td>
                <td style={{textAlign: "right", width: "40%"}}>
                  <strong><span dir="ltr">{order.adjustment}</span></strong>
                </td>
              </tr>
            )}
            {order.payments.map((item, index) => (
              <tr key={index}>
                <td style={{textAlign: "right", width: "60%"}}>{item.type?.name} {t("Amount")}</td>
                <td style={{textAlign: "right", width: "40%"}}><span dir="ltr">{isReturn ? Math.abs(item.received) : item.received}</span></td>
              </tr>
            ))}

            {!isReturn && (
            <tr
              style={{
                borderTop: "dashed 1px #808080",
                borderBottom: "dashed 1px #808080"
              }}
            >
              <td style={{textAlign: "right", width: "60%"}}>
                <strong>{t("Change due")}:</strong>
              </td>
              <td style={{textAlign: "right", width: "40%"}}>
                <strong><span dir="ltr">{changeDue}</span></strong>
              </td>
            </tr>
            )}
            </tbody>
          </table>
        </div>
        <div id="salePersonOffline_Div3Inch"/>
        <div id="Comments_div3Inch"/>
        <br/>
        <div
          style={{textAlign: "center", background: accentBg}}
          hidden={true}
        >
          <h4
            className="h4Style"
            id="ShopBasedInvoiceFooter13Inch"
            style={{margin: "0 0", padding: "0 0"}}
          ></h4>
          <h4
            className="h4Style"
            id="ShopBasedInvoiceFooter23Inch"
            style={{margin: "0 0", padding: "0 0"}}
          ></h4>
        </div>
        <div
          style={{
            left: "1%",
            textAlign: "justify",
            background: accentBg
          }}
        >
          <h4
            className="h4Style"
            id="SystemBasedInvoiceFooter3Inch"
            style={{margin: "0 0", padding: "0 0", fontWeight: "normal"}}
          >
            {t("Thank you for your visit")}
          </h4>
        </div>
        <div style={{color: "black", padding: "2px 0px"}}>
          <h5
            className="h5Style"
            style={{
              margin: "5px 0",
              padding: "0 0",
              fontWeight: "normal",
              display: "none"
            }}
            id="fbrComments3InchOffline"
          >
            {t("Verify this invoice through FBR TaxAsaan MobileApp or SMS at 9966 and win exciting prizes in draw")}{" "}
          </h5>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Return Receipt
// ---------------------------------------------------------------------------

export interface ReturnReceiptData {
  returnOrderRefId: string;
  originalOrderRefId: string;
  date: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
  refundTotal: number;
  refundMethod: string;
}

export const PrintReturnReceipt = (data: ReturnReceiptData) => {
  const myWindow: any = window.open('', '', 'height:500;width:500');
  const div = myWindow.document.createElement('div');
  div.id = 'print-root';
  myWindow.document.body.appendChild(div);
  const container = myWindow.document.querySelector('#print-root');
  const root = createRoot(container);
  root.render(<ReturnReceiptMarkup data={data} />);
  myWindow.document.close();
  myWindow.focus();
  setTimeout(() => {
    myWindow.print();
    myWindow.close();
  }, 100);
};

const ReturnReceiptMarkup: FC<{ data: ReturnReceiptData }> = ({ data }) => {
  const { t } = useTranslation();

  const totalQty = data.items.reduce((sum, item) => sum + Math.abs(item.quantity), 0);

  return (
    <div style={{ width: '3.5in' }}>
      <div
        style={{
          border: 'none',
          fontSize: 11,
          fontWeight: 'normal',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          margin: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            background: '#fde8e8',
            padding: '8px 6px',
          }}
        >
          <h3 style={{ margin: 0, color: '#991b1b' }}>
            {t('Return Receipt')}
          </h3>
          <div style={{ fontSize: 9, color: '#991b1b' }}>
            إيصال إرجاع
          </div>
        </div>

        {/* Return info */}
        <div style={{ padding: '6px 4px', fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><strong>{t('Return #')}:</strong> {data.returnOrderRefId}</span>
            <span><strong>{t('Original Order #')}:</strong> {data.originalOrderRefId}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>{t('Date')}:</strong> {data.date}
          </div>
        </div>

        {/* Items table */}
        <table
          style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}
          border={0}
        >
          <thead
            style={{
              borderTop: 'dashed 1px #808080',
              borderBottom: 'dashed 1px #808080',
            }}
          >
            <tr style={{ background: '#fde8e8' }}>
              <td style={{ textAlign: 'left', width: '50%' }}>
                <strong>{t('Item')}</strong>
              </td>
              <td style={{ textAlign: 'right', width: '16%' }}>
                <strong>{t('Price')}</strong>
              </td>
              <td style={{ textAlign: 'right', width: '14%' }}>
                <strong>{t('Qty')}</strong>
              </td>
              <td style={{ textAlign: 'right', width: '20%' }}>
                <strong>{t('Amount')}</strong>
              </td>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'left' }}>{item.productName}</td>
                <td style={{ textAlign: 'right' }}>{withCurrency(item.unitPrice)}</td>
                <td style={{ textAlign: 'right' }}>{Math.abs(item.quantity)}</td>
                <td style={{ textAlign: 'right' }}>
                  {withCurrency(item.unitPrice * Math.abs(item.quantity))}
                </td>
              </tr>
            ))}
            <tr
              style={{
                borderTop: 'dashed 1px #808080',
                borderBottom: 'dashed 1px #808080',
              }}
            >
              <td style={{ textAlign: 'left' }}><strong>{t('Total')}:</strong></td>
              <td />
              <td style={{ textAlign: 'right' }}>{totalQty}</td>
              <td style={{ textAlign: 'right' }}>
                <strong>{withCurrency(data.refundTotal)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Refund info */}
        <table
          style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}
          border={0}
        >
          <tbody>
            <tr>
              <td style={{ textAlign: 'right', width: '60%' }}>
                <strong>{t('Refund Total')}:</strong>
              </td>
              <td style={{ textAlign: 'right', width: '40%', color: '#991b1b' }}>
                <strong>{withCurrency(data.refundTotal)}</strong>
              </td>
            </tr>
            <tr>
              <td style={{ textAlign: 'right', width: '60%' }}>
                {t('Refund Method')}:
              </td>
              <td style={{ textAlign: 'right', width: '40%' }}>
                {data.refundMethod}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <br />
        <div
          style={{
            textAlign: 'center',
            background: 'rgba(218, 232, 239, 0.18)',
            padding: '4px',
          }}
        >
          <h4
            style={{ margin: 0, padding: 0, fontWeight: 'normal', fontSize: 11 }}
          >
            {t('Thank you for your visit')}
          </h4>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Z-Report Receipt
// ---------------------------------------------------------------------------

export interface ZReportData {
  storeName: string;
  terminalCode: string;
  openedBy: string;
  openedAt: string;
  closedAt: string;
  payments: Record<string, number>;
  totalSales: number;
  totalOrders: number;
  openingBalance: number;
  cashAdded: number;
  cashWithdrawn: number;
  expenses: number;
  expectedCash: number;
  cashCounted: number;
  variance: number;
}

export const PrintZReport = (data: ZReportData) => {
  const myWindow: any = window.open('', '', 'height:500;width:500');
  const div = myWindow.document.createElement('div');
  div.id = 'print-root';
  myWindow.document.body.appendChild(div);
  const container = myWindow.document.querySelector('#print-root');
  const root = createRoot(container);
  root.render(<ZReportMarkup data={data} />);
  myWindow.document.close();
  myWindow.focus();
  setTimeout(() => {
    myWindow.print();
    myWindow.close();
  }, 100);
};

const ZReportMarkup: FC<{ data: ZReportData }> = ({ data }) => {
  const { t } = useTranslation();
  const cashSales = data.payments['cash'] ?? data.payments['Espèces'] ?? 0;

  return (
    <div style={{ width: '3.5in' }}>
      <div
        style={{
          border: 'none',
          fontSize: 11,
          fontWeight: 'normal',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          margin: 0,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', background: '#1e3a5f', color: '#fff', padding: '10px 6px' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Z-REPORT / تقرير Z</h3>
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>
            {data.storeName} — {data.terminalCode}
          </div>
        </div>

        {/* Session info */}
        <div style={{ padding: '6px 4px', borderBottom: '1px dashed #808080' }}>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr>
                <td><strong>{t('Opened by')}:</strong></td>
                <td style={{ textAlign: 'right' }}>{data.openedBy}</td>
              </tr>
              <tr>
                <td><strong>{t('Opened at')}:</strong></td>
                <td style={{ textAlign: 'right' }} dir="ltr">{data.openedAt}</td>
              </tr>
              <tr>
                <td><strong>{t('Closed at')}:</strong></td>
                <td style={{ textAlign: 'right' }} dir="ltr">{data.closedAt}</td>
              </tr>
              <tr>
                <td><strong>{t('Total orders')}:</strong></td>
                <td style={{ textAlign: 'right' }}>{data.totalOrders}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sales by payment type */}
        <div style={{ padding: '6px 4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
            {t('Sales Summary')}
          </div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(data.payments).map(([type, amount]) => (
                <tr key={type} style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '2px 0' }}>{type}</td>
                  <td style={{ textAlign: 'right', padding: '2px 0' }}>{withCurrency(amount)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px dashed #808080', fontWeight: 'bold' }}>
                <td style={{ padding: '4px 0' }}>{t('Total sales')}</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>{withCurrency(data.totalSales)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash flow */}
        <div style={{ padding: '6px 4px', borderTop: '1px dashed #808080' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
            {t('Cash Flow')}
          </div>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr>
                <td>{t('Opening balance')}</td>
                <td style={{ textAlign: 'right' }}>{withCurrency(data.openingBalance)}</td>
              </tr>
              <tr>
                <td>{t('Cash added')}</td>
                <td style={{ textAlign: 'right' }}>+ {withCurrency(data.cashAdded)}</td>
              </tr>
              <tr>
                <td>{t('Cash withdrawn')}</td>
                <td style={{ textAlign: 'right' }}>- {withCurrency(data.cashWithdrawn)}</td>
              </tr>
              <tr>
                <td>{t('Expenses')}</td>
                <td style={{ textAlign: 'right' }}>- {withCurrency(data.expenses)}</td>
              </tr>
              <tr>
                <td>{t('Cash sales')}</td>
                <td style={{ textAlign: 'right' }}>+ {withCurrency(cashSales)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash reconciliation */}
        <div style={{ padding: '6px 4px', borderTop: '1px dashed #808080' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
            {t('Cash Reconciliation')}
          </div>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr style={{ fontWeight: 'bold' }}>
                <td>{t('Expected cash')}</td>
                <td style={{ textAlign: 'right' }}>{withCurrency(data.expectedCash)}</td>
              </tr>
              <tr>
                <td>{t('Cash counted')}</td>
                <td style={{ textAlign: 'right' }}>{withCurrency(data.cashCounted)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold', color: data.variance >= 0 ? '#16a34a' : '#dc2626' }}>
                <td>{t('Variance')}</td>
                <td style={{ textAlign: 'right' }}>
                  {data.variance >= 0 ? '+' : ''}{withCurrency(data.variance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '8px 4px', borderTop: '1px dashed #808080', fontSize: 10, color: '#666' }}>
          {t('Printed at')}: {new Date().toLocaleString(document.documentElement.dir === 'rtl' ? 'ar-MR' : 'fr-FR')}
        </div>
      </div>
    </div>
  );
};
