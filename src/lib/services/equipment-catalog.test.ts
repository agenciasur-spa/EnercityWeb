import { describe, it, expect } from 'vitest';
import {
  findActiveEquipmentByType,
  buildEquipmentCard,
} from './equipment-catalog';
import type { EquipmentDetail } from '../../types/simulation';

describe('equipment-catalog service', () => {
  describe('findActiveEquipmentByType', () => {
    const mockCatalog: EquipmentDetail[] = [
      {
        id: 1,
        tipo: 'inversor',
        nombre: 'Active Inverter',
        marca: 'GoodWe',
        modelo: 'GW3000-NS',
        potenciaWatts: 3000,
        imagenUrl: 'https://example.com/inverter.jpg',
        fichaTecnicaUrl: 'https://example.com/inverter.pdf',
        activo: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 2,
        tipo: 'inversor',
        nombre: 'Inactive Inverter',
        marca: 'GoodWe',
        modelo: 'GW5000-NS',
        potenciaWatts: 5000,
        activo: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 3,
        tipo: 'panel',
        nombre: 'Active Panel',
        marca: 'Trina Solar',
        modelo: 'Vertex S+ 410W',
        potenciaWatts: 410,
        imagenUrl: 'https://example.com/panel.jpg',
        fichaTecnicaUrl: 'https://example.com/panel.pdf',
        activo: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    it('finds active inverter by type', () => {
      const result = findActiveEquipmentByType(mockCatalog, 'inversor');
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.nombre).toBe('Active Inverter');
      expect(result?.activo).toBe(true);
    });

    it('finds active panel by type', () => {
      const result = findActiveEquipmentByType(mockCatalog, 'panel');
      expect(result).not.toBeNull();
      expect(result?.id).toBe(3);
      expect(result?.nombre).toBe('Active Panel');
      expect(result?.activo).toBe(true);
    });

    it('returns null when no active equipment of type exists', () => {
      const catalogWithoutActivePanels: EquipmentDetail[] = [
        {
          id: 1,
          tipo: 'panel',
          nombre: 'Inactive Panel',
          marca: 'Trina',
          activo: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const result = findActiveEquipmentByType(catalogWithoutActivePanels, 'panel');
      expect(result).toBeNull();
    });

    it('returns null when catalog is empty', () => {
      const result = findActiveEquipmentByType([], 'inversor');
      expect(result).toBeNull();
    });
  });

  describe('buildEquipmentCard', () => {
    const mockEquipment: EquipmentDetail = {
      id: 1,
      tipo: 'inversor',
      nombre: 'Premium Inverter',
      marca: 'GoodWe',
      modelo: 'GW3000-NS',
      potenciaWatts: 3000,
      imagenUrl: 'https://example.com/inverter.jpg',
      fichaTecnicaUrl: 'https://example.com/inverter.pdf',
      activo: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('builds card with catalog data when available', () => {
      const card = buildEquipmentCard(mockEquipment, 'inversor', {
        nombre: 'Fallback',
        marca: 'Fallback',
      });

      expect(card).toMatchObject({
        id: 1,
        tipo: 'inversor',
        nombre: 'Premium Inverter',
        marca: 'GoodWe',
        modelo: 'GW3000-NS',
        potenciaWatts: 3000,
        imagenUrl: 'https://example.com/inverter.jpg',
        fichaTecnicaUrl: 'https://example.com/inverter.pdf',
        activo: true,
      });
    });

    it('falls back to provided data when catalog is null', () => {
      const card = buildEquipmentCard(null, 'panel', {
        nombre: 'Fallback Panel',
        marca: 'Trina',
        modelo: 'Vertex 410W',
        potenciaWatts: 410,
      });

      expect(card).toMatchObject({
        id: 0,
        tipo: 'panel',
        nombre: 'Fallback Panel',
        marca: 'Trina',
        modelo: 'Vertex 410W',
        potenciaWatts: 410,
        imagenUrl: undefined,
        fichaTecnicaUrl: undefined,
        activo: true,
      });
    });

    it('handles missing URLs in catalog data', () => {
      const equipmentWithoutUrls: EquipmentDetail = {
        id: 2,
        tipo: 'panel',
        nombre: 'Panel Without URLs',
        marca: 'Trina',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const card = buildEquipmentCard(equipmentWithoutUrls, 'panel', {
        nombre: 'Fallback',
        marca: 'Fallback',
      });

      expect(card.imagenUrl).toBeUndefined();
      expect(card.fichaTecnicaUrl).toBeUndefined();
    });
  });
});