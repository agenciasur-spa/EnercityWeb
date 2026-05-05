import { useState } from 'react';
import type { Comuna } from '../types/simulation';
import type { PDFData } from '../lib/pdfGenerator';

interface QuoteResult {
  estado: 'OK' | 'NO_VIABLE' | 'EJECUTIVO' | 'ERROR';
  mensaje?: string;
  input?: {
    montoBoleta: number;
    comunaId: number;
    tipoTecho: string;
    tipoMedidor: string;
  };
  datosComuna?: {
    id: number;
    nombre: string;
    region: string;
    radiacionGhi: number;
    tarifaEst: number;
  };
  kit?: {
    id: number;
    consumoBruto: number;
    inversorKw: number;
    paneles: number;
    kwp: number;
    precioNetoBase: number;
  };
  calculo?: {
    consumoKwhAnual: number;
    generacionAnualKwh: number;
    ahorroAnual: number;
    ahorroMensual: number;
    coberturaPorcentaje: number;
    precioBase: number;
    factorTecho: number;
    recargoTecho: number;
    costoMedidor: number;
    precioSinIva: number;
    iva: number;
    precioFinalIva: number;
    paybackAnos: number;
  };
  resumenInversion?: {
    ahorroMensual: number;
    ahorroAnual: number;
    inversionTotal: number;
    anosRecuperacion: number;
    cobertura: number;
    clasificacion: 'ALTA_RETORNO' | 'MEDIO_RETORNO' | 'BAJA_RETORNO';
  };
}

interface WizardProps {
  comunas: Comuna[];
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { num: 1, label: 'Tu Comuna' },
  { num: 2, label: 'Tu Consumo' },
  { num: 3, label: 'Detalles' },
  { num: 4, label: 'Calculando' },
  { num: 5, label: 'Resultados' },
];

const TIPOS_TECHO = [
  { value: 'Losa', label: 'Losa', desc: 'Sin recargo', recargo: 0 },
  { value: 'Teja Chilena', label: 'Teja Chilena', desc: '+14% recargo', recargo: 14 },
  { value: 'Otro', label: 'Otro', desc: 'Sin recargo', recargo: 0 },
];

const TIPOS_MEDIDOR = [
  { value: 'Normal', label: 'Normal', desc: 'Dentro de la propiedad', costo: 0 },
  { value: 'Reja/Fuera', label: 'Reja/Fuera', desc: 'Fuera de la propiedad', costo: 350000 },
];

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SolarWizard({ comunas }: WizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leadCreated, setLeadCreated] = useState(false);

  const [formData, setFormData] = useState({
    comunaId: 0,
    montoBoleta: 0,
    tipoTecho: 'Losa' as const,
    tipoMedidor: 'Normal' as const,
    nombre: '',
    email: '',
    telefono: '',
  });

  const canProceed = () => {
    switch (step) {
      case 1: return formData.comunaId > 0;
      case 2: return formData.montoBoleta >= 50000;
      case 3: return !!formData.tipoTecho && !!formData.tipoMedidor;
      case 4: return false;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      setStep(4);
      setCalculating(true);
      setError(null);
      
      try {
        const response = await fetch('/api/calculate-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            montoBoleta: formData.montoBoleta,
            comunaId: formData.comunaId,
            tipoTecho: formData.tipoTecho,
            tipoMedidor: formData.tipoMedidor,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al calcular');
        }

        setResult(data);
        
        if (data.estado === 'OK') {
          setStep(5);
        } else if (data.estado === 'NO_VIIBLE' || data.estado === 'EJECUTIVO') {
          setStep(5);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setStep(3);
      } finally {
        setCalculating(false);
      }
    } else if (step < 5) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmitLead = async () => {
    if (!result || result.estado !== 'OK' || !result.calculo) return;
    if (!formData.nombre || !formData.email) {
      setError('Por favor completa tu nombre y email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          comunaId: formData.comunaId || null,
          montoBoletaIngresado: formData.montoBoleta,
          kitId: result.kit?.id,
          factorTechoAplicado: result.calculo.factorTecho,
          costoMedidorAplicado: result.calculo.costoMedidor,
          precioFinalIva: result.calculo.precioFinalIva,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear lead');
      }

      setLeadCreated(true);

      // Generate and download PDF — isolated try/catch so lead flow is never affected
      if (result.kit && result.datosComuna && result.resumenInversion) {
        try {
          const { downloadPDF } = await import('../lib/pdfGenerator');

          const kit = result.kit;
          const calculo = result.calculo!;
          const comuna = result.datosComuna;
          const resumen = result.resumenInversion;

          const panelWattage: number = Math.round((kit.kwp * 1000) / kit.paneles);
          // CO₂ reduction estimate: Chile grid emission factor ~0.5 kg CO₂/kWh
          const co2Reduction: number = Math.round(calculo.generacionAnualKwh * 0.5);

          const pdfData: PDFData = {
            customerName: formData.nombre,
            customerEmail: formData.email,
            customerPhone: formData.telefono || 'No proporcionado',
            kitName: `Kit Solar ${kit.kwp} kWP`,
            kitPower: `${kit.kwp} kWP`,
            panelCount: kit.paneles,
            panelWattage,
            roofType: formData.tipoTecho,
            meterLocation: formData.tipoMedidor,
            comunaName: comuna.nombre,
            regionName: comuna.region,
            monthlyBill: formData.montoBoleta,
            annualSavings: resumen.ahorroAnual,
            monthlySavings: resumen.ahorroMensual,
            systemPrice: calculo.precioFinalIva,
            systemPriceNoIva: calculo.precioSinIva,
            paybackYears: calculo.paybackAnos,
            coveragePercent: resumen.cobertura,
            co2Reduction,
            investmentClassification: resumen.clasificacion,
            roi25Years: resumen.ahorroAnual * 25,
            quoteDate: new Date().toISOString(),
          };

          await downloadPDF(pdfData);
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">¿En qué comuna vives?</h2>
      <p className="text-gray-600">Selecciona tu comuna para verificar cobertura</p>
      <select
        value={formData.comunaId}
        onChange={(e) => setFormData({ ...formData, comunaId: parseInt(e.target.value) })}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none bg-white"
      >
        <option value={0}>Selecciona una comuna</option>
        {comunas.filter(c => c.activa).map((comuna) => (
          <option key={comuna.id} value={comuna.id}>
            {comuna.nombre}
          </option>
        ))}
      </select>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">¿Cuál es tu monto de luz mensual?</h2>
      <p className="text-gray-600">Ingresa el valor de tu última boleta de electricidad</p>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
        <input
          type="number"
          value={formData.montoBoleta || ''}
          onChange={(e) => setFormData({ ...formData, montoBoleta: parseInt(e.target.value) || 0 })}
          placeholder="Ej: 85000"
          className="w-full pl-10 pr-4 py-4 text-2xl border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition"
        />
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <strong>Rango válido:</strong> $50.000 - $230.000
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Detalles de tu instalación</h2>
      
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Tipo de techo</p>
        <div className="grid gap-3">
          {TIPOS_TECHO.map((techo) => (
            <button
              key={techo.value}
              onClick={() => setFormData({ ...formData, tipoTecho: techo.value as typeof formData.tipoTecho })}
              className={`p-4 border-2 rounded-xl text-left transition ${
                formData.tipoTecho === techo.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{techo.label}</span>
                <span className={`text-sm ${techo.recargo > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {techo.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Ubicación del medidor</p>
        <div className="grid gap-3">
          {TIPOS_MEDIDOR.map((medidor) => (
            <button
              key={medidor.value}
              onClick={() => setFormData({ ...formData, tipoMedidor: medidor.value as typeof formData.tipoMedidor })}
              className={`p-4 border-2 rounded-xl text-left transition ${
                formData.tipoMedidor === medidor.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">{medidor.label}</span>
                <span className={`text-sm ${medidor.costo > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {medidor.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-8 space-y-4">
      <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
      <p className="text-gray-600">Calculando tu presupuesto...</p>
    </div>
  );

  const renderStep5 = () => {
    if (!result) {
      return <div className="text-center py-8">Cargando resultados...</div>;
    }

    if (result.estado === 'NO_VIABLE' || result.estado === 'EJECUTIVO') {
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">{result.estado === 'NO_VIABLE' ? '⚠️' : '📞'}</div>
          <h2 className="text-2xl font-bold text-gray-800">
            {result.estado === 'NO_VIABLE' ? 'Monto no viable' : '¡Tu caso es especial!'}
          </h2>
          <p className="text-gray-600">{result.mensaje}</p>
        </div>
      );
    }

    if (result.estado === 'ERROR') {
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">❌</div>
          <h2 className="text-2xl font-bold text-gray-800">Error</h2>
          <p className="text-gray-600">{result.mensaje}</p>
        </div>
      );
    }

    if (leadCreated) {
      const resumen = result.resumenInversion!;
      return (
        <div className="text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">¡Solicitud Enviada!</h2>
          <p className="text-gray-600">Hemos enviado los detalles a tu email.</p>
          <p className="text-emerald-600 font-semibold text-lg">
            Inversión total: {formatCLP(resumen.inversionTotal)}
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Un ejecutivo te contactará pronto para finalizar la instalación.
          </p>
        </div>
      );
    }

    const calculo = result.calculo!;
    const kit = result.kit!;
    const comuna = result.datosComuna!;
    const resumen = result.resumenInversion!;

    const getClasificacionColor = (clasificacion: string) => {
      if (clasificacion === 'ALTA_RETORNO') return 'bg-green-100 text-green-800 border-green-300';
      if (clasificacion === 'MEDIO_RETORNO') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      return 'bg-red-100 text-red-800 border-red-300';
    };

    const getClasificacionTexto = (clasificacion: string) => {
      if (clasificacion === 'ALTA_RETORNO') return '¡EXCELENTE INVERSIÓN!';
      if (clasificacion === 'MEDIO_RETORNO') return 'BUENA INVERSIÓN';
      return 'INVERSIÓN A LARGO PLAZO';
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 text-center">Tu Inversión Solar</h2>
        
        {/* ROI Principal - AHORRO MENSUAL */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white text-center">
          <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Ahorro Mensual</p>
          <p className="text-5xl font-bold mt-2">{formatCLP(resumen.ahorroMensual)}</p>
          <p className="text-emerald-100 mt-2">por mes</p>
        </div>

        {/* payback Y CLASIFICACIÓN */}
        <div className="flex gap-4">
          <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-gray-500 text-sm">Años para recuperar</p>
            <p className="text-3xl font-bold text-gray-800">{resumen.anosRecuperacion} años</p>
          </div>
          <div className={`flex-1 rounded-xl p-4 text-center border-2 ${getClasificacionColor(resumen.clasificacion)}`}>
            <p className="text-sm font-medium">{getClasificacionTexto(resumen.clasificacion)}</p>
          </div>
        </div>

        {/* COBERTURA */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Cobertura Energética</span>
            <span className="font-bold text-emerald-600">{resumen.cobertura}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-emerald-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min(resumen.cobertura, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {calculo.generacionAnualKwh.toLocaleString('es-CL')} kWh/año generados
          </p>
        </div>

        {/* DATOS TÉCNICOS */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Comuna</span>
            <span className="font-medium">{comuna.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sistema</span>
            <span className="font-medium">{kit.kwp} kWP / {kit.paneles} paneles</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Inversor</span>
            <span className="font-medium">{kit.inversorKw} kW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Generación anual</span>
            <span className="font-medium">{calculo.generacionAnualKwh.toLocaleString('es-CL')} kWh</span>
          </div>
        </div>

        {/* PRECIO FINAL */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium">Inversión Total (inc. IVA)</span>
            <span className="text-2xl font-bold text-emerald-600">{formatCLP(calculo.precioFinalIva)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">Ahorro anual</span>
            <span className="text-emerald-600">{formatCLP(resumen.ahorroAnual)}/año</span>
          </div>
        </div>

        {/* FORMULARIO CONTACTO */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Tus datos de contacto</h3>
          <div>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="Nombre completo"
            />
          </div>
          <div>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="Email"
            />
          </div>
          <div>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="Teléfono (opcional)"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmitLead}
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Solicitar Presupuesto PDF'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-emerald-600 px-6 py-4">
        <h1 className="text-white text-xl font-bold">Simulador Solar Enercity</h1>
      </div>
      
      <div className="bg-gray-100 px-6 py-3">
        <div className="flex justify-between">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`flex flex-col items-center ${
                step === s.num ? 'text-emerald-600' : step > s.num ? 'text-emerald-400' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s.num ? 'bg-emerald-600 text-white' : step > s.num ? 'bg-emerald-400 text-white' : 'bg-gray-300'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {step < 5 && (
        <div className="px-6 pb-6 flex gap-4">
          {step > 1 && step !== 4 && (
            <button
              onClick={handleBack}
              className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Atrás
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || calculating}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 3 ? (calculating ? 'Calculando...' : 'Calcular') : 'Continuar'}
          </button>
        </div>
      )}
    </div>
  );
}
