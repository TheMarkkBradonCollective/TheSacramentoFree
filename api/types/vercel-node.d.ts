declare module '@vercel/node' {
  export type VercelRequest = import('node:http').IncomingMessage & {
    body?: unknown;
    cookies?: Record<string, string>;
    method?: string;
    query?: Record<string, string | string[]>;
    headers: import('node:http').IncomingHttpHeaders;
  };

  export type VercelResponse = import('node:http').ServerResponse<import('node:http').IncomingMessage> & {
    json: (body: unknown) => VercelResponse;
    send: (body: unknown) => VercelResponse;
    status: (code: number) => VercelResponse;
  };
}
