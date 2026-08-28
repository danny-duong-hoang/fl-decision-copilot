import './style.css';
import { DataStore } from './data/defaultData';
import { SnippetEngine } from './snippetEngine';
import { DecisionMatrix } from './decisionMatrix';
import { CepStepper } from './cepStepper';
import { SopManager } from './sopManager';
import { AuthManager } from './auth';

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
  private isInitialized: boolean = false;

  constructor() {
    this.dataStore = new DataStore();
    this.toastContainer = document.getElementById('toastContainer') as HTMLElement;
    this.bufferText = document.getElementById('currentBufferText') as HTMLElement;
    this.quickCopyBtn = document.getElementById('quickCopyBufferBtn') as HTMLButtonElement;
  }

  public init(): void {
    this.authManager = new AuthManager(() => {
      this.bootstrapWorkspace();
    });

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

    this.isInitialized = true;
  }

  private handleSnippetCopied(text: string, title: string): void {
    if (this.bufferText) {
      this.bufferText.textContent = text;
    }
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
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2500);
  }

  private bindGlobalEvents(): void {
    if (this.quickCopyBtn) {
      this.quickCopyBtn.addEventListener('click', () => {
        const text = this.bufferText ? this.bufferText.textContent : '';
        if (text && text !== 'No snippet copied yet') {
          navigator.clipboard.writeText(text);
          this.showToast('Copied active buffer to clipboard!');
        }
      });
    }

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const search = document.getElementById('snippetSearchInput') as HTMLInputElement;
        if (search) {
          search.focus();
          search.select();
        }
      } else if ((e.key === 'm' || e.key === 'M') && !isInput) {
        e.preventDefault();
        if (this.decisionMatrix) {
          this.decisionMatrix.focus();
        }
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
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

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  (window as any).appInstance = app;
});
