import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

const fmt = (value: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(value) + ' MRU';

const fmtDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

function buildRow(label: string, value: string | number, bold = false): string {
  const fw = bold ? 'font-weight:bold;' : '';
  const border = bold ? 'border-top:1px solid #000;padding-top:4px;' : '';
  return `<tr style="${border}">
    <td style="text-align:right;padding:3px 0;${fw}">${label}</td>
    <td style="text-align:left;padding:3px 0;${fw}">${value}</td>
  </tr>`;
}

function buildHtml(data: ZReportSnapshot): string {
  const paymentRows = data.paymentBreakdown
    .map(p => `<tr>
      <td style="text-align:right;padding:2px 4px;border-bottom:0.5px solid #ccc;">${p.name}</td>
      <td style="text-align:center;padding:2px 4px;border-bottom:0.5px solid #ccc;">${p.category}</td>
      <td style="text-align:left;padding:2px 4px;border-bottom:0.5px solid #ccc;">${fmt(p.amount)}</td>
    </tr>`)
    .join('');

  const paymentTotal = data.paymentBreakdown.reduce((s, p) => s + p.amount, 0);

  const denomRows = (data.denominations || [])
    .map(d => `<tr>
      <td style="text-align:right;padding:2px 4px;border-bottom:0.5px solid #ccc;">${d.value} MRU</td>
      <td style="text-align:center;padding:2px 4px;border-bottom:0.5px solid #ccc;">${d.count}</td>
      <td style="text-align:left;padding:2px 4px;border-bottom:0.5px solid #ccc;">${fmt(d.total)}</td>
    </tr>`)
    .join('');

  const denomTotal = (data.denominations || []).reduce((s, d) => s + d.total, 0);

  return `
<div id="z-report-ar" dir="rtl" style="
  font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
  font-size: 11px;
  padding: 30px;
  width: 595px;
  color: #000;
  direction: rtl;
">
  <!-- Header -->
  <div style="text-align:center;margin-bottom:12px;">
    <div style="font-size:18px;font-weight:bold;margin-bottom:6px;">تقرير Z</div>
    <div>تقرير Z رقم: Z-${data.zReportNumber}</div>
    <div>المتجر: ${data.store.name}${data.store.location ? ` - ${data.store.location}` : ''}</div>
    <div>الطرفية: ${data.terminal.code}</div>
    <div>من: ${fmtDate(data.dateFrom)} | إلى: ${fmtDate(data.dateTo)}</div>
    <div>فتح من طرف: ${data.openedBy} | أغلق من طرف: ${data.closedBy}</div>
  </div>

  <!-- Sales Summary -->
  <div style="font-size:12px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:3px;margin-top:15px;margin-bottom:5px;">
    ملخص المبيعات
  </div>
  <table style="width:100%;border-collapse:collapse;">
    ${buildRow('عدد التذاكر', data.sales.totalOrders)}
    ${buildRow('التذاكر المكتملة', data.sales.completedOrders)}
    ${buildRow('المرتجعات', data.sales.returnedOrders)}
    ${buildRow('الإيرادات الإجمالية', fmt(data.sales.grossRevenue))}
    ${buildRow('الخصومات', '-' + fmt(data.sales.totalDiscounts))}
    ${buildRow('صافي الإيرادات', fmt(data.sales.netRevenue), true)}
    ${buildRow('متوسط السلة', fmt(data.sales.averageBasket))}
  </table>

  <!-- Payment Breakdown -->
  <div style="font-size:12px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:3px;margin-top:15px;margin-bottom:5px;">
    توزيع طرق الدفع
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr style="font-weight:bold;border-bottom:1px solid #000;">
      <td style="text-align:right;padding:3px 4px;">الطريقة</td>
      <td style="text-align:center;padding:3px 4px;">النوع</td>
      <td style="text-align:left;padding:3px 4px;">المبلغ</td>
    </tr>
    ${paymentRows}
    <tr style="font-weight:bold;border-top:1px solid #000;">
      <td style="text-align:right;padding:4px;">المجموع</td>
      <td></td>
      <td style="text-align:left;padding:4px;">${fmt(paymentTotal)}</td>
    </tr>
  </table>

  <!-- Cash Reconciliation -->
  <div style="font-size:12px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:3px;margin-top:15px;margin-bottom:5px;">
    تسوية الصندوق
  </div>
  <table style="width:100%;border-collapse:collapse;">
    ${buildRow('رصيد الافتتاح', fmt(data.cashReconciliation.openingBalance))}
    ${buildRow('النقد المستلم', fmt(data.cashReconciliation.cashReceived))}
    ${buildRow('إضافات', fmt(data.cashReconciliation.cashAdded))}
    ${buildRow('سحوبات', '-' + fmt(data.cashReconciliation.cashWithdrawn))}
    ${buildRow('مصاريف', '-' + fmt(data.cashReconciliation.expenses))}
    ${buildRow('النقد المتوقع', fmt(data.cashReconciliation.expectedCash), true)}
    ${buildRow('النقد المحسوب', fmt(data.cashReconciliation.countedCash))}
    <tr style="border-top:1px solid #000;padding-top:4px;">
      <td style="text-align:right;padding:4px 0;font-weight:bold;">الفرق</td>
      <td style="text-align:left;padding:4px 0;font-weight:bold;${data.cashReconciliation.variance < 0 ? 'color:#dc3545;' : ''}">
        ${fmt(data.cashReconciliation.variance)}
      </td>
    </tr>
  </table>

  ${data.denominations && data.denominations.length > 0 ? `
  <!-- Denominations -->
  <div style="font-size:12px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:3px;margin-top:15px;margin-bottom:5px;">
    عد الأوراق النقدية
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr style="font-weight:bold;border-bottom:1px solid #000;">
      <td style="text-align:right;padding:3px 4px;">الفئة</td>
      <td style="text-align:center;padding:3px 4px;">العدد</td>
      <td style="text-align:left;padding:3px 4px;">المجموع</td>
    </tr>
    ${denomRows}
    <tr style="font-weight:bold;border-top:1px solid #000;">
      <td style="text-align:right;padding:4px;">المجموع</td>
      <td></td>
      <td style="text-align:left;padding:4px;">${fmt(denomTotal)}</td>
    </tr>
  </table>
  ` : ''}

  <!-- Signature -->
  <div style="margin-top:40px;border-top:1px solid #000;padding-top:10px;text-align:right;">
    <div>توقيع المدير: ____________________</div>
    <div style="margin-top:5px;">${data.closedBy} - ${fmtDate(data.dateTo)}</div>
  </div>

  <!-- Footer -->
  <div style="text-align:center;font-size:8px;color:#666;margin-top:30px;">
    تم الإنشاء في: ${fmtDate(data.generatedAt)} | تقرير Z رقم: Z-${data.zReportNumber}
  </div>
</div>`;
}

export async function generateZReportArabicPdf(data: ZReportSnapshot): Promise<Blob> {
  const html = buildHtml(data);

  // Create a temporary container — must be visible for html2canvas to render
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-9999';
  document.body.appendChild(container);

  const element = container.firstElementChild as HTMLElement;

  try {
    // Step 1: Render HTML to canvas using html2canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Step 2: Convert canvas to image data
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Step 3: Create PDF with jsPDF
    const pdfDoc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
    });

    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    const margin = 10;

    // Scale the image to fit the page with margins
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const imgRatio = canvas.height / canvas.width;
    let imgWidth = availableWidth;
    let imgHeight = imgWidth * imgRatio;

    // If image is taller than the page, scale down
    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight / imgRatio;
    }

    pdfDoc.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);

    // Step 4: Output as blob
    return pdfDoc.output('blob');
  } finally {
    document.body.removeChild(container);
  }
}
