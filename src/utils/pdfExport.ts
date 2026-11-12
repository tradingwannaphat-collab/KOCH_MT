import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string = 'รายชื่อทะเบียนเครื่องมือ-เครื่องจักร_FM-MN01-01.pdf'
): Promise<boolean> {
  try {
    // Generate high resolution canvas
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Scale image to fit A4 width with margins
    const margin = 10; // 10mm
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    } else {
      // Multi-page handling if table is long
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= (pageHeight - margin * 2);
      }
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to print with proper title
    const prevTitle = document.title;
    document.title = fileName.replace('.pdf', '');
    window.print();
    document.title = prevTitle;
    return false;
  }
}
