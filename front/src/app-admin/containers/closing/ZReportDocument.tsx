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
  row: {
    flexDirection: 'row',
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
  tableRow: {
    flexDirection: 'row',
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
  signatureBlock: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 10,
  },
  arabicText: {
    fontFamily: 'NotoSansArabic',
    textAlign: 'right',
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
    title: '\u202B\u062A\u0642\u0631\u064A\u0631 Z',
    store: '\u202B\u0627\u0644\u0645\u062A\u062C\u0631',
    terminal: '\u202B\u0627\u0644\u0637\u0631\u0641\u064A\u0629',
    openedBy: '\u202B\u0641\u062A\u062D \u0645\u0646 \u0637\u0631\u0641',
    closedBy: '\u202B\u0623\u063A\u0644\u0642 \u0645\u0646 \u0637\u0631\u0641',
    from: '\u202B\u0645\u0646',
    to: '\u202B\u0625\u0644\u0649',
    salesSummary: '\u202B\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A',
    totalOrders: '\u202B\u0639\u062F\u062F \u0627\u0644\u062A\u0630\u0627\u0643\u0631',
    completedOrders: '\u202B\u0627\u0644\u062A\u0630\u0627\u0643\u0631 \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629',
    returnedOrders: '\u202B\u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A',
    grossRevenue: '\u202B\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629',
    discounts: '\u202B\u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A',
    netRevenue: '\u202B\u0635\u0627\u0641\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A',
    averageBasket: '\u202B\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0633\u0644\u0629',
    paymentBreakdown: '\u202B\u062A\u0648\u0632\u064A\u0639 \u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639',
    paymentType: '\u202B\u0627\u0644\u0637\u0631\u064A\u0642\u0629',
    category: '\u202B\u0627\u0644\u0646\u0648\u0639',
    amount: '\u202B\u0627\u0644\u0645\u0628\u0644\u063A',
    cashReconciliation: '\u202B\u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u0635\u0646\u062F\u0648\u0642',
    openingBalance: '\u202B\u0631\u0635\u064A\u062F \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D',
    cashReceived: '\u202B\u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0645\u0633\u062A\u0644\u0645',
    cashAdded: '\u202B\u0625\u0636\u0627\u0641\u0627\u062A',
    cashWithdrawn: '\u202B\u0633\u062D\u0648\u0628\u0627\u062A',
    expenses: '\u202B\u0645\u0635\u0627\u0631\u064A\u0641',
    expectedCash: '\u202B\u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0645\u062A\u0648\u0642\u0639',
    countedCash: '\u202B\u0627\u0644\u0646\u0642\u062F \u0627\u0644\u0645\u062D\u0633\u0648\u0628',
    variance: '\u202B\u0627\u0644\u0641\u0631\u0642',
    denominations: '\u202B\u0639\u062F \u0627\u0644\u0623\u0648\u0631\u0627\u0642 \u0627\u0644\u0646\u0642\u062F\u064A\u0629',
    denomination: '\u202B\u0627\u0644\u0641\u0626\u0629',
    count: '\u202B\u0627\u0644\u0639\u062F\u062F',
    total: '\u202B\u0627\u0644\u0645\u062C\u0645\u0648\u0639',
    signature: '\u202B\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0645\u062F\u064A\u0631',
    generatedAt: '\u202B\u062A\u0645 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0641\u064A',
    reportNumber: '\u202B\u062A\u0642\u0631\u064A\u0631 Z \u0631\u0642\u0645',
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
  const isArabic = lang === 'ar';
  const pageStyle = isArabic ? styles.arabicPage : styles.page;
  const textStyle = isArabic ? styles.arabicText : {};

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        {/* Header */}
        <Text style={[styles.header, textStyle]}>{l.title}</Text>
        <Text style={[styles.subHeader, textStyle]}>
          {l.reportNumber}: Z-{data.zReportNumber}
        </Text>
        <Text style={[styles.subHeader, textStyle]}>
          {l.store}: {data.store.name}
          {data.store.location ? ` - ${data.store.location}` : ''}
        </Text>
        <Text style={[styles.subHeader, textStyle]}>
          {l.terminal}: {data.terminal.code}
        </Text>
        <Text style={[styles.subHeader, textStyle]}>
          {l.from}: {formatDate(data.dateFrom)} | {l.to}: {formatDate(data.dateTo)}
        </Text>
        <Text style={[styles.subHeader, textStyle]}>
          {l.openedBy}: {data.openedBy} | {l.closedBy}: {data.closedBy}
        </Text>

        {/* Sales Summary */}
        <Text style={[styles.sectionTitle, textStyle]}>{l.salesSummary}</Text>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.totalOrders}</Text>
          <Text style={[styles.colRight, textStyle]}>{data.sales.totalOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.completedOrders}</Text>
          <Text style={[styles.colRight, textStyle]}>{data.sales.completedOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.returnedOrders}</Text>
          <Text style={[styles.colRight, textStyle]}>{data.sales.returnedOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.grossRevenue}</Text>
          <Text style={[styles.colRight, textStyle]}>{formatCurrency(data.sales.grossRevenue)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.discounts}</Text>
          <Text style={[styles.colRight, textStyle]}>-{formatCurrency(data.sales.totalDiscounts)}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={[styles.col, textStyle, { fontWeight: 'bold' }]}>{l.netRevenue}</Text>
          <Text style={[styles.colRight, textStyle, { fontWeight: 'bold' }]}>{formatCurrency(data.sales.netRevenue)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.averageBasket}</Text>
          <Text style={[styles.colRight, textStyle]}>{formatCurrency(data.sales.averageBasket)}</Text>
        </View>

        {/* Payment Breakdown */}
        <Text style={[styles.sectionTitle, textStyle]}>{l.paymentBreakdown}</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col, textStyle]}>{l.paymentType}</Text>
          <Text style={[styles.col, textStyle]}>{l.category}</Text>
          <Text style={[styles.colRight, textStyle]}>{l.amount}</Text>
        </View>
        {data.paymentBreakdown.map((p, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={[styles.col, textStyle]}>{p.name}</Text>
            <Text style={[styles.col, textStyle]}>{p.category}</Text>
            <Text style={[styles.colRight, textStyle]}>{formatCurrency(p.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={[styles.col, textStyle]}>{l.total}</Text>
          <Text style={styles.col}></Text>
          <Text style={[styles.colRight, textStyle]}>
            {formatCurrency(data.paymentBreakdown.reduce((s, p) => s + p.amount, 0))}
          </Text>
        </View>

        {/* Cash Reconciliation */}
        <Text style={[styles.sectionTitle, textStyle]}>{l.cashReconciliation}</Text>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.openingBalance}</Text>
          <Text style={[styles.colRight, textStyle]}>{formatCurrency(data.cashReconciliation.openingBalance)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.cashReceived}</Text>
          <Text style={[styles.colRight, textStyle]}>{formatCurrency(data.cashReconciliation.cashReceived)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.cashAdded}</Text>
          <Text style={[styles.colRight, textStyle]}>{formatCurrency(data.cashReconciliation.cashAdded)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.cashWithdrawn}</Text>
          <Text style={[styles.colRight, textStyle]}>-{formatCurrency(data.cashReconciliation.cashWithdrawn)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.expenses}</Text>
          <Text style={[styles.colRight, textStyle]}>-{formatCurrency(data.cashReconciliation.expenses)}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={[styles.col, textStyle, { fontWeight: 'bold' }]}>{l.expectedCash}</Text>
          <Text style={[styles.colRight, textStyle, { fontWeight: 'bold' }]}>
            {formatCurrency(data.cashReconciliation.expectedCash)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.col, textStyle]}>{l.countedCash}</Text>
          <Text style={[styles.colRight, textStyle]}>{formatCurrency(data.cashReconciliation.countedCash)}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={[styles.col, textStyle, { fontWeight: 'bold' }]}>{l.variance}</Text>
          <Text style={[
            styles.colRight,
            textStyle,
            { fontWeight: 'bold' },
            data.cashReconciliation.variance < 0 ? styles.varianceNegative : {},
          ]}>
            {formatCurrency(data.cashReconciliation.variance)}
          </Text>
        </View>

        {/* Denomination Count */}
        {data.denominations && data.denominations.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, textStyle]}>{l.denominations}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.col, textStyle]}>{l.denomination}</Text>
              <Text style={[styles.col, textStyle]}>{l.count}</Text>
              <Text style={[styles.colRight, textStyle]}>{l.total}</Text>
            </View>
            {data.denominations.map((d, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.col, textStyle]}>{'\u200E'}{d.value} MRU{'\u200E'}</Text>
                <Text style={[styles.col, textStyle]}>{d.count}</Text>
                <Text style={[styles.colRight, textStyle]}>{formatCurrency(d.total)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.col, textStyle]}>{l.total}</Text>
              <Text style={styles.col}></Text>
              <Text style={[styles.colRight, textStyle]}>
                {formatCurrency(data.denominations.reduce((s, d) => s + d.total, 0))}
              </Text>
            </View>
          </>
        )}

        {/* Signature Block */}
        <View style={styles.signatureBlock}>
          <Text style={textStyle}>{l.signature}: ____________________</Text>
          <Text style={[textStyle, { marginTop: 5 }]}>
            {data.closedBy} - {formatDate(data.dateTo)}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {l.generatedAt}: {formatDate(data.generatedAt)} | {l.reportNumber}: Z-{data.zReportNumber}
        </Text>
      </Page>
    </Document>
  );
};

export default ZReportDocument;
