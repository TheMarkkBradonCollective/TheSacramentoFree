export async function runPushSend(
  callerId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      status: 503,
      body: {
        error:
          'Push delivery requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel environment variables and redeploy.',
        sent: 0,
        recipients: 0,
      },
    };
  }

  const mod = await import('../../../server/pushSend.js');
  return mod.runPushSend(callerId, body as Parameters<typeof mod.runPushSend>[1]);
}
