/**
 * Builds ESC/POS receipt from Order data.
 */

import { Order } from '../../api/model/order';
import { ReceiptBuilder } from './esc-pos-printer';
import { withCurrency } from '../../lib/currency/currency';
import { DateTime } from 'luxon';

export interface ReceiptOptions {
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  headerText?: string;
  footerText?: string;
  openDrawer?: boolean;
}

function currencyPlain(amount: number): string {
  // Strip LTR marks from withCurrency for plain-text ESC/POS output
  return withCurrency(amount).replace(/[\u200E\u200F]/g, '');
}

export function buildSaleReceipt(order: Order, options: ReceiptOptions): ReceiptBuilder {
  const isReturn = !!order.returnedFrom;
  const rb = new ReceiptBuilder();

  // Store header
  rb.center().bold().doubleSize();
  rb.line(options.storeName);
  rb.doubleSize(false).bold(false);

  if (options.storeAddress) rb.line(options.storeAddress);
  if (options.storePhone) rb.line(options.storePhone);
  if (options.headerText) rb.line(options.headerText);

  rb.separator('=');

  // Receipt type
  rb.center().bold().doubleHeight();
  rb.line(isReturn ? 'RETOUR' : 'TICKET DE CAISSE');
  rb.doubleHeight(false).bold(false);

  // Order number (prominent)
  rb.bold().doubleSize();
  rb.line(`#${order.orderId || ''}`);
  rb.doubleSize(false).bold(false);

  rb.separator('-');

  // Date, vendor, customer
  rb.left();
  rb.columns(
    'Date:',
    DateTime.fromISO(order.createdAt).toFormat('dd/MM/yyyy HH:mm')
  );
  if (order.user) {
    rb.columns('Vendeur:', order.user.displayName);
  }
  if (order.customer) {
    rb.columns('Client:', order.customer.name);
  }

  if (isReturn && order.returnedFrom) {
    rb.columns('Commande orig.:', `#${order.returnedFrom.orderId}`);
  }

  rb.separator('=');

  // Items header
  rb.bold();
  rb.columns4('Article', 'Prix', 'Qté', 'Total');
  rb.bold(false);
  rb.separator('-');

  // Items
  let itemsTotal = 0;
  let itemsQty = 0;

  for (const item of order.items) {
    const qty = isReturn ? Math.abs(item.quantity) : item.quantity;
    const rowTotal = isReturn
      ? Math.abs((item.price * item.quantity) + item.taxesTotal - item.discount)
      : (item.price * item.quantity) + item.taxesTotal - item.discount;

    itemsTotal += rowTotal;
    itemsQty += qty;

    const name = item.product.name.length > 16
      ? item.product.name.substring(0, 15) + '.'
      : item.product.name;

    rb.columns4(
      name,
      currencyPlain(item.price),
      String(qty),
      currencyPlain(rowTotal)
    );

    if (item.variant) {
      rb.line(`  ${item.variant.attributeValue}`);
    }
  }

  rb.separator('-');
  rb.bold();
  rb.columns4('Total', '', String(itemsQty), currencyPlain(itemsTotal));
  rb.bold(false);

  // Discount / Tax / Adjustment
  if (order.discount?.amount) {
    const disc = isReturn ? Math.abs(order.discount.amount) : order.discount.amount;
    rb.columns('Remise:', `-${currencyPlain(disc)}`);
  }
  if (order.tax?.amount) {
    const tax = isReturn ? Math.abs(order.tax.amount) : order.tax.amount;
    rb.columns(`Taxe@${order.tax.rate}:`, currencyPlain(tax));
  }
  if (order.adjustment) {
    rb.columns('Ajustement:', currencyPlain(order.adjustment));
  }

  // Net total
  let netTotal = itemsTotal;
  if (order.discount?.amount) netTotal -= order.discount.amount;
  if (order.tax?.amount) netTotal += order.tax.amount;
  if (isReturn) netTotal = Math.abs(netTotal);

  rb.separator('=');
  rb.center().bold().doubleSize();
  rb.line(currencyPlain(netTotal));
  rb.doubleSize(false).bold(false);
  rb.separator('=');

  // Payments
  rb.left();
  for (const payment of order.payments) {
    const received = isReturn ? Math.abs(payment.received) : payment.received;
    rb.columns(
      `${payment.type?.name || 'Paiement'}:`,
      currencyPlain(received)
    );
  }

  if (!isReturn) {
    const changeDue = order.payments.reduce(
      (prev, p) => prev + (p.total - p.received),
      0
    );
    rb.separator('-');
    rb.bold();
    rb.columns('Monnaie:', currencyPlain(changeDue));
    rb.bold(false);
  }

  // Footer
  rb.feed(1);
  rb.center();
  rb.line(options.footerText || 'Merci de votre visite !');
  rb.line(DateTime.now().toFormat('dd/MM/yyyy HH:mm'));

  // Cut & drawer
  if (options.openDrawer) rb.openDrawer();
  rb.cut();

  return rb;
}
