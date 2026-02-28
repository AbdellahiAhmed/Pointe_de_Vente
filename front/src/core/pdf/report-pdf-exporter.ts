import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExportOptions {
  filename: string;
  title?: string;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Export a DOM element as a PDF using html2canvas + jsPDF.
 * Works for both LTR (FR) and RTL (AR) layouts.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { filename, orientation = 'portrait' } = options;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const availableWidth = pageWidth - margin * 2;

  const imgWidth = availableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // If the image fits on one page
  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
  } else {
    // Multi-page: slice the canvas into page-sized chunks
    const pageContentHeight = pageHeight - margin * 2;
    const scaleFactor = canvas.width / imgWidth;
    const sliceHeight = pageContentHeight * scaleFactor;
    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < canvas.height) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      const remainingHeight = canvas.height - yOffset;
      const currentSlice = Math.min(sliceHeight, remainingHeight);

      // Create a slice canvas
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = currentSlice;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, -yOffset);
      }

      const sliceImg = sliceCanvas.toDataURL('image/png');
      const sliceImgHeight = (currentSlice * imgWidth) / canvas.width;
      pdf.addImage(sliceImg, 'PNG', margin, margin, imgWidth, sliceImgHeight);

      yOffset += sliceHeight;
      pageNum++;
    }
  }

  pdf.save(filename);
}
