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
    const csBtn = document.getElementById('openCheatSheetBtn');
    const csModal = document.getElementById('cheatSheetModal');
    const csClose = document.getElementById('cheatSheetModalClose');
    if (csBtn && csModal) {
      csBtn.addEventListener('click', () => csModal.classList.add('active'));
    }
    if (csClose && csModal) {
      csClose.addEventListener('click', () => csModal.classList.remove('active'));
    }

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
window.ctxData = { pnr: '', airline: '', pax: '', lastName: '' };

window.updateContext = function() {
  window.ctxData = {
    pnr: (document.getElementById('ctxPnr').value || '').toUpperCase(),
    airline: (document.getElementById('ctxAirline').value || '').toUpperCase(),
    pax: document.getElementById('ctxPaxCount').value || '[số khách]',
    lastName: (document.getElementById('ctxLastName').value || '').toUpperCase()
  };
  renderDynamicCommands();
};

window.switchAmadeusTab = function(tab) {
  document.getElementById('tabCommands').classList.toggle('active', tab === 'commands');
  document.getElementById('tabWorkflow').classList.toggle('active', tab === 'workflow');
  document.getElementById('amadeusCommandsContent').style.display = tab === 'commands' ? 'block' : 'none';
  document.getElementById('amadeusWorkflowContent').style.display = tab === 'workflow' ? 'block' : 'none';
};

window.renderDynamicCommands = function() {
  const c = window.ctxData;
  const pnrCmd = c.pnr ? `RT${c.pnr}` : 'RT[PNR]';
  const nameCmd = c.lastName && c.pax !== '[số khách]' ? `NM${c.pax}${c.lastName}/[TÊN]` : 'NM[số khách][HỌ]/[TÊN]';
  
  const commands = [
    { desc: 'Mở PNR', cmd: pnrCmd },
    { desc: 'Đổi Tên (NACO)', cmd: `NU1${c.lastName || '[HỌ]'}/[FIRST NAME] MS` },
    { desc: 'Kiểm tra trạng thái coupon (Đảm bảo là O)', cmd: 'RTTN' },
    { desc: 'Hiển thị ticket theo line', cmd: 'TWD/L7' },
    { desc: 'Tìm chuyến bay mới', cmd: `SN[ngày][chặng]/A${c.airline || '[hãng]'}` },
    { desc: 'Book chặng', cmd: `SS${c.pax}[hạng vé][dòng]` },
    { desc: 'Tính giá theo hạng vé đã chọn (FXQ)', cmd: 'FXQ/S[dòng]/R,UP' },
    { desc: 'Rebook vào hạng vé rẻ nhất hiện có (FXO)', cmd: 'FXO/S[dòng]/R,UP' },
    { desc: 'Xóa giá cũ (Sửa lỗi segment overlap)', cmd: 'TTE/ALL' },
    { desc: 'Xóa chặng bay cũ', cmd: 'XE[dòng]' },
    { desc: 'Lưu PNR và gửi sang Ticketing', cmd: 'ER' }
  ];

  const html = commands.map(c => `
    <div class="command-row" style="display: flex; justify-content: space-between; padding: 10px; background: var(--bg-secondary); border-radius: 4px; border: 1px solid var(--border-color);">
      <span style="font-size: 0.85rem;">${c.desc}</span>
      <code style="cursor: pointer; color: var(--accent-emerald); font-weight: bold;" onclick="navigator.clipboard.writeText('${c.cmd}'); appInstance.showToast('Copied ${c.cmd.replace(/'/g, "\\'")}')">${c.cmd}</code>
    </div>
  `).join('');
  
  const list = document.getElementById('dynamicCommandsList');
  if (list) list.innerHTML = html;

  // Update workflow references
  const wfRt = document.getElementById('wf_rt');
  if(wfRt) wfRt.textContent = pnrCmd;
};

// Initialize render
setTimeout(() => { if(window.renderDynamicCommands) window.renderDynamicCommands(); }, 500);



document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  (window as any).appInstance = app;
});