/**
 * downloadPDF.ts — Client-safe PDF download helper.
 *
 * Calls the server API to generate the PDF and triggers a browser download.
 * No server-only modules (fs, pdf-lib, etc.) are imported in the client.
 */

import type { PDFData } from './pdf-types.js';

/**
 * Calls the server PDF endpoint and triggers a browser download.
 */
export async function downloadPDF(data: PDFData): Promise<void> {
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `PDF generation failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Presupuesto-Solar-Enercity-${data.customerName.replace(/\s+/g, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
