import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, RefreshCw, Battery } from 'lucide-react';

interface BatteryRecord {
  id: number;
  etiqueta: string;
  precio_neto: number;
  activo: boolean;
}

interface BatteryTableProps {
  initialBattery?: BatteryRecord;
}

export default function BatteryTable({ initialBattery }: BatteryTableProps) {
  const [battery, setBattery] = useState<BatteryRecord | null>(initialBattery || null);
  const [loading, setLoading] = useState(!initialBattery);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Partial<BatteryRecord>>({});

  const fetchBattery = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/battery');
      if (!res.ok) throw new Error('Error al cargar batería');
      const data = await res.json();
      setBattery(data.battery || null);
      setChanges({});
    } catch (err) {
      console.error('Error fetching battery:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, setState happens after the awaited fetch, not synchronously
    fetchBattery();
  }, []);

  const handlePriceChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setChanges(prev => ({ ...prev, precio_neto: numValue }));
  };

  const handleLabelChange = (value: string) => {
    setChanges(prev => ({ ...prev, etiqueta: value }));
  };

  const handleSave = async () => {
    if (!battery) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/battery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: battery.id,
          etiqueta: changes.etiqueta ?? battery.etiqueta,
          precioNeto: changes.precio_neto ?? battery.precio_neto,
          activo: battery.activo,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      setChanges({});
      await fetchBattery();
    } catch (err) {
      console.error('Error saving battery:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Batería Híbrida</h2>
        <Button onClick={fetchBattery} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F07E04]"></div>
        </div>
      ) : battery ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Battery className="w-5 h-5 text-[#F07E04]" />
              Configuración de Batería
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Etiqueta</label>
                <Input
                  defaultValue={changes.etiqueta ?? battery.etiqueta}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Precio Neto (CLP)</label>
                <Input
                  type="number"
                  defaultValue={changes.precio_neto ?? battery.precio_neto}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full"
                  min={0}
                />
              </div>
            </div>

            {hasChanges && (
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#F07E04] hover:bg-[#F09C0A]"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                  <Save className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay batería activa configurada
          </CardContent>
        </Card>
      )}
    </div>
  );
}