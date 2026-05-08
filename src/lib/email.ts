import { Resend } from 'resend';
import { getSettings } from './settings';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

interface ClienteData {
  nombre: string;
  email: string;
  telefono: string;
}

interface KitData {
  kwp: number;
  paneles: number;
  inversorKw: number;
}

interface LeadEmailData {
  cliente: ClienteData;
  comuna: { nombre: string };
  kit: KitData;
  tipoTecho: string;
  tipoMedidor: string;
  precioFinal: number;
  montoBoleta: number;
  factorTecho: number;
  costoMedidor: number;
  pdfBytes?: Uint8Array;
}

interface ContactEmailData {
  nombre: string;
  email: string;
  telefono?: string;
  proyecto: string;
  mensaje?: string;
}

const PROYECTO_LABELS: Record<string, string> = {
  residencial: 'Residencial (Hogar)',
  industrial: 'Industrial / B2B',
  agricola: 'Agrícola (Riego)',
};

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function sendLeadEmails(data: LeadEmailData) {
  const settings = await getSettings();
  const emailFromName = (settings.email_from_name as string) || 'Enercity Solar';
  const emailFromAddress = (settings.email_from_address as string) || 'onboarding@resend.dev';
  
  const { cliente, comuna, kit, tipoTecho, tipoMedidor, precioFinal, montoBoleta } = data;
  const costoMedidorLabel = data.costoMedidor > 0 ? ` (+ ${formatCLP(data.costoMedidor)} por medidor)` : '';

  const clienteHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#154660;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                ☀️ Enercity Solar
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#ffffff;opacity:0.7;letter-spacing:0.5px;">
                Tu Presupuesto Personalizado
              </p>
            </td>
          </tr>

          <!-- Saludo -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#154660;">
                ¡Hola, ${cliente.nombre}!
              </h2>
              <p style="margin:0;font-size:15px;color:#4a5568;line-height:1.6;">
                Gracias por usar nuestro simulador. Hemos preparado tu presupuesto solar basado en tu consumo de <strong>${formatCLP(montoBoleta)}/mes</strong> en <strong>${comuna.nombre}</strong>.
              </p>
            </td>
          </tr>

          <!-- Resumen del sistema -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="padding:16px 20px;background:#F07E04;">
                    <span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;">
                      Resumen del Sistema Recomendado
                    </span>
                  </td>
                </tr>
                ${[
                  ['Paneles Solares', `${kit.paneles} unidades`],
                  ['Potencia Total', `${kit.kwp} kWp`],
                  ['Inversor', `${kit.inversorKw} kW`],
                  ['Techumbre', tipoTecho],
                  ['Ubicación Medidor', `${tipoMedidor}${costoMedidorLabel}`],
                ].map(([label, val]) => `
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:13px;color:#718096;font-weight:500;">${label}</span>
                  </td>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
                    <span style="font-size:14px;color:#154660;font-weight:700;">${val}</span>
                  </td>
                </tr>`).join('')}
                <tr style="background:#fffbeb;">
                  <td style="padding:18px 20px;">
                    <span style="font-size:13px;color:#92400e;font-weight:700;">Inversión Total (IVA inc.)</span>
                  </td>
                  <td style="padding:18px 20px;text-align:right;">
                    <span style="font-size:20px;font-weight:900;color:#F07E04;">${formatCLP(precioFinal)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Qué incluye -->
          <tr>
            <td style="padding:0 40px 32px;">
              <h3 style="margin:0 0 16px;font-size:13px;font-weight:800;color:#154660;letter-spacing:1px;text-transform:uppercase;">
                ¿Qué incluye tu presupuesto?
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ['✓', 'Paneles solares de alta eficiencia'],
                  ['✓', 'Inversor certificado SEC'],
                  ['✓', 'Kit de instalación completo'],
                  ['✓', 'Medición y estudio técnico'],
                  ['✓', 'Conexión y puesta en marcha'],
                  ['✓', 'Visitas técnicas y garantías'],
                ].map(([icon, text]) => `
                <tr>
                  <td style="padding:5px 0;width:28px;">
                    <span style="color:#4AAF4D;font-size:16px;">${icon}</span>
                  </td>
                  <td style="padding:5px 0;">
                    <span style="font-size:14px;color:#4a5568;">${text}</span>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <div style="display:inline-block;background:#F07E04;border-radius:12px;padding:16px 40px;">
                <span style="font-size:15px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
                  Un asesor te contactará en 24 horas hábiles
                </span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#a0aec0;line-height:1.6;">
                Enercity Solar · paneles-solares.cl<br>
                Este presupuesto tiene validez por 30 días. Sujeto a confirmación técnica.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const managerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border-top:4px solid #F07E04;">

          <!-- Header -->
          <tr>
            <td style="background:#154660;padding:20px 32px;">
              <span style="font-size:11px;font-weight:900;color:#F07E04;letter-spacing:2px;text-transform:uppercase;">
                🚨 Nuevo Lead del Simulador
              </span>
            </td>
          </tr>

          <!-- Contacto rápido -->
          <tr>
            <td style="padding:28px 32px 20px;background:#fffbeb;border-bottom:1px solid #fed7aa;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:4px;">Nombre</span>
                    <span style="font-size:20px;font-weight:800;color:#154660;">${cliente.nombre}</span>
                  </td>
                  <td align="right">
                    <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:4px;">Teléfono</span>
                    <span style="font-size:20px;font-weight:800;color:#154660;">${cliente.telefono || '<strong style="color:#e53e3e;">No proporcionado</strong>'}</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:16px;display:flex;gap:24px;flex-wrap:wrap;">
                <div>
                  <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:2px;">Email</span>
                  <a href="mailto:${cliente.email}" style="font-size:14px;font-weight:600;color:#2b6cb0;text-decoration:none;">${cliente.email}</a>
                </div>
                <div>
                  <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:2px;">Comuna</span>
                  <span style="font-size:14px;font-weight:700;color:#154660;">${comuna.nombre}</span>
                </div>
              </div>
            </td>
          </tr>

          <!-- Datos del lead -->
          <tr>
            <td style="padding:24px 32px;">
              <h3 style="margin:0 0 16px;font-size:11px;font-weight:800;color:#718096;letter-spacing:1.5px;text-transform:uppercase;">
                Datos de la Simulación
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border-radius:8px;overflow:hidden;">
                ${[
                  ['Boleta mensual', formatCLP(montoBoleta)],
                  ['Paneles', `${kit.paneles} unidades`],
                  ['Potencia', `${kit.kwp} kWp`],
                  ['Inversor', `${kit.inversorKw} kW`],
                  ['Techumbre', tipoTecho],
                  ['Medidor', `${tipoMedidor}${costoMedidorLabel}`],
                  ['Inversión Total', formatCLP(precioFinal)],
                ].map(([label, val], i, arr) => `
                <tr style="${i === arr.length - 1 ? 'background:#F07E04;' : ''}">
                  <td style="padding:12px 16px;border-bottom:${i < arr.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                    <span style="font-size:13px;color:${i === arr.length - 1 ? '#ffffff' : '#718096'};font-weight:500;">${label}</span>
                  </td>
                  <td style="padding:12px 16px;border-bottom:${i < arr.length - 1 ? '1px solid #e2e8f0' : 'none'};text-align:right;">
                    <span style="font-size:14px;font-weight:700;color:${i === arr.length - 1 ? '#ffffff' : '#154660'};">${val}</span>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- Acciones -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="tel:${cliente.telefono?.replace(/\s/g, '')}" style="display:block;background:#4AAF4D;text-align:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                      📞 LLAMAR AHORA
                    </a>
                  </td>
                  <td style="padding-left:8px;">
                    <a href="mailto:${cliente.email}" style="display:block;background:#154660;text-align:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                      ✉️ ENVIAR EMAIL
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#a0aec0;">
                Generado automáticamente por Enercity · Simulador Solar
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const fromField = `${emailFromName} <${emailFromAddress}>`;
    console.log(`[Email] DEBUG from field: "${fromField}" | name="${emailFromName}" | address="${emailFromAddress}"`);
    const [clienteRes, managerRes] = await Promise.all([
      resend.emails.send({
        from: fromField,
        to: [cliente.email],
        subject: `☀️ Tu Presupuesto Solar Enercity - ${cliente.nombre}`,
        html: clienteHtml,
        attachments: data.pdfBytes ? [{
          filename: 'diagnostico-solar-enercity.pdf',
          content: Buffer.from(data.pdfBytes),
        }] : undefined,
      }),
      resend.emails.send({
        from: `${emailFromName} <${emailFromAddress}>`,
        to: ['mojeda@agenciasur.cl'],
        subject: `🚨 NUEVO LEAD SIMULADOR: ${cliente.nombre} - ${comuna.nombre}`,
        html: managerHtml,
      }),
    ]);

    if (clienteRes.error) console.error('[Email] Error cliente:', clienteRes.error);
    else console.log(`[Email] Enviado a cliente: ${cliente.email}`);

    if (managerRes.error) console.error('[Email] Error manager:', managerRes.error);
    else console.log('[Email] Enviado a encargado: mojeda@agenciasur.cl');

    return { cliente: clienteRes, manager: managerRes };
  } catch (err) {
    console.error('[Email] Error general:', err);
  }
}

export async function sendContactEmails(data: ContactEmailData) {
  const settings = await getSettings();
  const emailFromName = (settings.email_from_name as string) || 'Enercity Solar';
  const emailFromAddress = (settings.email_from_address as string) || 'onboarding@resend.dev';
  
  const { nombre, email, telefono, proyecto, mensaje } = data;
  const proyectoLabel = PROYECTO_LABELS[proyecto] ?? proyecto;
  const telefonoDisplay = telefono || 'No proporcionado';

  const usuarioHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#154660;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                ☀️ Enercity Solar
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#ffffff;opacity:0.7;letter-spacing:0.5px;">
                Consultoría Energética
              </p>
            </td>
          </tr>

          <!-- Saludo -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#154660;">
                ¡Hola, ${nombre}!
              </h2>
              <p style="margin:0;font-size:15px;color:#4a5568;line-height:1.6;">
                Hemos recibido tu solicitud de consultoría <strong>${proyectoLabel}</strong>. Nuestro equipo se pondrá en contacto contigo en las próximas <strong>24 horas hábiles</strong>.
              </p>
            </td>
          </tr>

          <!-- Resumen -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                <tr>
                  <td colspan="2" style="padding:16px 20px;background:#F07E04;">
                    <span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;">
                      Resumen de tu Solicitud
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:13px;color:#718096;font-weight:500;">Tipo de Proyecto</span>
                  </td>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
                    <span style="font-size:14px;color:#154660;font-weight:700;">${proyectoLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:13px;color:#718096;font-weight:500;">Email</span>
                  </td>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
                    <span style="font-size:14px;color:#154660;font-weight:700;">${email}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:13px;color:#718096;font-weight:500;">Teléfono</span>
                  </td>
                  <td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;text-align:right;">
                    <span style="font-size:14px;color:#154660;font-weight:700;">${telefonoDisplay}</span>
                  </td>
                </tr>
                ${mensaje ? `
                <tr style="background:#fffbeb;">
                  <td style="padding:18px 20px;">
                    <span style="font-size:13px;color:#92400e;font-weight:700;">Tu Mensaje</span>
                  </td>
                  <td style="padding:18px 20px;text-align:right;">
                    <span style="font-size:14px;color:#154660;font-weight:700;">${mensaje}</span>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>

          <!-- Qué sigue -->
          <tr>
            <td style="padding:0 40px 32px;">
              <h3 style="margin:0 0 16px;font-size:13px;font-weight:800;color:#154660;letter-spacing:1px;text-transform:uppercase;">
                ¿Qué sigue?
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  ['✓', 'Un ingeniero revisará tu solicitud'],
                  ['✓', 'Te contactaremos por WhatsApp o email'],
                  ['✓', 'Consultoría técnica sin compromiso'],
                  ['✓', 'Presupuesto detallado en 48h'],
                ].map(([icon, text]) => `
                <tr>
                  <td style="padding:5px 0;width:28px;">
                    <span style="color:#4AAF4D;font-size:16px;">${icon}</span>
                  </td>
                  <td style="padding:5px 0;">
                    <span style="font-size:14px;color:#4a5568;">${text}</span>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;text-align:center;">
              <div style="display:inline-block;background:#4AAF4D;border-radius:12px;padding:16px 40px;">
                <span style="font-size:15px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
                  Un asesor te contactará en 24 horas hábiles
                </span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#a0aec0;line-height:1.6;">
                Enercity Solar · paneles-solares.cl<br>
                Consultoría técnica personalizada para proyectos solares.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const managerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border-top:4px solid #4AAF4D;">

          <!-- Header -->
          <tr>
            <td style="background:#154660;padding:20px 32px;">
              <span style="font-size:11px;font-weight:900;color:#4AAF4D;letter-spacing:2px;text-transform:uppercase;">
                💬 Nuevo Contacto — Consultoría
              </span>
            </td>
          </tr>

          <!-- Contacto rápido -->
          <tr>
            <td style="padding:28px 32px 20px;background:#fffbeb;border-bottom:1px solid #fed7aa;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:4px;">Nombre</span>
                    <span style="font-size:20px;font-weight:800;color:#154660;">${nombre}</span>
                  </td>
                  <td align="right">
                    <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1.5px;text-transform:uppercase;display:block;margin-bottom:4px;">Teléfono</span>
                    <span style="font-size:20px;font-weight:800;color:#154660;">${telefono || '<strong style="color:#e53e3e;">No proporcionado</strong>'}</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top:16px;">
                <span style="font-size:10px;font-weight:800;color:#92400e;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:2px;">Email</span>
                <a href="mailto:${email}" style="font-size:14px;font-weight:600;color:#2b6cb0;text-decoration:none;">${email}</a>
              </div>
            </td>
          </tr>

          <!-- Datos del contacto -->
          <tr>
            <td style="padding:24px 32px;">
              <h3 style="margin:0 0 16px;font-size:11px;font-weight:800;color:#718096;letter-spacing:1.5px;text-transform:uppercase;">
                Datos del Contacto
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7fafc;border-radius:8px;overflow:hidden;">
                ${[
                  ['Tipo de Proyecto', proyectoLabel],
                  ['Email', email],
                  ['Teléfono', telefonoDisplay],
                ].map(([label, val], i, arr) => `
                <tr${i === arr.length - 1 ? ' style="background:#4AAF4D;"' : ''}>
                  <td style="padding:12px 16px;border-bottom:${i < arr.length - 1 ? '1px solid #e2e8f0' : 'none'};">
                    <span style="font-size:13px;color:${i === arr.length - 1 ? '#ffffff' : '#718096'};font-weight:500;">${label}</span>
                  </td>
                  <td style="padding:12px 16px;border-bottom:${i < arr.length - 1 ? '1px solid #e2e8f0' : 'none'};text-align:right;">
                    <span style="font-size:14px;font-weight:700;color:${i === arr.length - 1 ? '#ffffff' : '#154660'};">${val}</span>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          ${mensaje ? `
          <!-- Mensaje del contacto -->
          <tr>
            <td style="padding:0 32px 24px;">
              <h3 style="margin:0 0 12px;font-size:11px;font-weight:800;color:#718096;letter-spacing:1.5px;text-transform:uppercase;">
                Mensaje
              </h3>
              <div style="background:#f7fafc;border-radius:8px;padding:16px 20px;border-left:4px solid #F07E04;">
                <p style="margin:0;font-size:14px;color:#154660;line-height:1.6;">${mensaje}</p>
              </div>
            </td>
          </tr>` : ''}

          <!-- Acciones -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <a href="tel:${telefono?.replace(/\s/g, '') || '#'}" style="display:block;background:#4AAF4D;text-align:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                      📞 LLAMAR AHORA
                    </a>
                  </td>
                  <td style="padding-left:8px;">
                    <a href="mailto:${email}" style="display:block;background:#154660;text-align:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                      ✉️ ENVIAR EMAIL
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#a0aec0;">
                Generado automáticamente por Enercity · Formulario de Contacto
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const fromField = `${emailFromName} <${emailFromAddress}>`;
    console.log(`[Email] DEBUG from field: "${fromField}" | name="${emailFromName}" | address="${emailFromAddress}"`);
    const [usuarioRes, managerRes] = await Promise.all([
      resend.emails.send({
        from: fromField,
        to: [email],
        subject: `¡Gracias por contactarnos! — Enercity Solar`,
        html: usuarioHtml,
      }),
      resend.emails.send({
        from: `${emailFromName} <${emailFromAddress}>`,
        to: ['mojeda@agenciasur.cl'],
        subject: `Nuevo contacto: ${proyectoLabel} - ${nombre}`,
        html: managerHtml,
      }),
    ]);

    if (usuarioRes.error) console.error('[Email] Error usuario:', usuarioRes.error);
    else console.log(`[Email] Enviado a usuario: ${email}`);

    if (managerRes.error) console.error('[Email] Error manager (contacto):', managerRes.error);
    else console.log('[Email] Enviado a encargado: mojeda@agenciasur.cl');

    return { usuario: usuarioRes, manager: managerRes };
  } catch (err) {
    console.error('[Email] Error general (contacto):', err);
  }
}
