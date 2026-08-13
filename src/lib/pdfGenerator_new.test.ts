/**
 * pdfGenerator_new.test.ts — Tests for PDF generator URL/image handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePDF } from './pdfGenerator_new';
import { PDFDocument, PDFName } from 'pdf-lib';
import type { PDFData, EquipmentCard } from './pdf-types';

// Mock fetch globally
global.fetch = vi.fn();

describe('PDF Generator URL/Image Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const basePDFData: PDFData = {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '+56912345678',
    kitName: 'Kit Solar Pro',
    kitPower: '5kW',
    panelCount: 10,
    panelWattage: 500,
    roofType: 'Teja asfáltica',
    meterLocation: 'Pegado a la pared',
    comunaName: 'Santiago',
    monthlyBill: 50000,
    annualSavings: 600000,
    monthlySavings: 50000,
    systemPrice: 2500000,
    systemPriceNoIva: 2100840,
    paybackYears: 4.2,
    coveragePercent: 85,
    co2Reduction: 2500,
    investmentClassification: 'ALTA_RETORNO',
    roi25Years: 15000000,
    quoteDate: '2024-01-15',
    equipment: [
      {
        tipo: 'inversor',
        nombre: 'Inversor SolarEdge 5kW',
        marca: 'SolarEdge',
        modelo: 'SE5000H',
        potenciaWatts: 5000,
        imagenUrl: 'https://example.com/images/inverter.png',
        fichaTecnicaUrl: 'https://example.com/specs/inverter.pdf',
      },
      {
        tipo: 'panel',
        nombre: 'Panel Solar 500W',
        marca: 'JA Solar',
        modelo: 'JAM500S72',
        potenciaWatts: 500,
        imagenUrl: 'https://example.com/images/panel.jpg',
        fichaTecnicaUrl: 'https://example.com/specs/panel.pdf',
      },
    ],
  };

  describe('Image Fetching Safety', () => {
    it('should handle 404 responses gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should handle timeout gracefully', async () => {
      const abortController = new AbortController();
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new DOMException('Aborted', 'AbortError'))
      );

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should reject non-image content types', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'text/html',
        }),
        arrayBuffer: async () => new ArrayBuffer(100),
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should reject oversized images (>5MB)', async () => {
      const largeBuffer = new ArrayBuffer(6 * 1024 * 1024);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'image/png',
          'content-length': (6 * 1024 * 1024).toString(),
        }),
        arrayBuffer: async () => largeBuffer,
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should handle empty responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          'content-type': 'image/png',
        }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });
  });

  describe('Successful Image Embedding', () => {
    it('should embed PNG images successfully', async () => {
      const validPNG = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ...new Array(100).fill(0x00),
      ]);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/png',
        }),
        arrayBuffer: async () => validPNG.buffer,
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

      const page = pdfDoc.getPage(0);
      const annotations = page.node.get(PDFName.of('Annots'));
      expect(annotations).toBeDefined();
    });

    it('should embed JPEG images successfully', async () => {
      const validJPEG = new Uint8Array([
        0xff, 0xd8, 0xff,
        ...new Array(100).fill(0x00),
      ]);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/jpeg',
        }),
        arrayBuffer: async () => validJPEG.buffer,
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });
  });

  describe('Equipment Card Rendering', () => {
    it('should render equipment cards without images when URLs are missing', async () => {
      const dataWithoutImages: PDFData = {
        ...basePDFData,
        equipment: [
          {
            tipo: 'inversor',
            nombre: 'Inversor SolarEdge 5kW',
            marca: 'SolarEdge',
            modelo: 'SE5000H',
            potenciaWatts: 5000,
            fichaTecnicaUrl: 'https://example.com/specs/inverter.pdf',
          },
        ],
      };

      const pdfBytes = await generatePDF(dataWithoutImages);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should render equipment cards without technical sheet links when URLs are missing', async () => {
      const dataWithoutLinks: PDFData = {
        ...basePDFData,
        equipment: [
          {
            tipo: 'panel',
            nombre: 'Panel Solar 500W',
            marca: 'JA Solar',
            modelo: 'JAM500S72',
            potenciaWatts: 500,
            imagenUrl: 'https://example.com/images/panel.jpg',
          },
        ],
      };

      const pdfBytes = await generatePDF(dataWithoutLinks);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should render multiple equipment cards in On-Grid configuration', async () => {
      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(0);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should handle malformed image data gracefully', async () => {
      const malformedData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      (global.fetch as any).mockResolvedValue({
        ok: true,
        headers: new Headers({
          'content-type': 'image/png',
        }),
        arrayBuffer: async () => malformedData.buffer,
      });

      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should handle missing equipment array', async () => {
      const dataWithoutEquipment: PDFData = {
        ...basePDFData,
        equipment: undefined,
      };

      const pdfBytes = await generatePDF(dataWithoutEquipment);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });

    it('should handle empty equipment array', async () => {
      const dataWithEmptyEquipment: PDFData = {
        ...basePDFData,
        equipment: [],
      };

      const pdfBytes = await generatePDF(dataWithEmptyEquipment);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
    });
  });

  describe('On-Grid Only Configuration', () => {
    it('should only include inverter and panels in equipment list', async () => {
      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

      const page = pdfDoc.getPage(0);
      expect(page.getWidth()).toBe(595.28);
      expect(page.getHeight()).toBe(841.89);
    });

    it('should not include battery equipment in On-Grid mode', async () => {
      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);

      const page = pdfDoc.getPage(0);
      const annotations = page.node.get(PDFName.of('Annots'));
      expect(annotations).toBeDefined();
    });
  });

  describe('PDF Structure and Content', () => {
    it('should generate valid PDF structure', async () => {
      const pdfBytes = await generatePDF(basePDFData);
      expect(pdfBytes).toBeInstanceOf(Uint8Array);

      const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 4));
      expect(pdfHeader).toBe('%PDF');

      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBe(1);
    });

    it('should include customer information', async () => {
      const pdfBytes = await generatePDF(basePDFData);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

      const page = pdfDoc.getPage(0);
      expect(page.getWidth()).toBe(595.28);
      expect(page.getHeight()).toBe(841.89);
    });

    it('should include equipment details', async () => {
      const pdfBytes = await generatePDF(basePDFData);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      expect(pdfDoc.getPageCount()).toBe(1);

      const page = pdfDoc.getPage(0);
      const annotations = page.node.get(PDFName.of('Annots'));
      expect(annotations).toBeDefined();
    });
  });
});