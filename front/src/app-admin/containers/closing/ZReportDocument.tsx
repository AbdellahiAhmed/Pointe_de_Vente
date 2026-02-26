import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { DateTime } from 'luxon';
import NotoSansArabicRegular from '../../../assets/fonts/NotoSansArabic-Regular.ttf';
import NotoSansArabicBold from '../../../assets/fonts/NotoSansArabic-Bold.ttf';

Font.register({
  family: 'NotoSansArabic',
  fonts: [
    { src: NotoSansArabicRegular, fontWeight: 400 },
    { src: NotoSansArabicBold, fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  arabicPage: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'NotoSansArabic',
  },
  header: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subHeader: {
    textAlign: 'center',
    fontSize: 10,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
  },
  sectionTitleRtl: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
    textAlign: 'right',
    fontFamily: 'NotoSansArabic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
    fontWeight: 'bold',
  },
  tableHeaderRtl: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  tableRowRtl: {
    flexDirection: 'row-reverse',
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  col: {
    flex: 1,
  },
  colRight: {
    flex: 1,
    textAlign: 'right',
  },
  colLeft: {
    flex: 1,
    textAlign: 'left',
  },
  colRtlLabel: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'NotoSansArabic',
  },
  colRtlValue: {
    flex: 1,
    textAlign: 'left',
    fontFamily: 'NotoSansArabic',
  },
  signatureBlock: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  varianceNegative: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 3,
    fontWeight: 'bold',
  },
  totalRowRtl: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 3,
    fontWeight: 'bold',
  },
});

const labels = {
  fr: {
    title: 'RAPPORT Z',
    store: 'Magasin',
    terminal: 'Terminal',
    openedBy: 'Ouvert par',
    closedBy: 'Cloture par',
    from: 'Du',
    to: 'Au',
    salesSummary: 'Resume des Ventes',
    totalOrders: 'Nombre de tickets',
    completedOrders: 'Tickets completes',
    returnedOrders: 'Retours',
    grossRevenue: 'Chiffre d\'affaires brut',
    discounts: 'Remises',
    netRevenue: 'Chiffre d\'affaires net',
    averageBasket: 'Panier moyen',
    paymentBreakdown: 'Ventilation par Mode de Paiement',
    paymentType: 'Mode',
    category: 'Type',
    amount: 'Montant',
    cashReconciliation: 'Reconciliation de Caisse',
    openingBalance: 'Fond d\'ouverture',
    cashReceived: 'Especes recues',
    cashAdded: 'Ajouts',
    cashWithdrawn: 'Retraits',
    expenses: 'Depenses',
    expectedCash: 'Especes attendues',
    countedCash: 'Especes comptees',
    variance: 'Ecart',
    denominations: 'Comptage des Coupures',
    denomination: 'Coupure',
    count: 'Nombre',
    total: 'Total',
    signature: 'Signature du gerant',
    generatedAt: 'Genere le',
    reportNumber: 'Rapport Z N',
  },
  ar: {
    title: '\u062A\u0642\u0631\u064A\u0631 Z',
    store: '\u0627\u0644\u0645\u062A\u062C\u0631',
    terminal: '\u0627\u0644\u0637\u0631\u0641\u064A\u0629',
    openedBy: '\u0641\u062A\u062D \u0645\u0646 \u0637\u0631\u0641',
    closedBy: '\u0623\u063A\u0644\u0642 \u0645\u0646 \u0637\u0631\u0641',
    from: '\u0645\u0646',
    to: '\u0625\u0644\u0649',
    salesSummary: '\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A',
    totalOrders: '\u0639\u062F\u062F \u0627\u0644\u062A\u0630\u0627\u0643\u0631',
    completedOrders: '\u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629',
    returnedOrders: '\u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A',
    grossRevenue: '\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629',
    discounts: '\u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A',
    netRevenue: '\u0635\u0627\u0641\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A',
    averageBasket: '\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0633\u0644\u0629',
    paymentBreakdown: '\u062A\u0648\u0632\u064A\u0639 \u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639',
    paymentType: '\u0627\u0644\u0637\u0631\u064A\u0642\u0629',
    category: '\u0627\u0644\u0646\u0648\u0639',
    amount: '\u0627\u0644\u0645\u0628\u0644\u063A',
    cashReconciliation: '\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0635\u0646\u062F\u0648\u0642',
    openingBalance: '\u0631\u0635\u064A\u062F \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D',
    cashReceived: '\u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0645\u0633\u062A\u0644\u0645',
    cashAdded: '\u0625\u0636\u0627\u0641\u0627\u062A',
    cashWithdrawn: '\u0633\u062D\u0648\u0628\u0627\u062A',
    expenses: '\u0645\u0635\u0627\u0631\u064A\u0641',
    expectedCash: '\u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0645\u062A\u0648\u0642\u0639',
    countedCash: '\u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0645\u062D\u0633\u0648\u0628',
    variance: '\u0627\u0644\u0641\u0631\u0642',
    denominations: '\u0639\u062F \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u0646\u0642\u062F\u064A\u0629',
    denomination: '\u0627\u0644\u0641\u0626\u0629',
    count: '\u0627\u0644\u0639\u062F\u062F',
    total: '\u0627\u0644\u0645\u062C\u0645\u0648\u0639',
    signature: '\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0645\u062F\u064A\u0631',
    generatedAt: '\u062A\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0641\u064A',
    reportNumber: '\u062A\u0642\u0631\u064A\u0631 Z \u0631\u0642\u0645',
  },
};

interface ZReportSnapshot {
  zReportNumber: number;
  generatedAt: string;
  store: { name: string; location: string };
  terminal: { code: string };
  openedBy: string;
  closedBy: string;
  dateFrom: string;
  dateTo: string;
  sales: {
    totalOrders: number;
    completedOrders: number;
    returnedOrders: number;
    grossRevenue: number;
    totalDiscounts: number;
    netRevenue: number;
    averageBasket: number;
  };
  paymentBreakdown: Array<{ name: string; category: string; amount: number }>;
  cashReconciliation: {
    openingBalance: number;
    cashReceived: number;
    cashAdded: number;
    cashWithdrawn: number;
    expenses: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
  };
  denominations: Array<{ value: number; count: number; total: number }>;
}

interface ZReportDocumentProps {
  data: ZReportSnapshot;
  lang: 'fr' | 'ar';
}

const formatCurrency = (value: number) => {
  return '\u200E' + new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(value) + ' MRU\u200E';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return DateTime.fromISO(dateStr).toFormat('dd/MM/yyyy HH:mm');
};

const ZReportDocument: React.FC<ZReportDocumentProps> = ({ data, lang }) => {
  const l = labels[lang];
  const isAr = lang === 'ar';
  const pageStyle = isAr ? styles.arabicPage : styles.page;

  // RTL-aware styles
  const sectionTitleStyle = isAr ? styles.sectionTitleRtl : styles.sectionTitle;
  const rowStyle = isAr ? styles.rowRtl : styles.row;
  const tableHeaderStyle = isAr ? styles.tableHeaderRtl : styles.tableHeader;
  const tableRowStyle = isAr ? styles.tableRowRtl : styles.tableRow;
  const totalRowStyle = isAr ? styles.totalRowRtl : styles.totalRow;
  // In RTL: first child (label) is on the right, second child (value) on the left
  const labelStyle = isAr ? styles.colRtlLabel : styles.col;
  const valueStyle = isAr ? styles.colRtlValue : styles.colRight;
  const labelBoldStyle = isAr
    ? [styles.colRtlLabel, { fontWeight: 'bold' as const }]
    : [styles.col, { fontWeight: 'bold' as const }];
  const valueBoldStyle = isAr
    ? [styles.colRtlValue, { fontWeight: 'bold' as const }]
    : [styles.colRight, { fontWeight: 'bold' as const }];
  // For table columns with centered text (mid-column)
  const colMidStyle = isAr
    ? { flex: 1 as number, textAlign: 'center' as const, fontFamily: 'NotoSansArabic' }
    : styles.col;

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        {/* Header — always centered */}
        <Text style={styles.header}>{l.title}</Text>
        <Text style={styles.subHeader}>
          {isAr
            ? `Z-${data.zReportNumber} :${l.reportNumber}`
            : `${l.reportNumber}: Z-${data.zReportNumber}`}
        </Text>
        <Text style={styles.subHeader}>
          {isAr
            ? `${data.store.name}${data.store.location ? ` - ${data.store.location}` : ''} :${l.store}`
            : `${l.store}: ${data.store.name}${data.store.location ? ` - ${data.store.location}` : ''}`}
        </Text>
        <Text style={styles.subHeader}>
          {isAr
            ? `${data.terminal.code} :${l.terminal}`
            : `${l.terminal}: ${data.terminal.code}`}
        </Text>
        <Text style={styles.subHeader}>
          {isAr
            ? `${formatDate(data.dateTo)} :${l.to} | ${formatDate(data.dateFrom)} :${l.from}`
            : `${l.from}: ${formatDate(data.dateFrom)} | ${l.to}: ${formatDate(data.dateTo)}`}
        </Text>
        <Text style={styles.subHeader}>
          {isAr
            ? `${data.closedBy} :${l.closedBy} | ${data.openedBy} :${l.openedBy}`
            : `${l.openedBy}: ${data.openedBy} | ${l.closedBy}: ${data.closedBy}`}
        </Text>

        {/* Sales Summary */}
        <Text style={sectionTitleStyle}>{l.salesSummary}</Text>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.totalOrders}</Text>
          <Text style={valueStyle}>{data.sales.totalOrders}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.completedOrders}</Text>
          <Text style={valueStyle}>{data.sales.completedOrders}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.returnedOrders}</Text>
          <Text style={valueStyle}>{data.sales.returnedOrders}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.grossRevenue}</Text>
          <Text style={valueStyle}>{formatCurrency(data.sales.grossRevenue)}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.discounts}</Text>
          <Text style={valueStyle}>-{formatCurrency(data.sales.totalDiscounts)}</Text>
        </View>
        <View style={[rowStyle, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={labelBoldStyle}>{l.netRevenue}</Text>
          <Text style={valueBoldStyle}>{formatCurrency(data.sales.netRevenue)}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.averageBasket}</Text>
          <Text style={valueStyle}>{formatCurrency(data.sales.averageBasket)}</Text>
        </View>

        {/* Payment Breakdown */}
        <Text style={sectionTitleStyle}>{l.paymentBreakdown}</Text>
        <View style={tableHeaderStyle}>
          <Text style={labelStyle}>{l.paymentType}</Text>
          <Text style={colMidStyle}>{l.category}</Text>
          <Text style={valueStyle}>{l.amount}</Text>
        </View>
        {data.paymentBreakdown.map((p, i) => (
          <View style={tableRowStyle} key={i}>
            <Text style={labelStyle}>{p.name}</Text>
            <Text style={colMidStyle}>{p.category}</Text>
            <Text style={valueStyle}>{formatCurrency(p.amount)}</Text>
          </View>
        ))}
        <View style={totalRowStyle}>
          <Text style={labelBoldStyle}>{l.total}</Text>
          <Text style={{ flex: 1 }}></Text>
          <Text style={valueBoldStyle}>
            {formatCurrency(data.paymentBreakdown.reduce((s, p) => s + p.amount, 0))}
          </Text>
        </View>

        {/* Cash Reconciliation */}
        <Text style={sectionTitleStyle}>{l.cashReconciliation}</Text>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.openingBalance}</Text>
          <Text style={valueStyle}>{formatCurrency(data.cashReconciliation.openingBalance)}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.cashReceived}</Text>
          <Text style={valueStyle}>{formatCurrency(data.cashReconciliation.cashReceived)}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.cashAdded}</Text>
          <Text style={valueStyle}>{formatCurrency(data.cashReconciliation.cashAdded)}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.cashWithdrawn}</Text>
          <Text style={valueStyle}>-{formatCurrency(data.cashReconciliation.cashWithdrawn)}</Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.expenses}</Text>
          <Text style={valueStyle}>-{formatCurrency(data.cashReconciliation.expenses)}</Text>
        </View>
        <View style={[rowStyle, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={labelBoldStyle}>{l.expectedCash}</Text>
          <Text style={valueBoldStyle}>
            {formatCurrency(data.cashReconciliation.expectedCash)}
          </Text>
        </View>
        <View style={rowStyle}>
          <Text style={labelStyle}>{l.countedCash}</Text>
          <Text style={valueStyle}>{formatCurrency(data.cashReconciliation.countedCash)}</Text>
        </View>
        <View style={[rowStyle, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={labelBoldStyle}>{l.variance}</Text>
          <Text style={[
            ...(Array.isArray(valueBoldStyle) ? valueBoldStyle : [valueBoldStyle]),
            data.cashReconciliation.variance < 0 ? styles.varianceNegative : {},
          ]}>
            {formatCurrency(data.cashReconciliation.variance)}
          </Text>
        </View>

        {/* Denomination Count */}
        {data.denominations && data.denominations.length > 0 && (
          <>
            <Text style={sectionTitleStyle}>{l.denominations}</Text>
            <View style={tableHeaderStyle}>
              <Text style={labelStyle}>{l.denomination}</Text>
              <Text style={colMidStyle}>{l.count}</Text>
              <Text style={valueStyle}>{l.total}</Text>
            </View>
            {data.denominations.map((d, i) => (
              <View style={tableRowStyle} key={i}>
                <Text style={labelStyle}>{'\u200E'}{d.value} MRU{'\u200E'}</Text>
                <Text style={colMidStyle}>{d.count}</Text>
                <Text style={valueStyle}>{formatCurrency(d.total)}</Text>
              </View>
            ))}
            <View style={totalRowStyle}>
              <Text style={labelBoldStyle}>{l.total}</Text>
              <Text style={{ flex: 1 }}></Text>
              <Text style={valueBoldStyle}>
                {formatCurrency(data.denominations.reduce((s, d) => s + d.total, 0))}
              </Text>
            </View>
          </>
        )}

        {/* Signature Block */}
        <View style={[styles.signatureBlock, isAr ? { alignItems: 'flex-end' } : {}]}>
          <Text>{l.signature}: ____________________</Text>
          <Text style={{ marginTop: 5 }}>
            {data.closedBy} - {formatDate(data.dateTo)}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {isAr
            ? `Z-${data.zReportNumber} :${l.reportNumber} | ${formatDate(data.generatedAt)} :${l.generatedAt}`
            : `${l.generatedAt}: ${formatDate(data.generatedAt)} | ${l.reportNumber}: Z-${data.zReportNumber}`}
        </Text>
      </Page>
    </Document>
  );
};

export default ZReportDocument;
