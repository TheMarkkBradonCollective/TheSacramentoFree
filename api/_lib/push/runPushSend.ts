export async function runPushSend(
  callerId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const mod = await import('../../../server/pushSend.js');
  return mod.runPushSend(callerId, body as Parameters<typeof mod.runPushSend>[1]);
}
