import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Save, RefreshCw } from 'lucide-react';

interface Comuna {
  id: number;
  nombre: string;
  region: string;
  dispatch_cost: number;
}

interface DispatchCostsTableProps {
  initialComunas?: Comuna[];
}

export default function DispatchCostsTable({ initialComunas }: DispatchCostsTableProps) {
  const [comunas, setComunas] = useState<Comuna[]>(initialComunas || []);
  const [loading, setLoading] = useState(!initialComunas);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [changes, setChanges] = useState<Record<number, number>>({});

  const fetchComunas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dispatch-costs');
      if (!res.ok) throw new Error('Error al cargar comunas');
      const data = await res.json();
      setComunas(data.comunas || []);
    } catch (err) {
      console.error('Error fetching comunas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComunas();
  }, [fetchComunas]);

  const filteredComunas = comunas.filter(c =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCostChange = (comunaId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setChanges(prev => ({ ...prev, [comunaId]: numValue }));
  };

  const handleSave = async (comunaId: number) => {
    setSaving(prev => ({ ...prev, [comunaId]: true }));
    try {
      const res = await fetch('/api/admin/dispatch-costs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comunaId,
          dispatchCost: changes[comunaId],
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      setChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[comunaId];
        return newChanges;
      });

      await fetchComunas();
    } catch (err) {
      console.error('Error saving dispatch cost:', err);
    } finally {
      setSaving(prev => ({ ...prev, [comunaId]: false }));
    }
  };

  const groupedComunas = filteredComunas.reduce((acc, comuna) => {
    if (!acc[comuna.region]) acc[comuna.region] = [];
    acc[comuna.region].push(comuna);
    return acc;
  }, {} as Record<string, Comuna[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Costo de Despacho por Región</h2>
        <Button onClick={fetchComunas} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comuna o región..."
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
        <div className="space-y-8">
          {Object.entries(groupedComunas).map(([region, regionComunas]) => (
            <Card key={region}>
              <CardHeader>
                <CardTitle className="text-lg">{region}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comuna</TableHead>
                      <TableHead className="w-40">Costo Despacho (CLP)</TableHead>
                      <TableHead className="w-32">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionComunas.map((comuna) => (
                      <TableRow key={comuna.id}>
                        <TableCell className="font-medium">{comuna.nombre}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            defaultValue={changes[comuna.id] ?? comuna.dispatch_cost}
                            onChange={(e) => handleCostChange(comuna.id, e.target.value)}
                            className="w-full"
                            min={0}
                          />
                        </TableCell>
                        <TableCell>
                          {changes[comuna.id] !== undefined && (
                            <Button
                              onClick={() => handleSave(comuna.id)}
                              disabled={saving[comuna.id]}
                              size="sm"
                              className="bg-[#F07E04] hover:bg-[#F09C0A]"
                            >
                              {saving[comuna.id] ? 'Guardando...' : 'Guardar'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}