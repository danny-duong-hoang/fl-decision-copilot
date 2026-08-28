import './style.css';
import { DataStore } from './data/defaultData';
import { SnippetEngine } from './snippetEngine';
import { DecisionMatrix } from './decisionMatrix';
import { CepStepper } from './cepStepper';
import { SopManager } from './sopManager';
import { AuthManager } from './auth';

declare global {
  interface Window {
    ctxData: {
      brand: string;
      pnr: string;
      airline: string;
      pax: string;
      lastName: string;
      hasChild: boolean;
      hasInfant: boolean;
      partialPax: boolean;
    };
    updateContext: () => void;
    switchAmadeusTab: (tab: 'commands' | 'workflow') => void;
    renderDynamicCommands: () => void;
    appInstance: App;
  }
}

class App {
  private dataStore: DataStore;
  private snippetEngine!: SnippetEngine;
  private decisionMatrix!: DecisionMatrix;
  private cepStepper!: CepStepper;
  private sopManager!: SopManager;
  private authManager!: AuthManager;

  private toastContainer!: HTMLElement;
  private bufferText!: HTMLElement;
  private quickCopyBtn!: HTMLButtonElement;
  private isInitialized = false;

  constructor() {
    this.dataStore = new DataStore();
    this.toastContainer = document.getElementById('toastContainer') as HTMLElement;
    this.bufferText = document.getElementById('currentBufferText') as HTMLElement;
    this.quickCopyBtn = document.getElementById('quickCopyBufferBtn') as HTMLButtonElement;
  }

  public init(): void {
    this.authManager = new AuthManager(() => this.bootstrapWorkspace());
    this.authManager.init();
    this.bindGlobalEvents();
  }

  private bootstrapWorkspace(): void {
    if (this.isInitialized) return;

    this.snippetEngine = new SnippetEngine(this.dataStore, (text, title) => {
      this.handleSnippetCopied(text, title);
    });
    this.decisionMatrix = new DecisionMatrix(this.dataStore, this.snippetEngine);
    this.cepStepper = new CepStepper(this.snippetEngine);
    this.sopManager = new SopManager(
      this.dataStore,
      this.snippetEngine,
      this.decisionMatrix,
      (msg) => this.showToast(msg)
    );

    this.snippetEngine.init();
    this.decisionMatrix.init();
    this.cepStepper.init();

    (window as any).decisionMatrix = this.decisionMatrix;
    (window as any).snippetEngine = this.snippetEngine;

    this.isInitialized = true;

    window.renderDynamicCommands();
  }

  private handleSnippetCopied(text: string, title: string): void {
    if (this.bufferText) this.bufferText.textContent = text;
    this.showToast(`Copied "${title || 'Text'}" to clipboard!`);
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

  private bindGlobalEvents(): void {
    const csBtn = document.getElementById('openCheatSheetBtn');
    const csModal = document.getElementById('cheatSheetModal');
    const csClose = document.getElementById('cheatSheetModalClose');
    if (csBtn && csModal) {
      csBtn.addEventListener('click', () => {
        window.renderDynamicCommands();
        csModal.classList.add('active');
      });
    }
    if (csClose && csModal) {
      csClose.addEventListener('click', () => csModal.classList.remove('active'));
    }

    const clearBtn = document.getElementById('clearContextBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const form = document.getElementById('contextForm') as HTMLFormElement | null;
        form?.reset();
        window.updateContext();
      });
    }

    if (this.quickCopyBtn) {
      this.quickCopyBtn.addEventListener('click', () => {
        const text = this.bufferText?.textContent || '';
        if (text && text !== 'No snippet copied yet') {
          navigator.clipboard.writeText(text);
          this.showToast('Copied active buffer to clipboard!');
        }
      });
    }

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const search = document.getElementById('snippetSearchInput') as HTMLInputElement | null;
        search?.focus();
        search?.select();
      } else if ((e.key === 'm' || e.key === 'M') && !isInput) {
        e.preventDefault();
        this.decisionMatrix?.focus();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach((m) => m.classList.remove('active'));
      }
    });
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

window.ctxData = {
  brand: 'ETG',
  pnr: '',
  airline: '',
  pax: '',
  lastName: '',
  hasChild: false,
  hasInfant: false,
  partialPax: false,
};

window.updateContext = function () {
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || '';
  const checked = (id: string) => !!(document.getElementById(id) as HTMLInputElement | null)?.checked;

  window.ctxData = {
    brand: val('ctxBrand') || 'ETG',
    pnr: val('ctxPnr').toUpperCase(),
    airline: val('ctxAirline').toUpperCase(),
    pax: val('ctxPaxCount') || '[pax]',
    lastName: val('ctxLastName').toUpperCase(),
    hasChild: checked('ctxHasChild'),
    hasInfant: checked('ctxHasInfant'),
    partialPax: checked('ctxPartialPax'),
  };
  window.renderDynamicCommands();

  const dm = (window as any).decisionMatrix || (window as any).appInstance?.decisionMatrix;
  if (dm && typeof dm.refreshContextBanner === 'function') {
    dm.refreshContextBanner();
  }
};

window.switchAmadeusTab = function (tab: 'commands' | 'workflow') {
  document.getElementById('tabCommands')?.classList.toggle('active', tab === 'commands');
  document.getElementById('tabWorkflow')?.classList.toggle('active', tab === 'workflow');
  const cmd = document.getElementById('amadeusCommandsContent');
  const wf = document.getElementById('amadeusWorkflowContent');
  if (cmd) cmd.style.display = tab === 'commands' ? 'block' : 'none';
  if (wf) wf.style.display = tab === 'workflow' ? 'block' : 'none';
};

window.renderDynamicCommands = function () {
  const c = window.ctxData;
  const pnrCmd = c.pnr ? `RT${c.pnr}` : 'RT[PNR]';
  const airline = c.airline || '[YY]';
  const pax = c.pax || '[pax]';
  const last = c.lastName || '[LAST]';

  const commands: Array<{ desc: string; cmd: string }> = [];

  if (c.partialPax) {
    commands.push({ desc: 'Split pax (Amadeus SP)', cmd: 'SP[line numbers of pax to split]' });
    commands.push({ desc: 'File split PNR', cmd: `RF${last};EF` });
  }

  commands.push(
    { desc: 'Open PNR', cmd: pnrCmd },
    { desc: 'Name correction (NACO)', cmd: `NU1${last}/[FIRST] MS` },
    { desc: 'Ticket list / coupon check', cmd: 'RTTN' },
    { desc: 'Display ticket by line', cmd: 'TWD/L7' },
    { desc: 'Availability', cmd: `SN[date][citypair]/A${airline}` },
    { desc: 'Sell segment', cmd: `SS${pax}[class][line]` },
    { desc: 'ATC quote (FXQ)', cmd: 'FXQ/S[lines]/R,UP' },
    { desc: 'ATC lowest (FXO)', cmd: 'FXO/S[lines]/R,UP' },
    { desc: 'Clear stored fares (overlap)', cmd: 'TTE/ALL' },
    { desc: 'Cancel old segment', cmd: 'XE[line]' },
    { desc: 'End + retrieve', cmd: 'ER' }
  );

  if (c.hasChild) commands.push({ desc: 'Note: CHD on PNR', cmd: `/* CHD present — price CHD correctly */` });
  if (c.hasInfant) commands.push({ desc: 'Note: INF on PNR', cmd: `/* INF present — SSR INFT / price INF */` });
  if (c.brand === 'BCOM') {
    commands.push({ desc: 'B.com rule', cmd: '/* NO ETG service fee · NO airline penalty quote path */' });
  }

  const list = document.getElementById('dynamicCommandsList');
  if (list) {
    list.innerHTML = commands
      .map((row) => {
        const safe = row.cmd.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `<div class="command-row"><span style="font-size:0.85rem;">${row.desc}</span><code onclick="navigator.clipboard.writeText('${safe}');window.appInstance&&window.appInstance.showToast('Copied')">${row.cmd}</code></div>`;
      })
      .join('');
  }

  const wfRt = document.getElementById('wf_rt');
  if (wfRt) wfRt.textContent = pnrCmd;
};

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  window.appInstance = app;
  window.updateContext();
});
