/** TypeScript mirrors of admin_api's SystemHealth schemas. */

export type ServiceStatus = "up" | "degraded" | "down";
export type OverallStatus = "healthy" | "degraded" | "unreachable";

export interface ServiceHealth {
  name: string;
  url: string;
  status: ServiceStatus;
  latency_ms: number | null;
  error: string | null;
  critical: boolean;
}

export interface SystemHealthResponse {
  overall: OverallStatus;
  checked_at: string;
  services: ServiceHealth[];
  summary: { up: number; degraded: number; down: number };
}
