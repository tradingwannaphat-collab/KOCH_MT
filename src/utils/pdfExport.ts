import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfExportOptions {
  orientation?: 'portrait' | 'landscape' | 'auto';
  fitToOnePage?: boolean;
  marginMm?: number;
}

const UNSUPPORTED_COLOR_FN_RE = /(?:oklch|oklab|lch|lab|color-mix|color)\s*\(/i;
let colorResolverCtx: CanvasRenderingContext2D | null = null;

function resolveColorToSafeRgb(colorExpr: string, fallback = '#0f172a'): string {
  if (!colorExpr || colorExpr === 'none' || colorExpr === 'transparent') return colorExpr;
  if (!UNSUPPORTED_COLOR_FN_RE.test(colorExpr)) return colorExpr;

  try {
    if (!colorResolverCtx) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      colorResolverCtx = canvas.getContext('2d');
    }
    if (!colorResolverCtx) return fallback;

    colorResolverCtx.clearRect(0, 0, 1, 1);
    colorResolverCtx.fillStyle = '#010203';
    colorResolverCtx.fillStyle = colorExpr;
    const out = colorResolverCtx.fillStyle;
    // If browser rejected expression (kept sentinel '#010203' when input wasn't that hex)
    if (out === '#010203' && !colorExpr.toLowerCase().includes('010203')) {
      return fallback;
    }
    return out;
  } catch {
    return fallback;
  }
}

function replaceUnsupportedColorFunctions(cssValue: string, fallback = '#0f172a'): string {
  if (!cssValue || !UNSUPPORTED_COLOR_FN_RE.test(cssValue)) return cssValue;

  let result = '';
  let i = 0;
  const len = cssValue.length;

  while (i < len) {
    const slice = cssValue.slice(i);
    const match = slice.match(/^(oklch|oklab|lch|lab|color-mix|color)\s*\(/i);
    if (match) {
      let depth = 0;
      let j = i + match[0].length - 1; // at '('
      for (; j < len; j++) {
        if (cssValue[j] === '(') depth++;
        else if (cssValue[j] === ')') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      const fnExpr = cssValue.slice(i, j);
      result += resolveColorToSafeRgb(fnExpr, fallback);
      i = j;
    } else {
      result += cssValue[i];
      i++;
    }
  }

  return result;
}

function sanitizeClonedSubtreeColors(clonedDoc: Document, clonedEl: HTMLElement) {
  const win = clonedDoc.defaultView || window;

  // 1. Collect all elements starting from clonedEl + its ancestors up to body
  const targets: Element[] = [];
  let anc: HTMLElement | null = clonedEl.parentElement;
  while (anc && anc !== clonedDoc.documentElement) {
    targets.push(anc);
    anc = anc.parentElement;
  }
  targets.push(clonedEl);
  clonedEl.querySelectorAll('*').forEach((child) => targets.push(child));

  const colorProps = [
    'color',
    'background-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    '-webkit-text-stroke-color',
    'caret-color',
    'fill',
    'stroke'
  ] as const;

  for (const node of targets) {
    const elStyle = (node as HTMLElement).style;
    if (!elStyle) continue;

    const cs = win.getComputedStyle(node);
    for (const prop of colorProps) {
      const val = cs.getPropertyValue(prop);
      if (val && UNSUPPORTED_COLOR_FN_RE.test(val)) {
        const fb = prop === 'background-color' ? 'transparent' : '#0f172a';
        elStyle.setProperty(prop, replaceUnsupportedColorFunctions(val, fb), 'important');
      }
    }

    const bgImg = cs.getPropertyValue('background-image');
    if (bgImg && bgImg !== 'none' && UNSUPPORTED_COLOR_FN_RE.test(bgImg)) {
      const converted = replaceUnsupportedColorFunctions(bgImg, '#ffffff');
      elStyle.setProperty(
        'background-image',
        UNSUPPORTED_COLOR_FN_RE.test(converted) ? 'none' : converted,
        'important'
      );
    }

    const boxShadow = cs.getPropertyValue('box-shadow');
    if (boxShadow && boxShadow !== 'none' && UNSUPPORTED_COLOR_FN_RE.test(boxShadow)) {
      elStyle.setProperty('box-shadow', 'none', 'important');
    }

    const textShadow = cs.getPropertyValue('text-shadow');
    if (textShadow && textShadow !== 'none' && UNSUPPORTED_COLOR_FN_RE.test(textShadow)) {
      elStyle.setProperty('text-shadow', 'none', 'important');
    }
  }

  // 2. Clean safe root colors
  if (clonedDoc.documentElement?.style) {
    clonedDoc.documentElement.style.setProperty('background-color', '#ffffff', 'important');
    clonedDoc.documentElement.style.setProperty('color', '#0f172a', 'important');
  }
  if (clonedDoc.body?.style) {
    clonedDoc.body.style.setProperty('background-color', '#ffffff', 'important');
    clonedDoc.body.style.setProperty('color', '#0f172a', 'important');
  }

  // 3. Sanitize Tailwind v4 CSS rules & custom properties in same-origin styleSheets
  try {
    Array.from(clonedDoc.styleSheets).forEach((sheet) => {
      try {
        const rules = sheet.cssRules;
        if (!rules) return;
        const walkRules = (ruleList: CSSRuleList) => {
          for (let r = 0; r < ruleList.length; r++) {
            const rule = ruleList[r];
            if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
              walkRules((rule as CSSGroupingRule).cssRules);
            } else if ('style' in rule && (rule as CSSStyleRule).style) {
              const st = (rule as CSSStyleRule).style;
              for (let p = 0; p < st.length; p++) {
                const propName = st[p];
                const rawVal = st.getPropertyValue(propName);
                if (rawVal && UNSUPPORTED_COLOR_FN_RE.test(rawVal)) {
                  const safeVal = replaceUnsupportedColorFunctions(rawVal, '#0f172a');
                  if (!UNSUPPORTED_COLOR_FN_RE.test(safeVal)) {
                    st.setProperty(propName, safeVal, st.getPropertyPriority(propName));
                  } else if (propName.startsWith('--')) {
                    st.setProperty(propName, '#0f172a');
                  }
                }
              }
            }
          }
        };
        walkRules(rules);
      } catch {
        // Ignore cross-origin stylesheets (e.g., Google Fonts)
      }
    });
  } catch {
    // Ignore stylesheet access errors
  }

  // 4. Replace unsupported color functions inside <style> tags in clonedDoc
  clonedDoc.querySelectorAll('style').forEach((styleTag) => {
    if (styleTag.textContent && UNSUPPORTED_COLOR_FN_RE.test(styleTag.textContent)) {
      styleTag.textContent = replaceUnsupportedColorFunctions(styleTag.textContent, '#0f172a');
    }
  });
}

export function printElementOnly(
  element: HTMLElement | null,
  title?: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
): void {
  if (!element) {
    window.print();
    return;
  }

  const prevTitle = document.title;
  if (title) document.title = title;

  const existing = document.getElementById('koch-isolated-print-root');
  if (existing) existing.remove();

  const printRoot = document.createElement('div');
  printRoot.id = 'koch-isolated-print-root';

  const pageStyle = document.createElement('style');
  pageStyle.textContent = `
    @media print {
      @page {
        size: A4 ${orientation};
        margin: 5mm;
      }
      #koch-isolated-print-root {
        display: block !important;
        width: 100% !important;
        background: #ffffff !important;
      }
      #koch-isolated-print-root .no-print,
      #koch-isolated-print-root .print\\:hidden {
        display: none !important;
      }
      #koch-isolated-print-root .overflow-x-auto,
      #koch-isolated-print-root .overflow-hidden {
        overflow: visible !important;
        max-width: none !important;
      }
    }
  `;
  printRoot.appendChild(pageStyle);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.remove('hidden', 'shadow-2xl', 'shadow-xl', 'shadow-lg', 'rounded-xl', 'rounded-sm');
  clone.style.width = '100%';
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.boxShadow = 'none';
  printRoot.appendChild(clone);

  document.body.appendChild(printRoot);
  document.body.classList.add('koch-isolated-print');

  const cleanup = () => {
    document.body.classList.remove('koch-isolated-print');
    printRoot.remove();
    document.title = prevTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  // Fallback cleanup if afterprint isn't fired in headless/embedded browsers
  setTimeout(cleanup, 1500);
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

        // Convert all Tailwind v4 oklch/oklab/color-mix CSS colors into standard RGB so html2canvas never throws
        sanitizeClonedSubtreeColors(clonedDoc, clonedEl);
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
    // Isolated fallback print: prints ONLY the target document/table (never banners/headers/tabs)
    printElementOnly(
      element,
      fileName.replace('.pdf', ''),
      orientation === 'portrait' ? 'portrait' : 'landscape'
    );
    return false;
  }
}
