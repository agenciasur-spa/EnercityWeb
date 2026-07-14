import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Kit {
  id: number;
  rango_desde: number;
  rango_hasta: number;
  inversor_kw: number;
  paneles: number;
  potencia_panel: number;
  potencia_total_sistema: number;
  generacion_anual: number;
  precio_lista: number;
  precio_transferencia: number;
}

interface PreciosTableProps {
  initialKits: Kit[];
}

type FieldName =
  | 'rango_desde' | 'rango_hasta' | 'inversor_kw' | 'paneles'
  | 'potencia_panel' | 'potencia_total_sistema' | 'generacion_anual'
  | 'precio_lista' | 'precio_transferencia';

const PRICE_FIELDS: FieldName[] = ['precio_lista', 'precio_transferencia'];

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(value: number): string {
  return clpFormatter.format(value);
}

interface ColumnDef {
  field: FieldName;
  label: string;
  isPrice?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { field: 'rango_desde', label: 'Rango Desde' },
  { field: 'rango_hasta', label: 'Rango Hasta' },
  { field: 'inversor_kw', label: 'Inversor kW' },
  { field: 'paneles', label: 'Paneles' },
  { field: 'potencia_panel', label: 'Potencia Panel (W)' },
  { field: 'potencia_total_sistema', label: 'Potencia Total (kW)' },
  { field: 'generacion_anual', label: 'Generacion Anual (kWh)' },
  { field: 'precio_lista', label: 'Precio Lista', isPrice: true },
  { field: 'precio_transferencia', label: 'Precio Transferencia', isPrice: true },
];

export default function PreciosTable({ initialKits }: PreciosTableProps) {
  const [kits, setKits] = useState<Kit[]>(initialKits);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: FieldName } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [errorCells, setErrorCells] = useState<Map<string, string>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const cellKey = (rowId: number, field: string) => `${rowId}-${field}`;

  const handleStartEdit = useCallback((kit: Kit, field: FieldName) => {
    setEditingCell({ rowId: kit.id, field });
    setEditValue(String(kit[field]));
  }, []);

  const handleSave = useCallback(async (rowId: number, field: FieldName, value: string) => {
    const key = cellKey(rowId, field);
    const kit = kits.find((k) => k.id === rowId);
    if (!kit) return;

    const numValue = Number(value);
    if (isNaN(numValue) || numValue === kit[field]) {
      setEditingCell(null);
      setEditValue('');
      return;
    }

    setSavingCell(key);
    setEditingCell(null);
    setEditValue('');

    // Optimistic update
    const updatedKit = { ...kit, [field]: numValue };
    setKits((prev) => prev.map((k) => (k.id === rowId ? updatedKit : k)));
    setDirtyCells((prev) => new Set(prev).add(key));
    setErrorCells((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

    try {
      const res = await fetch('/api/admin/precios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rowId,
          [field]: numValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      const { data: saved } = await res.json();
      setKits((prev) => prev.map((k) => (k.id === rowId ? { ...k, ...saved } : k)));

      // Clear dirty state after successful save
      setTimeout(() => {
        setDirtyCells((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 1500);
    } catch (err) {
      // Revert optimistic update
      setKits((prev) => prev.map((k) => (k.id === rowId ? { ...k, [field]: kit[field] } : k)));
      setDirtyCells((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setErrorCells((prev) => {
        const next = new Map(prev);
        next.set(key, err instanceof Error ? err.message : 'Error desconocido');
        return next;
      });
    } finally {
      setSavingCell(null);
    }
  }, [kits]);

  const handleBlur = useCallback(() => {
    if (!editingCell) return;
    handleSave(editingCell.rowId, editingCell.field, editValue);
  }, [editingCell, editValue, handleSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [handleBlur]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#154660]">Precios Kits</h1>
        <p className="text-sm text-muted-foreground">
          {kits.length} kits — click en cualquier celda para editar
        </p>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-muted-foreground">#</TableHead>
              {COLUMNS.map((col) => (
                <TableHead key={col.field}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.map((kit, idx) => (
              <TableRow key={kit.id}>
                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                {COLUMNS.map((col) => {
                  const key = cellKey(kit.id, col.field);
                  const isEditing = editingCell?.rowId === kit.id && editingCell?.field === col.field;
                  const isDirty = dirtyCells.has(key);
                  const isSaving = savingCell === key;
                  const errorMsg = errorCells.get(key);

                  return (
                    <TableCell key={col.field}>
                      {isEditing ? (
                        <Input
                          ref={inputRef}
                          type="number"
                          step={col.isPrice ? '1' : '0.01'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          className="h-8 w-28"
                        />
                      ) : (
                        <button
                          onClick={() => handleStartEdit(kit, col.field)}
                          className={`block min-w-[60px] rounded px-2 py-1 text-left text-sm transition-colors hover:bg-muted ${
                            isDirty
                              ? 'border border-orange-300 bg-orange-50'
                              : errorMsg
                                ? 'border border-red-300 bg-red-50 text-red-700'
                                : ''
                          } ${isSaving ? 'opacity-50' : ''}`}
                          title={errorMsg ?? undefined}
                        >
                          {col.isPrice
                            ? formatCLP(kit[col.field])
                            : kit[col.field]}
                        </button>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {errorCells.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(errorCells.entries()).map(([key, msg]) => (
            <Badge key={key} variant="destructive" className="text-xs">
              {msg}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
