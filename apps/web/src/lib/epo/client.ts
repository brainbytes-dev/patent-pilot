import type { EpoClientConfig, EpoToken, EpoPatentResult, EpoSearchOptions } from "./types";

const EPO_BASE = "https://ops.epo.org/3.2";
const TOKEN_URL = `${EPO_BASE}/auth/accesstoken`;

export class EpoClient {
  private config: EpoClientConfig;
  private token: EpoToken | null = null;

  constructor(config: EpoClientConfig) {
    this.config = config;
  }

  buildCpcQuery(cpcCodes: string[]): string {
    return `cpc any "${cpcCodes.join(" ")}"`;
  }

  mapStatus(epoStatus: string): "active" | "lapsed" | "for_sale" | "assigned" {
    const upper = epoStatus.toUpperCase();
    if (["REVOKED", "CEASED", "LAPSED", "EXPIRED"].includes(upper)) return "lapsed";
    if (["ASSIGNED", "TRANSFERRED"].includes(upper)) return "assigned";
    return "active";
  }

  parseExpiryDate(raw: string): string | null {
    if (!raw || raw.length !== 8) return null;
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.accessToken;
    }
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64");
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`EPO token error: ${res.status}`);
    const data = await res.json() as { access_token: string; expires_in: number };
    this.token = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (this.config.dryRun) {
      console.log(`[EPO DRY_RUN] GET ${EPO_BASE}${path}`);
      return {} as T;
    }
    const token = await this.getToken();
    const res = await fetch(`${EPO_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`EPO API error: ${res.status} ${path}`);
    return res.json() as Promise<T>;
  }

  async searchRecentlyLapsed(options: EpoSearchOptions): Promise<EpoPatentResult[]> {
    if (this.config.dryRun) {
      console.log("[EPO DRY_RUN] searchRecentlyLapsed", options);
      return [];
    }
    const query = this.buildCpcQuery(options.cpcCodes ?? []);
    const dateFrom = options.dateFrom ?? this.daysAgo(7);
    const dateTo = options.dateTo ?? this.today();
    const path = `/rest-services/published-data/search?q=${encodeURIComponent(
      `${query} and pd within "${dateFrom},${dateTo}"`
    )}&Range=1-${options.maxResults ?? 50}`;

    const raw = await this.request<Record<string, unknown>>(path);
    return this.parseSearchResults(raw);
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }

  private parseSearchResults(raw: Record<string, unknown>): EpoPatentResult[] {
    try {
      const wpd = (raw as Record<string, unknown>)["ops:world-patent-data"] as Record<string, unknown> | undefined;
      const search = wpd?.["ops:biblio-search"] as Record<string, unknown> | undefined;
      const result = search?.["ops:search-result"] as Record<string, unknown> | undefined;
      const docs = result?.["exchange-documents"];
      const docArray = Array.isArray(docs) ? docs : docs ? [docs] : [];
      return docArray.map((d: unknown) => this.parseDocument(d as Record<string, unknown>)).filter(Boolean) as EpoPatentResult[];
    } catch {
      return [];
    }
  }

  private parseDocument(doc: Record<string, unknown>): EpoPatentResult | null {
    try {
      const inner = (doc["exchange-document"] ?? doc) as Record<string, unknown>;
      const bib = (inner["bibliographic-data"] ?? {}) as Record<string, unknown>;
      const docNum = (inner["@doc-number"] ?? "") as string;
      const country = (inner["@country"] ?? "EP") as string;
      const kind = (inner["@kind"] ?? "") as string;
      const patentNumber = `${country}${docNum}${kind}`;
      const titleArr = bib["invention-title"];
      const titles = Array.isArray(titleArr) ? titleArr : titleArr ? [titleArr] : [];
      const titleEn = (titles.find((t: unknown) => (t as Record<string, string>)["@lang"] === "en") as Record<string, string> | undefined)?.["$"]
        ?? (titles[0] as Record<string, string> | undefined)?.["$"] ?? "";
      const appRef = (bib["application-reference"] as Record<string, unknown> | undefined)?.["document-id"] as Record<string, unknown> | undefined;
      const filingDateRaw = (appRef?.["date"] as Record<string, string> | undefined)?.["$"] ?? "";
      const parties = bib["parties"] as Record<string, unknown> | undefined;
      const applicants = parties?.["applicants"] as Record<string, unknown> | undefined;
      const applicant = applicants?.["applicant"];
      const ownerName = Array.isArray(applicant)
        ? ((applicant[0] as Record<string, unknown>)?.["applicant-name"] as Record<string, unknown>)?.["name"] as Record<string, string> | undefined
        : ((applicant as Record<string, unknown>)?.["applicant-name"] as Record<string, unknown>)?.["name"] as Record<string, string> | undefined;
      const owner = ownerName?.["$"] ?? null;
      const cpcClass = bib["classifications-cpc"] as Record<string, unknown> | undefined;
      const cpcArr = cpcClass?.["patent-classification"];
      const cpcList = Array.isArray(cpcArr) ? cpcArr : cpcArr ? [cpcArr] : [];
      const cpcCodes = cpcList.map((c: unknown) => {
        const cr = c as Record<string, Record<string, string>>;
        return [cr["section"]?.["$"], cr["class"]?.["$"], cr["subclass"]?.["$"]].filter(Boolean).join("");
      }).filter(Boolean);

      return {
        patentNumber,
        title: titleEn,
        filingDate: this.parseExpiryDate(filingDateRaw.replace(/-/g, "")),
        grantDate: null,
        expiryDate: null,
        owner,
        cpcCodes,
        status: "lapsed",
        abstractEn: null,
        rawData: doc,
      };
    } catch {
      return null;
    }
  }
}

export function getEpoClient(): EpoClient {
  return new EpoClient({
    clientId: process.env.EPO_OPS_CLIENT_ID ?? process.env.EPO_CLIENT_ID ?? "",
    clientSecret: process.env.EPO_OPS_CLIENT_SECRET ?? process.env.EPO_CLIENT_SECRET ?? "",
    dryRun: process.env.EPO_DRY_RUN === "true" || !process.env.EPO_OPS_CLIENT_ID,
  });
}
