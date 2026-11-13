import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape' | 'auto';
  fitToOnePage?: boolean;
  marginMm?: number;
}

export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string = 'รายชื่อทะเบียนเครื่องมือ-เครื่องจักร_FM-MN01-01.pdf',
  options: PdfExportOptions = {}
): Promise<boolean> {
  const { orientation = 'auto', fitToOnePage = true, marginMm = 6 } = options;

  try {
    // Capture unclipped width in case the element or an inner wrapper scrolls horizontally or is hidden
    const captureTargetWidth = Math.max(
      element.scrollWidth,
      element.offsetWidth,
      1050
    );

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: captureTargetWidth + 80,
      onclone: (clonedDoc, clonedEl) => {
        // Ensure cloned element & any hidden ancestors render visibly at full unclipped width
        let curr: HTMLElement | null = clonedEl;
        while (curr && curr !== clonedDoc.body) {
          if (curr.classList.contains('hidden')) {
            curr.classList.remove('hidden');
            curr.style.display = 'block';
          }
          if (getComputedStyle(curr).display === 'none') {
            curr.style.display = 'block';
          }
          if (curr.style.left && curr.style.left.includes('-9999')) {
            curr.style.position = 'static';
            curr.style.left = '0';
          }
          curr = curr.parentElement;
        }

        clonedEl.style.overflow = 'visible';
        clonedEl.style.maxWidth = 'none';
        if (clonedEl.scrollWidth > clonedEl.clientWidth) {
          clonedEl.style.width = `${clonedEl.scrollWidth}px`;
        }

        // Expand any horizontally scrollable inner containers so right-most table columns aren't cut off
        clonedEl.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-hidden').forEach((node) => {
          node.style.overflow = 'visible';
          node.style.maxWidth = 'none';
        });

        // Hide interactive toolbars / buttons marked print:hidden or no-print
        clonedEl.querySelectorAll<HTMLElement>('.no-print, .print\\:hidden').forEach((node) => {
          node.style.display = 'none';
        });
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.96);

    // Choose orientation automatically based on aspect ratio unless explicitly specified
    const resolvedOrientation: 'portrait' | 'landscape' =
      orientation === 'auto'
        ? canvas.width > canvas.height * 1.05
          ? 'landscape'
          : 'portrait'
        : orientation;

    const pdf = new jsPDF({
      orientation: resolvedOrientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const availWidth = pageWidth - marginMm * 2;
    const availHeight = pageHeight - marginMm * 2;

    if (fitToOnePage) {
      // Scale proportionally so the ENTIRE document fits cleanly inside 1 A4 page (width AND height)
      const scale = Math.min(availWidth / canvas.width, availHeight / canvas.height);
      const renderWidth = canvas.width * scale;
      const renderHeight = canvas.height * scale;
      const offsetX = (pageWidth - renderWidth) / 2;
      const offsetY = marginMm;

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderWidth, renderHeight);
    } else {
      const contentWidth = availWidth;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= availHeight) {
        pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidth, contentHeight);
      } else {
        let heightLeft = contentHeight;
        let position = marginMm;

        pdf.addImage(imgData, 'JPEG', marginMm, position, contentWidth, contentHeight);
        heightLeft -= availHeight;

        while (heightLeft > 0) {
          position = heightLeft - contentHeight + marginMm;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', marginMm, position, contentWidth, contentHeight);
          heightLeft -= availHeight;
        }
      }
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    const prevTitle = document.title;
    document.title = fileName.replace('.pdf', '');
    window.print();
    document.title = prevTitle;
    return false;
  }
}
