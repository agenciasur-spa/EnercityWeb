/**
 * downloadPDF.ts — Client-safe PDF download helper.
 *
 * This file MUST NOT import any server-only modules (fs, path, etc.).
 * It dynamically imports generatePDF from pdfGenerator_new at runtime,
 * which keeps the server code out of the client bundle.
 */

import type { PDFData } from './pdf-types.js';

/**
 * Generates a PDF and triggers a browser download.
 * Uses dynamic import to avoid bundling server-only code in the client.
 */
export async function downloadPDF(data: PDFData): Promise<void> {
  try {
    const { generatePDF } = await import('./pdfGenerator_new.js');
    const pdfBytes: Uint8Array = await generatePDF(data);
    const blob: Blob = new Blob([pdfBytes.buffer as ArrayBuffer], {
      type: 'application/pdf',
    });
    const url: string = URL.createObjectURL(blob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = url;
    link.download = `Presupuesto-Solar-Enercity-${data.customerName.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    console.error('Error generating PDF:', error);
  }
}
