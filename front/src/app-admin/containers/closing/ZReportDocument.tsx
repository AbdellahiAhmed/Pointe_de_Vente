import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DateTime } from 'luxon';

// This component is used ONLY for French PDF generation.
// Arabic PDFs are generated via html2pdf.js (see generateZReportArabicPdf.ts)
// because react-pdf cannot correctly measure Arabic glyph widths.

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
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
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(value) + ' MRU';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return DateTime.fromISO(dateStr).toFormat('dd/MM/yyyy HH:mm');
};

const ZReportDocument: React.FC<ZReportDocumentProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <Text style={styles.header}>RAPPORT Z</Text>
        <Text style={styles.subHeader}>
          {`Rapport Z N: Z-${data.zReportNumber}`}
        </Text>
        <Text style={styles.subHeader}>
          {`Magasin: ${data.store.name}${data.store.location ? ` - ${data.store.location}` : ''}`}
        </Text>
        <Text style={styles.subHeader}>
          {`Terminal: ${data.terminal.code}`}
        </Text>
        <Text style={styles.subHeader}>
          {`Du: ${formatDate(data.dateFrom)} | Au: ${formatDate(data.dateTo)}`}
        </Text>
        <Text style={styles.subHeader}>
          {`Ouvert par: ${data.openedBy} | Cloture par: ${data.closedBy}`}
        </Text>

        {/* Sales Summary */}
        <Text style={styles.sectionTitle}>Resume des Ventes</Text>
        <View style={styles.row}>
          <Text style={styles.col}>Nombre de tickets</Text>
          <Text style={styles.colRight}>{data.sales.totalOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Tickets completes</Text>
          <Text style={styles.colRight}>{data.sales.completedOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Retours</Text>
          <Text style={styles.colRight}>{data.sales.returnedOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Chiffre d'affaires brut</Text>
          <Text style={styles.colRight}>{formatCurrency(data.sales.grossRevenue)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Remises</Text>
          <Text style={styles.colRight}>-{formatCurrency(data.sales.totalDiscounts)}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Chiffre d'affaires net</Text>
          <Text style={[styles.colRight, { fontWeight: 'bold' }]}>{formatCurrency(data.sales.netRevenue)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Panier moyen</Text>
          <Text style={styles.colRight}>{formatCurrency(data.sales.averageBasket)}</Text>
        </View>

        {/* Payment Breakdown */}
        <Text style={styles.sectionTitle}>Ventilation par Mode de Paiement</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Mode</Text>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Type</Text>
          <Text style={[styles.colRight, { fontWeight: 'bold' }]}>Montant</Text>
        </View>
        {data.paymentBreakdown.map((p, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.col}>{p.name}</Text>
            <Text style={styles.col}>{p.category}</Text>
            <Text style={styles.colRight}>{formatCurrency(p.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Total</Text>
          <Text style={{ flex: 1 }}>{''}</Text>
          <Text style={[styles.colRight, { fontWeight: 'bold' }]}>
            {formatCurrency(data.paymentBreakdown.reduce((s, p) => s + p.amount, 0))}
          </Text>
        </View>

        {/* Cash Reconciliation */}
        <Text style={styles.sectionTitle}>Reconciliation de Caisse</Text>
        <View style={styles.row}>
          <Text style={styles.col}>Fond d'ouverture</Text>
          <Text style={styles.colRight}>{formatCurrency(data.cashReconciliation.openingBalance)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Especes recues</Text>
          <Text style={styles.colRight}>{formatCurrency(data.cashReconciliation.cashReceived)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Ajouts</Text>
          <Text style={styles.colRight}>{formatCurrency(data.cashReconciliation.cashAdded)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Retraits</Text>
          <Text style={styles.colRight}>-{formatCurrency(data.cashReconciliation.cashWithdrawn)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Depenses</Text>
          <Text style={styles.colRight}>-{formatCurrency(data.cashReconciliation.expenses)}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Especes attendues</Text>
          <Text style={[styles.colRight, { fontWeight: 'bold' }]}>
            {formatCurrency(data.cashReconciliation.expectedCash)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.col}>Especes comptees</Text>
          <Text style={styles.colRight}>{formatCurrency(data.cashReconciliation.countedCash)}</Text>
        </View>
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 3 }]}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Ecart</Text>
          <Text style={[
            styles.colRight,
            { fontWeight: 'bold' },
            data.cashReconciliation.variance < 0 ? styles.varianceNegative : {},
          ]}>
            {formatCurrency(data.cashReconciliation.variance)}
          </Text>
        </View>

        {/* Denomination Count */}
        {data.denominations && data.denominations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Comptage des Coupures</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.col, { fontWeight: 'bold' }]}>Coupure</Text>
              <Text style={[styles.col, { fontWeight: 'bold' }]}>Nombre</Text>
              <Text style={[styles.colRight, { fontWeight: 'bold' }]}>Total</Text>
            </View>
            {data.denominations.map((d, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={styles.col}>{d.value} MRU</Text>
                <Text style={styles.col}>{d.count}</Text>
                <Text style={styles.colRight}>{formatCurrency(d.total)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.col, { fontWeight: 'bold' }]}>Total</Text>
              <Text style={{ flex: 1 }}>{''}</Text>
              <Text style={[styles.colRight, { fontWeight: 'bold' }]}>
                {formatCurrency(data.denominations.reduce((s, d) => s + d.total, 0))}
              </Text>
            </View>
          </>
        )}

        {/* Signature Block */}
        <View style={styles.signatureBlock}>
          <Text>Signature du gerant: ____________________</Text>
          <Text style={{ marginTop: 5 }}>
            {data.closedBy} - {formatDate(data.dateTo)}
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {`Genere le: ${formatDate(data.generatedAt)} | Rapport Z N: Z-${data.zReportNumber}`}
        </Text>
      </Page>
    </Document>
  );
};

export default ZReportDocument;
