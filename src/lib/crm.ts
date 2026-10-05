export interface CrmLeadPayload {
  nombre?: string;
  correo?: string;
  telefono?: string;
  empresa?: string;
  metodo_de_contacto?: string;
  region?: string;
  mensaje?: string;
  embudo?: 'B2B' | 'B2C';
}

export async function sendToCrm(payload: CrmLeadPayload): Promise<void> {
  const url = import.meta.env.CRM_WEBHOOK_URL as string | undefined;
  if (!url) {
    console.warn('[CRM] CRM_WEBHOOK_URL not configured — skipping');
    return;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status !== 201) {
    const body = await res.text().catch(() => '');
    throw new Error(`CRM responded ${res.status}: ${body}`);
  }
  console.log('[CRM] Lead sent successfully');
}
