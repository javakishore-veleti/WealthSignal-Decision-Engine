import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { NgClass } from "@angular/common";
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from "@angular/router";
import { filter, map, startWith } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";

type TopSection = "dashboard" | "domain-services" | "administration";

/**
 * Top-level application shell — top nav, left side nav, main content.
 * The left rail switches contents based on the active top-nav section.
 */
@Component({
  selector: "ws-shell",
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./shell.component.scss",
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- ─── Top nav ─────────────────────────────────────────────────── -->
      <header
        class="sticky top-0 z-30 text-white shadow-[0_8px_32px_-16px_rgba(79,70,229,0.45)]"
        style="background: linear-gradient(120deg, #4F46E5 0%, #7C3AED 45%, #06B6D4 100%);">
        <div class="max-w-[1600px] mx-auto flex items-center gap-2 px-6 py-3">
          <!-- Brand lockup -->
          <a routerLink="/dashboard" class="flex items-center gap-3 pr-6 border-r border-white/20">
            <div class="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center
                        ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <svg viewBox="0 0 24 24" fill="none" class="h-6 w-6 text-white">
                <path d="M4 14.5L8 6l4 8.5L16 6l4 8.5" stroke="currentColor" stroke-width="2.4"
                      stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="20" cy="14.5" r="1.7" fill="currentColor"/>
              </svg>
            </div>
            <div class="leading-tight">
              <div class="font-display font-bold text-lg tracking-tight">WealthSignal</div>
              <div class="text-[11px] uppercase tracking-[0.18em] text-white/70">Admin Console</div>
            </div>
          </a>

          <!-- Primary nav -->
          <nav class="flex items-center gap-1 ml-4">
            <a routerLink="/dashboard" routerLinkActive="active" class="ws-topnav-link">Dashboard</a>
            <a routerLink="/domain-services/product-catalog" routerLinkActive="active"
               class="ws-topnav-link">Domain Services</a>
            <a routerLink="/administration/system-settings/mlflow-experiments"
               routerLinkActive="active" class="ws-topnav-link">Administration</a>
            <a class="ws-topnav-link opacity-60 cursor-not-allowed">Compliance</a>
          </nav>

          <div class="flex-1"></div>

          <!-- Environment pill -->
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full
                      bg-white/10 backdrop-blur text-xs font-semibold tracking-wide">
            <span class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            LOCAL &middot; {{ now() }}
          </div>

          <button class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10
                         hover:bg-white/20 transition-colors duration-200">
            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-gold-400 to-coral-500
                        flex items-center justify-center font-bold text-sm">KV</div>
            <div class="text-left leading-tight pr-2 hidden sm:block">
              <div class="text-sm font-semibold">Kishore Veleti</div>
              <div class="text-[11px] text-white/70">Platform Admin</div>
            </div>
          </button>
        </div>
      </header>

      <!-- ─── Body: side nav + content ──────────────────────────────── -->
      <div class="flex-1 flex max-w-[1600px] w-full mx-auto">
        <aside class="hidden lg:flex w-72 shrink-0 p-6 flex-col gap-6">

          <!-- ── Domain Services rail ────────────────────────────── -->
          @if (topSection() === "domain-services") {
            <div>
              <div class="uppercase text-[11px] tracking-[0.22em] font-bold text-ink-500 mb-3 px-2">
                Domain Services
              </div>
              <nav class="flex flex-col gap-1">
                <!-- Product Catalog group -->
                <button
                  (click)="toggleGroup('product-catalog')"
                  [ngClass]="{ 'active': group() === 'product-catalog' }"
                  class="ws-side-link w-full justify-between">
                  <span class="flex items-center gap-3">
                    <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500
                                 flex items-center justify-center text-white text-xs font-bold">PC</span>
                    <span>Product Catalog</span>
                  </span>
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 transition-transform duration-250"
                       [ngClass]="{ 'rotate-90': group() === 'product-catalog' }">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M6.7 4.7a1 1 0 011.4 0l4.6 4.6a1 1 0 010 1.4l-4.6 4.6a1 1 0 01-1.4-1.4L10.5 10 6.7 6.1a1 1 0 010-1.4z"/>
                  </svg>
                </button>

                @if (group() === "product-catalog") {
                  <div class="flex flex-col gap-1 mt-1">
                    <a routerLink="/domain-services/product-catalog"
                       [routerLinkActiveOptions]="{ exact: true }"
                       routerLinkActive="active" class="ws-side-sub">
                      <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                      View All
                    </a>
                    <a routerLink="/domain-services/product-catalog/create"
                       routerLinkActive="active" class="ws-side-sub">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Create
                    </a>
                    <a routerLink="/domain-services/product-catalog/search"
                       routerLinkActive="active" class="ws-side-sub">
                      <span class="h-1.5 w-1.5 rounded-full bg-accent-500"></span>
                      Search
                    </a>
                    <a routerLink="/domain-services/product-catalog/initial-load"
                       routerLinkActive="active" class="ws-side-sub">
                      <span class="h-1.5 w-1.5 rounded-full bg-gold-500"></span>
                      Initial Data Load Setup
                    </a>
                  </div>
                }

                <button class="ws-side-link opacity-60 cursor-not-allowed mt-2">
                  <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-coral-500 to-rose-500
                               flex items-center justify-center text-white text-xs font-bold">MR</span>
                  <span>Model Registry</span>
                </button>
                <button class="ws-side-link opacity-60 cursor-not-allowed">
                  <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-accent-500
                               flex items-center justify-center text-white text-xs font-bold">CS</span>
                  <span>Customer Segments</span>
                </button>
                <button class="ws-side-link opacity-60 cursor-not-allowed">
                  <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-500 to-coral-500
                               flex items-center justify-center text-white text-xs font-bold">CM</span>
                  <span>Campaigns</span>
                </button>
              </nav>
            </div>
          }

          <!-- ── Administration rail ────────────────────────────── -->
          @if (topSection() === "administration") {
            <div>
              <div class="uppercase text-[11px] tracking-[0.22em] font-bold text-ink-500 mb-3 px-2">
                Administration
              </div>
              <nav class="flex flex-col gap-1">
                <!-- System Settings group -->
                <button
                  (click)="toggleGroup('system-settings')"
                  [ngClass]="{ 'active': group() === 'system-settings' }"
                  class="ws-side-link w-full justify-between">
                  <span class="flex items-center gap-3">
                    <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-500 to-coral-500
                                 flex items-center justify-center text-white text-xs font-bold">SS</span>
                    <span>System Settings</span>
                  </span>
                  <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 transition-transform duration-250"
                       [ngClass]="{ 'rotate-90': group() === 'system-settings' }">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M6.7 4.7a1 1 0 011.4 0l4.6 4.6a1 1 0 010 1.4l-4.6 4.6a1 1 0 01-1.4-1.4L10.5 10 6.7 6.1a1 1 0 010-1.4z"/>
                  </svg>
                </button>

                @if (group() === "system-settings") {
                  <div class="flex flex-col gap-1 mt-1">
                    <a routerLink="/administration/system-settings/mlflow-experiments"
                       routerLinkActive="active" class="ws-side-sub">
                      <span class="h-1.5 w-1.5 rounded-full bg-accent-500"></span>
                      MLflow Experiments
                    </a>
                    <a class="ws-side-sub opacity-60 cursor-not-allowed">
                      <span class="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                      Airflow Connections
                    </a>
                    <a class="ws-side-sub opacity-60 cursor-not-allowed">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Database Migrations
                    </a>
                    <a class="ws-side-sub opacity-60 cursor-not-allowed">
                      <span class="h-1.5 w-1.5 rounded-full bg-gold-500"></span>
                      Health Checks
                    </a>
                  </div>
                }

                <button class="ws-side-link opacity-60 cursor-not-allowed mt-2">
                  <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500
                               flex items-center justify-center text-white text-xs font-bold">UM</span>
                  <span>User Management</span>
                </button>
                <button class="ws-side-link opacity-60 cursor-not-allowed">
                  <span class="h-8 w-8 rounded-lg bg-gradient-to-br from-coral-500 to-rose-500
                               flex items-center justify-center text-white text-xs font-bold">AL</span>
                  <span>Audit Log</span>
                </button>
              </nav>
            </div>
          }

          <!-- Info card at bottom (all rails) -->
          <div class="mt-auto ws-card p-5">
            <div class="flex items-center gap-3 mb-3">
              <div class="h-9 w-9 rounded-xl bg-aurora flex items-center justify-center shadow-glow">
                <svg viewBox="0 0 20 20" fill="white" class="h-4 w-4">
                  <path d="M9 2a1 1 0 112 0v1a1 1 0 11-2 0V2zm5 3a1 1 0 110 2 1 1 0 010-2zM3 11a1 1 0 110-2 1 1 0 010 2zm8 7a1 1 0 11-2 0v-1a1 1 0 112 0v1zm5-4a1 1 0 110 2 1 1 0 010-2zm1-5a1 1 0 11-2 0 1 1 0 012 0zM6 14a1 1 0 11-2 0 1 1 0 012 0z"/>
                </svg>
              </div>
              <div class="leading-tight">
                <div class="font-semibold text-sm text-ink-900">Need a hand?</div>
                <div class="text-xs text-ink-500">Ops runbooks</div>
              </div>
            </div>
            <p class="text-xs text-ink-500 leading-relaxed mb-3">
              Full architecture, migration workflow, and DAG playbooks in the repo docs.
            </p>
            <a class="text-xs font-semibold text-brand-700 hover:text-brand-900">Open runbooks &rarr;</a>
          </div>
        </aside>

        <main class="flex-1 min-w-0 p-6 lg:pl-0">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private readonly router = inject(Router);

  readonly group = signal<string>("product-catalog");
  readonly now = signal<string>(
    new Date().toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
  );

  /** Current top-nav section derived from the URL. */
  readonly topSection = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      startWith(null),
      map((): TopSection => this.resolveTopSection(this.router.url)),
    ),
    { initialValue: this.resolveTopSection(this.router.url) },
  );

  toggleGroup(id: string): void {
    this.group.set(this.group() === id ? "" : id);
  }

  private resolveTopSection(url: string): TopSection {
    if (url.startsWith("/administration")) return "administration";
    if (url.startsWith("/domain-services")) return "domain-services";
    return "dashboard";
  }
}
