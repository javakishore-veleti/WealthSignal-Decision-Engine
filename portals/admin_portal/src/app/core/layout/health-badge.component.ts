import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";

import { SystemHealthService } from "../services/system-health.service";
import { ServiceHealth } from "../models/system-health.model";

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
        <!-- Dot — colour by overall status -->
        <span class="h-2 w-2 rounded-full"
              [class.bg-emerald-400]="health.overall() === 'healthy'"
              [class.bg-gold-400]="health.overall() === 'degraded'"
              [class.bg-rose-400]="health.overall() === 'unreachable'"
              [class.shadow-[0_0_8px_rgba(16,185,129,0.8)]]="health.overall() === 'healthy'"
              [class.shadow-[0_0_8px_rgba(251,191,36,0.8)]]="health.overall() === 'degraded'"
              [class.shadow-[0_0_8px_rgba(251,113,133,0.8)]]="health.overall() === 'unreachable'"></span>

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
               [class.bg-gradient-to-br]="true"
               [class.from-emerald-500/5]="health.overall() === 'healthy'"
               [class.to-emerald-500/10]="health.overall() === 'healthy'"
               [class.from-gold-500/5]="health.overall() === 'degraded'"
               [class.to-gold-500/10]="health.overall() === 'degraded'"
               [class.from-rose-500/5]="health.overall() === 'unreachable'"
               [class.to-rose-500/10]="health.overall() === 'unreachable'">
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
                      [class.bg-emerald-500]="svc.status === 'up'"
                      [class.bg-gold-500]="svc.status === 'degraded'"
                      [class.bg-rose-500]="svc.status === 'down'"></span>
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
