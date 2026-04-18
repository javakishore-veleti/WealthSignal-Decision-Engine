/**
 * TypeScript mirrors of the Pydantic schemas exposed by
 * product_catalog_api (middleware/product_catalog_api/app/schemas.py).
 *
 * These will be auto-generated from the OpenAPI spec in a follow-up;
 * for now they're hand-mirrored so the portal is unblocked.
 */

export type AssetClass =
  | "Equity" | "Fixed Income" | "Multi-Asset" | "Alternative"
  | "Cash" | "Commodity" | "Real Estate";

export type ProductType =
  | "Mutual Fund" | "ETF" | "Bond" | "Structured Product"
  | "Investment Account" | "Pension" | "Annuity" | "Insurance"
  | "Money Market" | "Private Equity" | "REIT";

export type TimeHorizon = "Short" | "Medium" | "Long";
export type Liquidity = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Locked";

export type CustomerSegment =
  | "High-Wealth-Prospect" | "Mid-Tier-Saver" | "Young-Investor"
  | "Passive-Holder" | "At-Risk-Abandoner" | "Retirement-Planner";

export type EsgRating =
  | "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "Not Rated";

export interface Product {
  id: string;
  sku: string;
  name: string;
  short_description: string;
  long_description: string;
  asset_class: AssetClass;
  product_type: ProductType;
  risk_level: number;           // 1–7 (FCA SRRI)
  time_horizon: TimeHorizon;
  liquidity: Liquidity;
  geography: string;
  target_segment: CustomerSegment;
  esg_rating: EsgRating;
  min_investment: string;        // decimal serialized as string
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

export interface CategoryCount {
  value: string;
  count: number;
}

export interface CategoriesResponse {
  asset_class: CategoryCount[];
  product_type: CategoryCount[];
  risk_level: CategoryCount[];
  geography: CategoryCount[];
  target_segment: CategoryCount[];
  esg_rating: CategoryCount[];
  total_products: number;
}

// ── Admin API: Initial Data Load ──────────────────────────────────────────

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface JobResponse {
  job_id: string;
  dag_id: string;
  status: JobStatus;
  submitted_at: string;
  started_at: string | null;
  finished_at: string | null;
  counts: {
    inserted?: number;
    updated?: number;
    total_records_processed?: number;
  } | null;
  message: string | null;
}

export interface InitialLoadRequest {
  seed_path?: string | null;
  dry_run: boolean;
}
