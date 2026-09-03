import './style.css';
import { DataStore } from './data/defaultData';
import { AuthManager } from './auth';
import { CepManager } from './ui/cep';
import { ScriptCueEngine } from './ui/scriptCue';
import { ActionCardRenderer } from './ui/actionCard';
import { DecisionMatrix } from './ui/matrix';
import { GdsRunbookEngine } from './ui/runbook';
import { MultiPnrTracker } from './ui/multiPnr';
import { SopManager } from './sopManager';

declare global {
  interface Window {
    ctxData: {
      brand: string;
      pnr: string;
      airline: string;
      pax: string;
      lastName: string;
      newDate: string;
      quoteAmount: string;
      currency: string;
      requestName: string;
      solutionName: string;
      hasChild: boolean;
      hasInfant: boolean;
      partialPax: boolean;
    };
    updateContext: () => void;
    appInstance: App;
  }
}

class App {
  public dataStore: DataStore;
  public authManager!: AuthManager;
  public cepManager!: CepManager;
  public scriptCueEngine!: ScriptCueEngine;
  public actionCardRenderer!: ActionCardRenderer;
  public decisionMatrix!: DecisionMatrix;
  public runbookEngine!: GdsRunbookEngine;
  public multiPnrTracker!: MultiPnrTracker;
  public sopManager!: SopManager;

  private toastContainer!: HTMLElement;
  private isInitialized = false;

  constructor() {
    this.dataStore = new DataStore();
    this.toastContainer = document.getElementById('toastContainer') as HTMLElement;
  }

  public init(): void {
    this.authManager = new AuthManager(() => this.bootstrapWorkspace());
    this.authManager.init();
    this.bindGlobalKeyboard();
    this.bindContextModal();
  }

  private bootstrapWorkspace(): void {
    if (this.isInitialized) return;

    // 1. Script Cue Engine (Layer C)
    this.scriptCueEngine = new ScriptCueEngine(this.dataStore, (text, title) => {
      this.showToast(`Logged Voice Cue: "${title}"`);
    });

    // 2. Action Card Renderer (Layer B)
    this.actionCardRenderer = new ActionCardRenderer(this.scriptCueEngine, (runbookId) => {
      this.runbookEngine.loadRunbook(runbookId);
      this.showToast(`Opened GDS Runbook: ${runbookId}`);
    });

    // 3. Progressive Decision Matrix (Layer B)
    this.decisionMatrix = new DecisionMatrix(this.dataStore, this.actionCardRenderer);

    // 4. CEP Manager (Layer A)
    this.cepManager = new CepManager((stepId) => {
      this.scriptCueEngine.filterByCepStep(stepId);
    });

    // 5. GDS Live Runbook Engine (Layer D)
    this.runbookEngine = new GdsRunbookEngine(this.dataStore);

    // 6. Multi-PNR Tracker (Layer D)
    this.multiPnrTracker = new MultiPnrTracker();

    // 7. SOP & JSON Rule Manager
    this.sopManager = new SopManager(
      this.dataStore,
      this.scriptCueEngine,
      this.decisionMatrix,
      this.runbookEngine,
      (msg) => this.showToast(msg)
    );

    // Initialize all components
    this.scriptCueEngine.init();
    this.decisionMatrix.init();
    this.cepManager.init();
    this.runbookEngine.init();
    this.multiPnrTracker.init();

    // Reset button in Matrix
    const resetBtn = document.getElementById('resetMatrixBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.decisionMatrix.reset();
        this.showToast('Reset Decision Matrix to Priority Floor Case');
      });
    }

    // Density Mode Handling (Default: Comfort)
    const densityBtn = document.getElementById('densityToggleBtn');
    const densityText = document.getElementById('densityModeText');
    const applyDensity = (mode: string) => {
      document.documentElement.setAttribute('data-density', mode);
      localStorage.setItem('fl_density_mode', mode);
      if (densityText) {
        densityText.textContent = mode === 'compact' ? 'Compact' : 'Comfort';
      }
    };
    const storedDensity = localStorage.getItem('fl_density_mode') || 'comfort';
    applyDensity(storedDensity);

    if (densityBtn) {
      densityBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-density') || 'comfort';
        const next = current === 'compact' ? 'comfort' : 'compact';
        applyDensity(next);
        this.showToast(`Switched density to ${next === 'compact' ? 'Compact' : 'Comfort (Default)'}`);
      });
    }

    // Multi-PNR Header Toggle Chip in Runbook Panel
    const pnrHeaderToggle = document.getElementById('pnrRunbookHeaderToggle');
    if (pnrHeaderToggle) {
      pnrHeaderToggle.addEventListener('click', () => {
        this.multiPnrTracker.toggle();
        this.showToast(this.multiPnrTracker.isCollapsed ? 'Call Focus Mode: Runbook full-width' : 'Multi-PNR Tracker expanded');
      });
    }

    this.isInitialized = true;
    window.updateContext();
  }

  public showToast(message: string): void {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span><span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  private bindGlobalKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement;
      const tag = targetEl && targetEl.tagName ? targetEl.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (!isInput) {
        // Shortcut / : Focus Script Cue Search
        if (e.key === '/') {
          e.preventDefault();
          this.scriptCueEngine?.focus();
        }
        // Shortcut m / M : Focus Decision Matrix
        else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          this.decisionMatrix?.focus();
        }
        // Shortcut g / G : Focus Runbook scenario selector
        else if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          const sel = document.getElementById('runbookSelectDropdown') as HTMLSelectElement | null;
          sel?.focus();
        }
        // Shortcut t / T : Toggle Multi-PNR Tracker (Call Focus mode)
        else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          this.multiPnrTracker?.toggle();
        }
        // Shortcuts 1-8 : CEP Steps (only if Runbook is not active)
        else if (e.key >= '1' && e.key <= '8') {
          const runbookPanel = document.querySelector('.runbook-panel');
          const isRunbookActive = this.runbookEngine?.isRunbookFocused || 
            (runbookPanel && (runbookPanel.contains(document.activeElement) || runbookPanel.matches(':hover') || runbookPanel.getAttribute('data-focused') === 'true'));
          if (isRunbookActive) {
            return;
          }
          const stepNum = parseInt(e.key, 10);
          this.cepManager?.setStepByIndex(stepNum - 1);
        }
      }

      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach((m) => m.classList.remove('active'));
      }
    });
  }

  private bindContextModal(): void {
    const toggleBtn = document.getElementById('toggleContextModalBtn');
    const modal = document.getElementById('contextModal');
    const closeBtn = document.getElementById('contextModalClose');
    const cancelBtn = document.getElementById('contextModalCancel');
    const doneBtn = document.getElementById('contextModalDone');

    if (toggleBtn && modal) {
      toggleBtn.addEventListener('click', () => {
        window.updateContext();
        modal.classList.add('active');
      });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    if (doneBtn && modal) {
      doneBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        this.showToast(`Saved case details (PNR: ${window.ctxData.pnr})`);
      });
    }
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Initial Booking Context (Pre-filled for Danny's Priority Floor Case)
window.ctxData = {
  brand: 'ETG',
  pnr: 'HT89KL',
  airline: 'VN',
  pax: '2',
  lastName: 'NGUYEN',
  newDate: '25OCT',
  quoteAmount: '185.00',
  currency: 'EUR',
  requestName: 'rebooking 2 passengers on flight to 25OCT',
  solutionName: 'splitting PNR to rebook 2 passengers to 25OCT on VN',
  hasChild: false,
  hasInfant: false,
  partialPax: true,
};

window.updateContext = function () {
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || '';
  const checked = (id: string) => !!(document.getElementById(id) as HTMLInputElement | null)?.checked;

  const brand = val('ctxBrand') || 'ETG';
  const pnr = (val('ctxPnr') || 'HT89KL').toUpperCase().trim();
  const airline = (val('ctxAirline') || 'VN').toUpperCase().trim();
  const pax = val('ctxPaxCount') || '2';
  const lastName = (val('ctxLastName') || 'NGUYEN').toUpperCase().trim();
  const newDate = (val('ctxNewDate') || '25OCT').toUpperCase().trim();
  const quoteAmount = val('ctxAmount') || '185.00';
  const currency = val('ctxCurrency') || 'EUR';
  const hasChild = checked('ctxHasChild');
  const hasInfant = checked('ctxHasInfant');
  const partialPax = checked('ctxPartialPax');

  // Dynamic requestName and solutionName built from user input fields (no hardcoded English strings)
  const paxNum = parseInt(pax, 10) || 1;
  const paxLabel = paxNum === 1 ? '1 passenger' : `${paxNum} passengers`;
  const extraTags: string[] = [];
  if (hasChild) extraTags.push('with child');
  if (hasInfant) extraTags.push('with infant');
  const extraDesc = extraTags.length > 0 ? ` (${extraTags.join(', ')})` : '';

  const requestName = `rebooking ${paxLabel}${extraDesc} on flight to ${newDate}`;
  const solutionName = partialPax
    ? `splitting PNR to rebook ${paxLabel}${extraDesc} to ${newDate} on ${airline}`
    : `rebooking ${paxLabel}${extraDesc} to ${newDate} on ${airline}`;

  window.ctxData = {
    brand,
    pnr,
    airline,
    pax,
    lastName,
    newDate,
    quoteAmount,
    currency,
    requestName,
    solutionName,
    hasChild,
    hasInfant,
    partialPax,
  };

  // Live preview box update in modal
  const previewCueEl = document.getElementById('previewCueText');
  if (previewCueEl) {
    const custSalutation = lastName ? `Mr./Ms. ${lastName}` : 'Customer';
    previewCueEl.textContent = `“Thank you for holding, ${custSalutation}. I understand you need help with ${requestName}. I can assist you with ${solutionName}. The total quote is ${currency} ${quoteAmount}.”`;
  }

  const previewCmdEl = document.getElementById('previewCmdText');
  if (previewCmdEl) {
    if (partialPax && paxNum > 1) {
      previewCmdEl.textContent = `RT${pnr} → SP1,${paxNum} → ER → RTAXR`;
    } else {
      previewCmdEl.textContent = `RT${pnr} → SN${newDate}SGNPAR/A${airline} → FXQ/S5/R,UP`;
    }
  }

  const app = window.appInstance;
  if (app && app.scriptCueEngine) {
    app.scriptCueEngine.refresh();
  }
  if (app && app.decisionMatrix) {
    app.decisionMatrix.evaluateMatches();
  }
  if (app && app.runbookEngine) {
    app.runbookEngine.render();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.appInstance = app;
});
