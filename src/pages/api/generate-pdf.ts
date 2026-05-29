import type { APIRoute } from 'astro';
import { generatePDF } from '../../lib/pdfGenerator_new';
import type { PDFData } from '../../lib/pdf-types';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limit
  const ip = getClientIP(request, clientAddress);
  const rateLimit = checkRateLimit(ip, 'pdf');
  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.retryAfterSec!);
  }

  try {
    const data: PDFData = await request.json();

    // Basic validation
    if (!data.customerName || !data.systemPrice) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pdfBytes = await generatePDF(data);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Presupuesto-Solar-Enercity.pdf"`,
      },
    });
  } catch (error) {
    console.error('[API] Error generating PDF:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
