export interface EpoClientConfig {
  clientId: string;
  clientSecret: string;
  dryRun?: boolean;
}

export interface EpoToken {
  accessToken: string;
  expiresAt: number;
}

export interface EpoPatentResult {
  patentNumber: string;
  title: string;
  filingDate: string | null;
  grantDate: string | null;
  expiryDate: string | null;
  owner: string | null;
  cpcCodes: string[];
  status: "active" | "lapsed" | "for_sale" | "assigned";
  abstractEn: string | null;
  rawData: Record<string, unknown>;
}

export interface EpoSearchOptions {
  cpcCodes?: string[];
  dateFrom?: string;
  dateTo?: string;
  maxResults?: number;
}
