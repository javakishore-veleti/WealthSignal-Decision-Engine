import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";

import { SystemHealthService } from "../services/system-health.service";
import { ServiceStatus } from "../models/system-health.model";

/**
 * Top-bar health badge. Shows the overall status of the local stack
 * as a colour-coded pill. Clicking opens a dropdown listing every
 * service with its status and latency.
 */
@Component({
  selector: "ws-health-badge",
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        (click)="toggle()"
        [title]="tooltip()"
        class="flex items-center gap-2 px-3 py-1.5 rounded-full
               bg-white/10 hover:bg-white/20 backdrop-blur
               text-xs font-semibold tracking-wide
               transition-colors duration-200">
        <!-- Dot — colour + glow bound via inline style (Tailwind arbitrary
             values like shadow-[0_0_8px_...] don't parse inside Angular's
             [class.…] binding syntax). -->
        <span class="h-2 w-2 rounded-full"
              [style.background]="overallDotColor()"
              [style.box-shadow]="overallDotGlow()"></span>

        @switch (health.overall()) {
          @case ("healthy") { <span>ALL SYSTEMS</span> }
          @case ("degraded") { <span>{{ health.issueCount() }} ISSUE{{ health.issueCount() === 1 ? '' : 'S' }}</span> }
          @case ("unreachable") { <span>DISCONNECTED</span> }
        }

        <!-- Warning icon when not healthy -->
        @if (health.overall() !== "healthy") {
          <svg viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M10 1.5c-.6 0-1.1.3-1.4.8l-7.5 13a1.6 1.6 0 001.4 2.5h15a1.6 1.6 0 001.4-2.5l-7.5-13a1.6 1.6 0 00-1.4-.8zM10 6a.9.9 0 011 1v4a.9.9 0 01-2 0V7a.9.9 0 011-1zm0 8.5a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2z"/>
          </svg>
        }
      </button>

      <!-- Dropdown panel -->
      @if (open()) {
        <div class="absolute right-0 top-[calc(100%+8px)] w-[360px] z-40
                    bg-white rounded-2xl shadow-popover border border-surface-200
                    text-ink-900 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          <div class="p-5 border-b border-surface-200"
               [style.background]="headerGradient()">
            <div class="flex items-center justify-between mb-1">
              <div class="font-display font-bold text-base">Stack health</div>
              <button (click)="refresh(); $event.stopPropagation()"
                      class="text-xs text-ink-500 hover:text-brand-700 font-semibold">
                Refresh
              </button>
            </div>

            @if (health.overall() === 'healthy') {
              <p class="text-sm text-ink-700">
                All {{ health.services().length }} services are responding normally.
              </p>
            } @else if (health.overall() === 'degraded') {
              <p class="text-sm text-ink-700">
                <strong class="text-gold-700">{{ health.issueCount() }} service{{ health.issueCount() === 1 ? '' : 's' }}</strong>
                not responding. The app may work in a degraded state.
              </p>
            } @else {
              <p class="text-sm text-ink-700">
                <strong class="text-rose-600">admin_api itself is unreachable.</strong>
                None of the stack can be verified.
              </p>
            }

            @if (health.lastCheckedAt(); as ts) {
              <div class="text-xs text-ink-500 mt-2">
                Last checked · {{ ts | date: 'HH:mm:ss' }}
              </div>
            }
          </div>

          <div class="max-h-[360px] overflow-y-auto">
            @if (health.services().length === 0 && health.error()) {
              <div class="p-5 text-sm text-rose-600">
                <div class="font-semibold mb-1">Couldn't reach admin_api</div>
                <div class="text-xs">{{ health.error() }}</div>
                <div class="text-xs text-ink-500 mt-2">
                  Start it:
                  <code class="font-mono text-brand-700">npm run run:local:middleware:admin</code>
                </div>
              </div>
            }

            @for (svc of health.services(); track svc.name) {
              <div class="flex items-center gap-3 px-5 py-3
                          border-b border-surface-100 last:border-b-0
                          hover:bg-surface-50 transition-colors duration-150">
                <span class="h-2.5 w-2.5 rounded-full shrink-0"
                      [style.background]="serviceDotColor(svc.status)"></span>
                <div class="min-w-0 flex-1">
                  <div class="font-mono text-sm font-semibold truncate">{{ svc.name }}</div>
                  @if (svc.error) {
                    <div class="text-xs text-rose-600 truncate">{{ svc.error }}</div>
                  } @else if (svc.latency_ms !== null) {
                    <div class="text-xs text-ink-500">{{ svc.latency_ms }} ms</div>
                  }
                </div>
                @if (!svc.critical) {
                  <span class="text-[9px] uppercase tracking-[0.14em] font-bold
                               px-1.5 py-0.5 rounded bg-surface-100 text-ink-500">Optional</span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class HealthBadgeComponent {
  readonly health = inject(SystemHealthService);
  readonly open = signal<boolean>(false);

  tooltip(): string {
    const overall = this.health.overall();
    if (overall === "healthy") return "All systems nominal — click for details";
    if (overall === "unreachable") return "admin_api unreachable — click for details";
    return `${this.health.issueCount()} issue(s) — click for details`;
  }

  /** Top-bar dot colour — HSL/RGB values avoid Angular's class-binding issues with Tailwind arbitrary values. */
  overallDotColor(): string {
    switch (this.health.overall()) {
      case "healthy":     return "#34D399";   // emerald-400
      case "degraded":    return "#FBBF24";   // amber-400
      case "unreachable": return "#FB7185";   // rose-400
    }
  }

  overallDotGlow(): string {
    switch (this.health.overall()) {
      case "healthy":     return "0 0 8px rgba(16, 185, 129, 0.8)";
      case "degraded":    return "0 0 8px rgba(251, 191, 36, 0.8)";
      case "unreachable": return "0 0 8px rgba(251, 113, 133, 0.8)";
    }
  }

  /** Dropdown-header tint — a soft gradient matching the overall status. */
  headerGradient(): string {
    switch (this.health.overall()) {
      case "healthy":
        return "linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.10))";
      case "degraded":
        return "linear-gradient(135deg, rgba(245,158,11,0.05), rgba(245,158,11,0.10))";
      case "unreachable":
        return "linear-gradient(135deg, rgba(244,63,94,0.05), rgba(244,63,94,0.10))";
    }
  }

  /** Per-service dot colour used in the dropdown list rows. */
  serviceDotColor(status: ServiceStatus): string {
    switch (status) {
      case "up":       return "#10B981";   // emerald-500
      case "degraded": return "#F59E0B";   // amber-500
      case "down":     return "#EF4444";   // rose-500
    }
  }

  toggle(): void {
    this.open.set(!this.open());
  }

  refresh(): void {
    this.health.refresh();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    // Close if click landed outside this component.
    const host = (event.target as HTMLElement).closest("ws-health-badge");
    if (!host && this.open()) {
      this.open.set(false);
    }
  }
}
