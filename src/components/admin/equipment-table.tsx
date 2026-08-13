import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, RefreshCw, Link as LinkIcon } from 'lucide-react';
import type { EquipmentDetail } from '@/types/simulation';

interface EquipmentTableProps {
  initialEquipment?: EquipmentDetail[];
}

export default function EquipmentTable({ initialEquipment }: EquipmentTableProps) {
  const [equipment, setEquipment] = useState<EquipmentDetail[]>(initialEquipment || []);
  const [loading, setLoading] = useState(!initialEquipment);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    tipo: 'inversor' as 'inversor' | 'panel',
    nombre: '',
    marca: '',
    modelo: '',
    potenciaWatts: '',
    descripcion: '',
    garantia: '',
    imagenUrl: '',
    fichaTecnicaUrl: '',
    activo: true,
  });

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/equipment');
      if (!res.ok) throw new Error('Error al cargar equipos');
      const data = await res.json();
      setEquipment(data.equipment || []);
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const filteredEquipment = equipment.filter(eq =>
    eq.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const body = {
        ...(editingItem ? { id: editingItem.id } : {}),
        ...formData,
        potenciaWatts: formData.potenciaWatts ? parseInt(formData.potenciaWatts) : null,
      };

      const res = await fetch('/api/admin/equipment', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al guardar equipo');

      setDialogOpen(false);
      resetForm();
      await fetchEquipment();
    } catch (err) {
      console.error('Error saving equipment:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este equipo?')) return;

    try {
      const res = await fetch(`/api/admin/equipment?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar equipo');

      await fetchEquipment();
    } catch (err) {
      console.error('Error deleting equipment:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'inversor',
      nombre: '',
      marca: '',
      modelo: '',
      potenciaWatts: '',
      descripcion: '',
      garantia: '',
      imagenUrl: '',
      fichaTecnicaUrl: '',
      activo: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: EquipmentDetail) => {
    setEditingItem(item);
    setFormData({
      tipo: item.tipo,
      nombre: item.nombre,
      marca: item.marca,
      modelo: item.modelo || '',
      potenciaWatts: item.potenciaWatts?.toString() || '',
      descripcion: item.descripcion || '',
      garantia: item.garantia || '',
      imagenUrl: item.imagenUrl || '',
      fichaTecnicaUrl: item.fichaTecnicaUrl || '',
      activo: item.activo,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Catálogo de Equipos</h2>
        <div className="flex gap-2">
          <Button onClick={fetchEquipment} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#F07E04] hover:bg-[#F09C0A]">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Editar Equipo' : 'Nuevo Equipo'}
                </DialogTitle>
                <DialogDescription>
                  Completa los datos del equipo y sus enlaces de imagen y ficha técnica.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo *</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'inversor' | 'panel' })}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      required
                    >
                      <option value="inversor">Inversor</option>
                      <option value="panel">Panel Solar</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nombre *</label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Marca *</label>
                    <Input
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Modelo</label>
                    <Input
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Potencia (Watts)</label>
                  <Input
                    type="number"
                    value={formData.potenciaWatts}
                    onChange={(e) => setFormData({ ...formData, potenciaWatts: e.target.value })}
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">URL de Imagen</label>
                  <Input
                    type="url"
                    value={formData.imagenUrl}
                    onChange={(e) => setFormData({ ...formData, imagenUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción corta (PDF)</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={2}
                    placeholder="Ej: Inversor Monofásico inteligente con conexión Wi-Fi..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Garantía (PDF)</label>
                  <Input
                    value={formData.garantia}
                    onChange={(e) => setFormData({ ...formData, garantia: e.target.value })}
                    placeholder="Ej: 10 años"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">URL de Ficha Técnica</label>
                  <Input
                    type="url"
                    value={formData.fichaTecnicaUrl}
                    onChange={(e) => setFormData({ ...formData, fichaTecnicaUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="activo" className="text-sm font-medium">Activo</label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-[#F07E04] hover:bg-[#F09C0A]">
                    Guardar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Input
          placeholder="Buscar equipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#F07E04]"></div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Potencia</TableHead>
                  <TableHead>Ficha Técnica</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.tipo === 'inversor' ? 'default' : 'secondary'}>
                        {item.tipo === 'inversor' ? 'Inversor' : 'Panel'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.nombre}</TableCell>
                    <TableCell>{item.marca}</TableCell>
                    <TableCell>{item.modelo || '-'}</TableCell>
                    <TableCell>
                      {item.potenciaWatts ? `${item.potenciaWatts}W` : '-'}
                    </TableCell>
                    <TableCell>
                      {item.fichaTecnicaUrl ? (
                        <a
                          href={item.fichaTecnicaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#F07E04] hover:text-[#F09C0A] flex items-center gap-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          Ver ficha
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.activo ? 'default' : 'outline'}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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