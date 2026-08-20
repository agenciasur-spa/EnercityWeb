import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw } from 'lucide-react';

interface RegionDispatchCost {
  id: number;
  region: string;
  dispatch_cost: number;
}

interface DispatchCostsTableProps {
  initialRegions?: RegionDispatchCost[];
}

export default function DispatchCostsTable({ initialRegions }: DispatchCostsTableProps) {
  const [regions, setRegions] = useState<RegionDispatchCost[]>(initialRegions || []);
  const [loading, setLoading] = useState(!initialRegions);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [changes, setChanges] = useState<Record<number, number>>({});

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dispatch-costs');
      if (!res.ok) throw new Error('Error al cargar costos de despacho');
      const data = await res.json();
      setRegions(data.regions || []);
      setChanges({});
    } catch (err) {
      console.error('Error fetching dispatch costs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, setState happens after the awaited fetch, not synchronously
    fetchRegions();
  }, [fetchRegions]);

  const filteredRegions = regions.filter((r) =>
    r.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCostChange = (regionId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setChanges((prev) => ({ ...prev, [regionId]: numValue }));
  };

  const handleSave = async (region: RegionDispatchCost) => {
    setSaving((prev) => ({ ...prev, [region.id]: true }));
    try {
      const res = await fetch('/api/admin/dispatch-costs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: region.region,
          dispatchCost: changes[region.id],
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      setRegions((prev) =>
        prev.map((r) => (r.id === region.id ? { ...r, dispatch_cost: changes[region.id] } : r))
      );
      setChanges((prev) => {
        const newChanges = { ...prev };
        delete newChanges[region.id];
        return newChanges;
      });
    } catch (err) {
      console.error('Error saving dispatch cost:', err);
      alert('Error al guardar el costo de despacho');
    } finally {
      setSaving((prev) => ({ ...prev, [region.id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Costo de Despacho por Región</h2>
          <p className="text-sm text-muted-foreground">
            Un único costo de despacho por región (no por comuna).
          </p>
        </div>
        <Button onClick={fetchRegions} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar región..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {Object.keys(changes).length > 0 && (
          <Badge variant="secondary">
            {Object.keys(changes).length} cambios sin guardar
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F07E04]"></div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regiones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Región</TableHead>
                  <TableHead className="w-40">Costo Despacho (CLP)</TableHead>
                  <TableHead className="w-32">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium">{region.region}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={changes[region.id] ?? region.dispatch_cost}
                        onChange={(e) => handleCostChange(region.id, e.target.value)}
                        className="w-full"
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      {changes[region.id] !== undefined && (
                        <Button
                          onClick={() => handleSave(region)}
                          disabled={saving[region.id]}
                          size="sm"
                          className="bg-[#F07E04] hover:bg-[#F09C0A]"
                        >
                          {saving[region.id] ? 'Guardando...' : 'Guardar'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
