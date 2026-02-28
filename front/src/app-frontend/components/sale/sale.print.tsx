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
import { renderToStaticMarkup } from "react-dom/server";
import {useTranslation} from "react-i18next";
import {withCurrency} from "../../../lib/currency/currency";
import {QRCodeSVG} from "qrcode.react";
import { isConnected as isEscPosConnected } from "../../../core/printing/esc-pos-printer";
import { buildSaleReceipt } from "../../../core/printing/receipt-builder";

interface SalePrintProps {
  order: Order;
}

export const PrintOrder = async (order: Order) => {
  // If ESC/POS thermal printer is connected, use it directly
  if (isEscPosConnected()) {
    try {
      const posSettings = getPosSettings();
      const rb = buildSaleReceipt(order, {
        storeName: posSettings.receiptStoreName || 'Shop',
        storePhone: posSettings.receiptStorePhone || undefined,
        storeAddress: posSettings.receiptStoreAddress || undefined,
        headerText: posSettings.receiptHeaderText || undefined,
        footerText: posSettings.receiptFooterText || undefined,
        openDrawer: true,
      });
      await rb.print();
      return;
    } catch (e) {
      console.warn('ESC/POS print failed, falling back to HTML popup', e);
    }
  }

  // Fallback: HTML popup + window.print()
  const myWindow: any = window.open('', '_blank', 'height=500,width=500');

  if (!myWindow) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  try {
    const dir = document.documentElement.dir || 'ltr';
    const html = renderToStaticMarkup(<SalePrintMarkup order={order} />);
    myWindow.document.write(`<!DOCTYPE html><html dir="${dir}"><head><title>Receipt</title></head><body dir="${dir}" style="margin:0">${html}</body></html>`);
    myWindow.document.close();
    myWindow.focus();
    setTimeout(() => {
      myWindow.print();
    }, 500);
  } catch (e) {
    myWindow.document.write('<h1>Error rendering receipt</h1><pre>' + String(e) + '</pre>');
    myWindow.document.close();
  }
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

// Helper to read POS settings from localStorage (works in popup windows without jotai context)
const getPosSettings = () => {
  try {
    const raw = localStorage.getItem('pos-default-data');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const SalePrintMarkup = ({order}: {order: Order}) => {
  const {t, i18n} = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';
  const startAlign = isRtl ? 'right' as const : 'left' as const;

  // Detect if this is a return order
  const isReturn = !!order.returnedFrom;

  // Read POS settings from localStorage
  const posSettings = useMemo(() => getPosSettings(), []);
  const storeName = posSettings.receiptStoreName || t("Shop name");
  const storePhone = posSettings.receiptStorePhone || '';
  const storeAddress = posSettings.receiptStoreAddress || '';
  const headerText = posSettings.receiptHeaderText || '';
  const footerText = posSettings.receiptFooterText || t("Thank you for your visit");

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

  // Shared styles
  const separator: React.CSSProperties = {
    borderTop: '1px dashed #808080',
    margin: '4px 0',
  };

  const thickSeparator: React.CSSProperties = {
    borderTop: '2px dashed #333',
    margin: '4px 0',
  };

  return (
    <div style={{width: "3.5in"}} dir={isRtl ? 'rtl' : 'ltr'}>
      <div
        style={{
          border: "none",
          fontSize: 11,
          fontWeight: "normal",
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          margin: 0,
        }}
      >
        {/* ═══ Store Header ═══ */}
        <div style={{textAlign: "center", padding: "10px 6px"}}>
          <div style={{fontSize: 18, fontWeight: "bold", marginBottom: 2}}>
            {storeName}
          </div>
          {storeAddress && (
            <div style={{fontSize: 10, color: '#555'}}>{storeAddress}</div>
          )}
          {storePhone && (
            <div style={{fontSize: 10, color: '#555'}}>{storePhone}</div>
          )}
          {headerText && (
            <div style={{fontSize: 10, fontStyle: 'italic', color: '#555', marginTop: 2}}>
              {headerText}
            </div>
          )}
        </div>

        <div style={thickSeparator} />

        {/* ═══ Receipt Type Badge ═══ */}
        <div style={{
          textAlign: "center",
          background: isReturn ? '#fde8e8' : '#f0f7fb',
          padding: "4px 6px",
        }}>
          <strong style={{
            fontSize: 12,
            color: isReturn ? '#991b1b' : '#1e3a5f',
            textTransform: 'uppercase' as const,
            letterSpacing: 1,
          }}>
            {isReturn ? t("Return Receipt") : t("Sale Receipt")}
          </strong>
        </div>

        {/* ═══ Prominent Order Number ═══ */}
        <div style={{
          textAlign: "center",
          padding: "8px 6px 6px",
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: "bold",
            letterSpacing: 2,
            color: isReturn ? '#991b1b' : '#000',
          }}>
            #{order.orderId}
          </div>
        </div>

        <div style={separator} />

        {/* ═══ Date / Vendor / Customer ═══ */}
        <div style={{padding: "4px 6px", fontSize: 11}}>
          <table style={{width: '100%', fontSize: 11}}>
            <tbody>
              <tr>
                <td><strong>{t("Date")}:</strong></td>
                <td style={{textAlign: 'right'}} dir="ltr">
                  {DateTime.fromISO(order.createdAt).toFormat('dd/MM/yyyy HH:mm')}
                </td>
              </tr>
              {order.user && (
                <tr>
                  <td><strong>{t("Vendor")}:</strong></td>
                  <td style={{textAlign: 'right'}}>{order.user.displayName}</td>
                </tr>
              )}
              {order.customer && (
                <tr>
                  <td><strong>{t("Customer Name")}:</strong></td>
                  <td style={{textAlign: 'right'}}>{order.customer.name}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Original order reference for returns */}
        {isReturn && order.returnedFrom && (
          <>
            <div style={separator} />
            <div style={{
              textAlign: "center",
              background: '#fef2f2',
              padding: '4px 6px',
              fontSize: 11,
              color: '#991b1b',
            }}>
              <strong>{t("Original Order #")}:</strong> {order.returnedFrom.orderId}
            </div>
          </>
        )}

        <div style={thickSeparator} />

        {/* ═══ Items Table ═══ */}
        <table style={{borderCollapse: "collapse", fontSize: 11, width: "100%"}} border={0}>
          <thead>
            <tr style={{
              background: isReturn ? '#fde8e8' : '#f0f7fb',
              borderBottom: '1px dashed #808080',
            }}>
              <td style={{width: '45%', textAlign: startAlign, padding: '4px 4px'}}>
                <strong>{t("Item")}</strong>
              </td>
              <td style={{width: '18%', textAlign: 'right', padding: '4px 2px'}}>
                <strong>{t("Price")}</strong>
              </td>
              <td style={{width: '12%', textAlign: 'center', padding: '4px 2px'}}>
                <strong>{t("Qty")}</strong>
              </td>
              <td style={{width: '25%', textAlign: 'right', padding: '4px 4px'}}>
                <strong>{t("Amount")}</strong>
              </td>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const qty = isReturn ? Math.abs(item.quantity) : item.quantity;
              const rowTotal = isReturn
                ? Math.abs((item.price * item.quantity) + item.taxesTotal - item.discount)
                : (item.price * item.quantity) + item.taxesTotal - item.discount;
              return (
                <tr key={index} style={{borderBottom: '1px dotted #ddd'}}>
                  <td style={{textAlign: startAlign, padding: '3px 4px'}}>
                    {item.product.name}
                    {item.variant && (
                      <div style={{fontSize: 9, color: '#666', paddingLeft: 8}}>
                        {item.variant.attributeValue}
                      </div>
                    )}
                  </td>
                  <td style={{textAlign: 'right', padding: '3px 2px'}}>
                    <span dir="ltr">{withCurrency(item.price)}</span>
                  </td>
                  <td style={{textAlign: 'center', padding: '3px 2px'}}>
                    <span dir="ltr">{qty}</span>
                  </td>
                  <td style={{textAlign: 'right', padding: '3px 4px'}}>
                    <span dir="ltr">{withCurrency(rowTotal)}</span>
                  </td>
                </tr>
              );
            })}
            {/* Items subtotal row */}
            <tr style={{borderTop: '1px dashed #808080'}}>
              <td style={{textAlign: startAlign, padding: '4px 4px'}}>
                <strong>{t("Total")}:</strong>
              </td>
              <td />
              <td style={{textAlign: 'center', padding: '4px 2px'}}>
                <strong>{itemsQuantity}</strong>
              </td>
              <td style={{textAlign: 'right', padding: '4px 4px'}}>
                <strong><span dir="ltr">{withCurrency(itemsTotal)}</span></strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={separator} />

        {/* ═══ Totals Section ═══ */}
        <table style={{borderCollapse: "collapse", fontSize: 11, width: "100%"}} border={0}>
          <tbody>
            {order.discount && (
              <tr>
                <td style={{textAlign: 'right', width: '60%', padding: '2px 4px'}}>{t("Disc")}:</td>
                <td style={{textAlign: 'right', width: '40%', padding: '2px 4px'}}>
                  <span dir="ltr">{withCurrency(isReturn ? Math.abs(order.discount.amount) : order.discount.amount)}</span>
                </td>
              </tr>
            )}
            {order.tax && (
              <tr>
                <td style={{textAlign: 'right', width: '60%', padding: '2px 4px'}}>
                  {t("Tax")}@{order.tax.rate}:
                </td>
                <td style={{textAlign: 'right', width: '40%', padding: '2px 4px'}}>
                  <span dir="ltr">{withCurrency(isReturn ? Math.abs(order.tax.amount) : order.tax.amount)}</span>
                </td>
              </tr>
            )}
            {order.adjustment && (
              <tr>
                <td style={{textAlign: 'right', width: '60%', padding: '2px 4px'}}>
                  {t("Adjustment")}:
                </td>
                <td style={{textAlign: 'right', width: '40%', padding: '2px 4px'}}>
                  <span dir="ltr">{withCurrency(order.adjustment)}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ═══ Net Total (prominent) ═══ */}
        <div style={{
          ...thickSeparator,
          borderTopWidth: 2,
        }} />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '6px 6px',
          fontSize: 15,
          fontWeight: 'bold',
          background: isReturn ? '#fde8e8' : '#f0f7fb',
        }}>
          <span>{isReturn ? t("Refund Total") : t("Net Total")}</span>
          <span dir="ltr" style={isReturn ? {color: '#991b1b'} : undefined}>
            {withCurrency(netTotal)}
          </span>
        </div>
        <div style={{
          ...thickSeparator,
          borderTopWidth: 2,
        }} />

        {/* ═══ Payments ═══ */}
        <table style={{borderCollapse: "collapse", fontSize: 11, width: "100%"}} border={0}>
          <tbody>
            {order.payments.map((item, index) => (
              <tr key={index}>
                <td style={{textAlign: 'right', width: '60%', padding: '2px 4px'}}>
                  {item.type?.name}:
                </td>
                <td style={{textAlign: 'right', width: '40%', padding: '2px 4px'}}>
                  <span dir="ltr">{withCurrency(isReturn ? Math.abs(item.received) : item.received)}</span>
                </td>
              </tr>
            ))}
            {!isReturn && (
              <tr style={{borderTop: '1px dashed #808080'}}>
                <td style={{textAlign: 'right', width: '60%', padding: '4px 4px'}}>
                  <strong>{t("Change due")}:</strong>
                </td>
                <td style={{textAlign: 'right', width: '40%', padding: '4px 4px'}}>
                  <strong><span dir="ltr">{withCurrency(changeDue)}</span></strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ═══ QR Code ═══ */}
        {order.orderId && (
          <>
            <div style={separator} />
            <div style={{textAlign: "center", padding: "8px 0"}}>
              <QRCodeSVG value={order.orderId} size={80} level="L" />
            </div>
          </>
        )}

        {/* ═══ Footer ═══ */}
        <div style={separator} />
        <div style={{
          textAlign: "center",
          padding: "6px 4px",
          fontSize: 11,
        }}>
          {footerText}
        </div>

        {/* Printed timestamp */}
        <div style={{
          textAlign: "center",
          fontSize: 9,
          color: '#999',
          padding: '2px 0 6px',
        }}>
          {DateTime.now().toFormat('dd/MM/yyyy HH:mm')}
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
  const myWindow: any = window.open('', '_blank', 'height=500,width=500');

  if (!myWindow) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  try {
    const dir = document.documentElement.dir || 'ltr';
    const html = renderToStaticMarkup(<ReturnReceiptMarkup data={data} />);
    myWindow.document.write(`<!DOCTYPE html><html dir="${dir}"><head><title>Return Receipt</title></head><body dir="${dir}" style="margin:0">${html}</body></html>`);
    myWindow.document.close();
    myWindow.focus();
    setTimeout(() => {
      myWindow.print();
    }, 500);
  } catch (e) {
    myWindow.document.write('<h1>Error rendering receipt</h1><pre>' + String(e) + '</pre>');
    myWindow.document.close();
  }
};

const ReturnReceiptMarkup: FC<{ data: ReturnReceiptData }> = ({ data }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';
  const startAlign = isRtl ? 'right' as const : 'left' as const;

  const totalQty = data.items.reduce((sum, item) => sum + Math.abs(item.quantity), 0);

  return (
    <div style={{ width: '3.5in' }} dir={isRtl ? 'rtl' : 'ltr'}>
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
              <td style={{ textAlign: startAlign, width: '50%' }}>
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
                <td style={{ textAlign: startAlign }}>{item.productName}</td>
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
              <td style={{ textAlign: startAlign }}><strong>{t('Total')}:</strong></td>
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
  // window.open MUST be first call in click handler (Chrome popup blocker)
  const myWindow: any = window.open('', '_blank', 'height=500,width=500');

  if (!myWindow) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  try {
    const dir = document.documentElement.dir || 'ltr';
    const html = renderToStaticMarkup(<ZReportMarkup data={data} />);
    myWindow.document.write(`<!DOCTYPE html><html dir="${dir}"><head><title>Z-Report</title></head><body dir="${dir}" style="margin:0">${html}</body></html>`);
    myWindow.document.close();
    myWindow.focus();
    setTimeout(() => {
      myWindow.print();
    }, 500);
  } catch (e) {
    myWindow.document.write('<h1>Error rendering Z-Report</h1><pre>' + String(e) + '</pre>');
    myWindow.document.close();
  }
};

const ZReportMarkup: FC<{ data: ZReportData }> = ({ data }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';
  const varianceValue = data.variance;

  return (
    <div style={{ width: '3.5in' }} dir={isRtl ? 'rtl' : 'ltr'}>
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
            </tbody>
          </table>
        </div>

        {/* Opening balance */}
        <div style={{ padding: '6px 4px', borderBottom: '1px dashed #808080' }}>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr style={{ fontWeight: 'bold' }}>
                <td>{t('Opening balance')}</td>
                <td dir="ltr" style={{ textAlign: 'left' }}>{withCurrency(data.openingBalance)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sales Summary */}
        <div style={{ padding: '6px 4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
            {t('Sales Summary')}
          </div>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(data.payments).map(([type, amount]) => (
                <tr key={type} style={{ borderBottom: '1px dotted #ccc' }}>
                  <td style={{ padding: '2px 0' }}>{type}</td>
                  <td dir="ltr" style={{ textAlign: 'left', padding: '2px 0' }}>{withCurrency(amount)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px dashed #808080', fontWeight: 'bold' }}>
                <td style={{ padding: '4px 0' }}>
                  {t('Total orders')}: {data.totalOrders}
                </td>
                <td dir="ltr" style={{ textAlign: 'left', padding: '4px 0' }}>
                  {t('Total sales')}: {withCurrency(data.totalSales)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cash Reconciliation */}
        <div style={{ padding: '6px 4px', borderTop: '1px dashed #808080' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
            {t('Cash Reconciliation')}
          </div>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr>
                <td>{t('Cash added')}</td>
                <td dir="ltr" style={{ textAlign: 'left' }}>{withCurrency(data.cashAdded)}</td>
              </tr>
              <tr>
                <td>{t('Cash withdrawn')}</td>
                <td dir="ltr" style={{ textAlign: 'left' }}>{withCurrency(data.cashWithdrawn)}</td>
              </tr>
              <tr>
                <td>{t('Expenses')}</td>
                <td dir="ltr" style={{ textAlign: 'left' }}>{withCurrency(data.expenses)}</td>
              </tr>
              <tr style={{ borderTop: '1px dotted #ccc', fontWeight: 'bold' }}>
                <td style={{ padding: '3px 0' }}>{t('Expected cash')}</td>
                <td dir="ltr" style={{ textAlign: 'left', padding: '3px 0' }}>{withCurrency(data.expectedCash)}</td>
              </tr>
              <tr>
                <td>{t('Cash counted')}</td>
                <td dir="ltr" style={{ textAlign: 'left' }}>{withCurrency(data.cashCounted)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold', borderTop: '1px dashed #808080', color: varianceValue >= 0 ? '#16a34a' : '#dc2626' }}>
                <td style={{ padding: '4px 0' }}>{t('Variance')}</td>
                <td dir="ltr" style={{ textAlign: 'left', padding: '4px 0' }}>
                  {withCurrency(varianceValue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '8px 4px', borderTop: '1px dashed #808080', fontSize: 10, color: '#666' }}>
          {t('Printed at')}: {new Date().toLocaleString('fr-FR')}
        </div>
      </div>
    </div>
  );
};
