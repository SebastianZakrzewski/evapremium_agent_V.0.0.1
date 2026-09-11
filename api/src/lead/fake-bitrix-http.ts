import type { BitrixLeadFields } from '../domain/lead';

export type BitrixHttpPost = {
  post(url: string, body: unknown): Promise<{ result: number }>;
};

export type FakeHttpRequest = {
  method: 'POST';
  url: string;
  body: unknown;
};

export class FakeBitrixHttp implements BitrixHttpPost {
  readonly requests: FakeHttpRequest[] = [];

  post(url: string, body: unknown): Promise<{ result: number }> {
    this.requests.push({ method: 'POST', url, body });
    return Promise.resolve({ result: 1001 });
  }
}

export class FetchBitrixHttp implements BitrixHttpPost {
  async post(url: string, body: unknown): Promise<{ result: number }> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { result: number };
    return { result: json.result };
  }
}

export class BitrixLeadClient {
  constructor(
    private readonly http: BitrixHttpPost,
    private readonly webhookBaseUrl: string,
  ) {}

  async crmLeadAdd(fields: BitrixLeadFields): Promise<{ id: string }> {
    const url = `${this.webhookBaseUrl.replace(/\/$/, '')}/crm.lead.add.json`;
    const response = await this.http.post(url, { fields });
    return { id: String(response.result) };
  }
}
