import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const gtmId = import.meta.env.PUBLIC_GTM_ID;
  
  return new Response(
    JSON.stringify({
      PUBLIC_GTM_ID: gtmId || 'NOT_FOUND',
      hasValue: !!gtmId,
      type: typeof gtmId
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
