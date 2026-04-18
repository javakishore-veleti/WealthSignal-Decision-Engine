/**
 * TypeScript mirrors of the Pydantic schemas exposed by
 * product_catalog_api + customer_api. Hand-mirrored for now; will be
 * generated from OpenAPI specs in a follow-up.
 */

export type AssetClass =
  | "Equity" | "Fixed Income" | "Multi-Asset" | "Alternative"
  | "Cash" | "Commodity" | "Real Estate";

export type ProductType =
  | "Mutual Fund" | "ETF" | "Bond" | "Structured Product"
  | "Investment Account" | "Pension" | "Annuity" | "Insurance"
  | "Money Market" | "Private Equity" | "REIT";

export type CustomerSegment =
  | "High-Wealth-Prospect" | "Mid-Tier-Saver" | "Young-Investor"
  | "Passive-Holder" | "At-Risk-Abandoner" | "Retirement-Planner";

export interface Product {
  id: string;
  sku: string;
  name: string;
  short_description: string;
  long_description: string;
  asset_class: AssetClass;
  product_type: ProductType;
  risk_level: number;
  time_horizon: "Short" | "Medium" | "Long";
  liquidity: string;
  geography: string;
  target_segment: CustomerSegment;
  esg_rating: string;
  min_investment: string;
  currency: string;
  fee_bps: number;
  aum: string;
  issuer: string;
  ticker: string | null;
  isin: string | null;
  launch_date: string;
  is_active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ProductListResponse {
  items: Product[];
  pagination: PaginationMeta;
}

// ── NLP search ────────────────────────────────────────────────────────────

export interface NlpSearchRequest {
  query: string;
  top_k?: number;
  asset_class?: AssetClass;
  target_segment?: CustomerSegment;
}

export interface NlpSearchHit {
  product: Product;
  score: number;                // 0–100
  matched_terms: string[];
}

export interface NlpSearchResponse {
  query: string;
  hits: NlpSearchHit[];
  total: number;
}

// ── Criteria search ───────────────────────────────────────────────────────

export interface CriteriaSearchRequest {
  asset_class?: AssetClass;
  product_type?: ProductType;
  risk_level_min?: number;
  risk_level_max?: number;
  target_segment?: CustomerSegment;
  min_investment_max?: string;
  is_active?: boolean;
}

// ── Application draft (customer_api) ──────────────────────────────────────

export interface ApplicationDraftIn {
  product_sku?: string | null;
  identity?: {
    full_name?: string | null;
    email?: string | null;
    date_of_birth?: string | null;
  } | null;
  financials?: {
    employment_status?: string | null;
    annual_income?: string | null;
    existing_wealth?: string | null;
    risk_questionnaire_score?: number | null;
  } | null;
  current_step?: number | null;
}

export interface ApplicationDraft extends ApplicationDraftIn {
  id: string;
  status: "draft" | "submitted" | "abandoned" | "offered";
  created_at: string;
  updated_at: string;
}
