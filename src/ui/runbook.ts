import { DataStore } from '../data/defaultData';
import { Runbook, RunbookStep } from '../types';

export class GdsRunbookEngine {
  private dataStore: DataStore;
  private activeRunbook: Runbook | null = null;
  private currentStepIndex: number = 0;
  private completedSteps: Set<number> = new Set();
  private onStepChangeCallback?: (step: RunbookStep, total: number) => void;

  private container!: HTMLElement;
  private runbookSelectDropdown!: HTMLSelectElement;

  constructor(dataStore: DataStore, onStepChange?: (step: RunbookStep, total: number) => void) {
    this.dataStore = dataStore;
    this.onStepChangeCallback = onStepChange;
    this.container = document.getElementById('runbookContainer') as HTMLElement;
  }

  public init(): void {
    const runbooks = this.dataStore.getRunbooks();
    if (runbooks.length > 0) {
      // Default to the priority floor case: amadeus_rebook_partial_pax
      const priorityCase = runbooks.find(r => r.id === 'amadeus_rebook_partial_pax') || runbooks[0];
      this.loadRunbook(priorityCase.id);
    }
    this.bindGlobalKeyboard();
  }

  public loadRunbook(runbookId: string): void {
    const rb = this.dataStore.getRunbookById(runbookId);
    if (!rb) return;

    this.activeRunbook = rb;
    this.currentStepIndex = 0;
    this.completedSteps.clear();
    this.render();
  }

  public nextStep(): void {
    if (!this.activeRunbook) return;
    if (this.currentStepIndex < this.activeRunbook.steps.length - 1) {
      this.completedSteps.add(this.currentStepIndex);
      this.checkSplitCompletion();
      this.currentStepIndex++;
      this.render();
    }
  }

  public prevStep(): void {
    if (!this.activeRunbook) return;
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.render();
    }
  }

  public toggleCurrentStepDone(): void {
    if (this.completedSteps.has(this.currentStepIndex)) {
      this.completedSteps.delete(this.currentStepIndex);
    } else {
      this.completedSteps.add(this.currentStepIndex);
      this.checkSplitCompletion();
    }
    this.render();
  }

  private checkSplitCompletion(): void {
    if (!this.activeRunbook) return;
    if (this.currentStepIndex === 0 && (this.activeRunbook.id.includes('split') || this.activeRunbook.id.includes('partial_pax'))) {
      window.dispatchEvent(new CustomEvent('fl-split-step-done'));
    }
  }

  private bindGlobalKeyboard(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.nextStep();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        this.prevStep();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.toggleCurrentStepDone();
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        const sel = document.getElementById('runbookSelectDropdown') as HTMLSelectElement | null;
        sel?.focus();
      }
    });
  }

  public render(): void {
    if (!this.container || !this.activeRunbook) return;

    const rb = this.activeRunbook;
    const steps = rb.steps;
    const step = steps[this.currentStepIndex];
    const totalSteps = steps.length;
    const isDone = this.completedSteps.has(this.currentStepIndex);

    // Interpolate dynamic parameters from context
    const interpolatedCmd = this.interpolateCommand(step.cmd);

    const isRebookingWizard = rb.wizard_type.toLowerCase().includes('rebooking');
    const isModifyOrder = rb.wizard_type.toLowerCase().includes('modify');

    this.container.innerHTML = `
      <div class="runbook-layout">
        <!-- Top Toolbar & Switcher -->
        <div class="runbook-top-bar">
          <div class="runbook-switcher-group">
            <span class="runbook-icon">📖</span>
            <label for="runbookSelectDropdown" class="sr-only">Runbook Scenario</label>
            <select id="runbookSelectDropdown" class="runbook-select">
              ${this.dataStore.getRunbooks().map(r => `
                <option value="${r.id}" ${r.id === rb.id ? 'selected' : ''}>
                  ${r.gds.toUpperCase()} · ${r.title}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="runbook-badges-group">
            <span class="gds-system-badge ${rb.gds}">${rb.gds.toUpperCase()}</span>
            ${isRebookingWizard ? `
              <span class="wizard-badge badge-rebooking-wizard" title="Tickets kept & reissued — NO refund involved">
                ⚡ Rebooking Wizard (Ticketing Queue)
              </span>
            ` : ''}
            ${isModifyOrder ? `
              <span class="wizard-badge badge-modify-order" title="Cancellations/voids — refund involved">
                ⚠️ Modify Order (Edvin CXL Wizard)
              </span>
            ` : ''}
            ${!isRebookingWizard && !isModifyOrder ? `
              <span class="wizard-badge badge-neutral">${rb.wizard_type}</span>
            ` : ''}
          </div>
        </div>

        <!-- Branch Chips -->
        ${rb.branch && rb.branch.length > 0 ? `
          <div class="branch-chips-row">
            <span class="branch-chips-label">BRANCHES:</span>
            ${rb.branch.map(b => `
              <span class="branch-chip">${this.escapeHtml(b)}</span>
            `).join('')}
          </div>
        ` : ''}

        <!-- Huge Active Step Display -->
        <div class="active-step-card ${isDone ? 'step-completed-card' : ''}">
          <div class="step-meta-row">
            <div class="step-counter-tag">
              <span class="counter-num">STEP ${step.step_num} OF ${totalSteps}</span>
              ${isDone ? '<span class="status-done-tag">✓ COMPLETED</span>' : '<span class="status-active-tag">● CURRENT ACTION</span>'}
            </div>
            <div class="step-nav-buttons">
              <button type="button" class="btn btn-sm btn-nav" id="btnPrevStep" ${this.currentStepIndex === 0 ? 'disabled' : ''}>
                <span>◀ Prev (p)</span>
              </button>
              <button type="button" class="btn btn-sm btn-nav btn-primary" id="btnNextStep" ${this.currentStepIndex === totalSteps - 1 ? 'disabled' : ''}>
                <span>Next ▶ (n)</span>
              </button>
              <button type="button" class="btn btn-sm btn-toggle-done" id="btnToggleDone">
                <span>${isDone ? 'Undo (Space)' : 'Mark Done (Space)'}</span>
              </button>
            </div>
          </div>

          <h3 class="active-step-title">${this.escapeHtml(step.title)}</h3>
          <p class="active-step-desc">${this.escapeHtml(step.desc)}</p>

          <!-- Large Monospace GDS Command Box -->
          <div class="cmd-box-container">
            <div class="cmd-box-header">
              <span class="cmd-header-label">TERMINAL COMMAND (CLICK TO COPY):</span>
              <span class="kbd-badge">Single Click</span>
            </div>
            <div class="cmd-terminal-box" id="activeCmdBox" title="Click to copy GDS command">
              <code>${this.formatHighlightedCmd(interpolatedCmd)}</code>
              <button type="button" class="btn-copy-cmd" id="btnCopyCmd">📋 Copy</button>
            </div>
          </div>

          ${step.notes ? `
            <div class="step-notes-box">
              <span class="notes-icon">💡</span>
              <span class="notes-text">${this.escapeHtml(step.notes)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Step Progression Breadcrumb Bar -->
        <div class="steps-progress-row">
          ${steps.map((s, idx) => {
            const active = idx === this.currentStepIndex;
            const completed = this.completedSteps.has(idx);
            return `
              <div class="step-dot-item ${active ? 'active' : ''} ${completed ? 'completed' : ''}" data-index="${idx}" title="${s.step_num}. ${s.title}">
                <span class="dot-num">${completed ? '✓' : s.step_num}</span>
                <span class="dot-label">${s.title.substring(0, 20)}...</span>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    this.bindInnerEvents(interpolatedCmd);
  }

  private bindInnerEvents(cmdText: string): void {
    const sel = this.container.querySelector('#runbookSelectDropdown') as HTMLSelectElement | null;
    if (sel) {
      sel.addEventListener('change', () => {
        this.loadRunbook(sel.value);
      });
    }

    const prevBtn = this.container.querySelector('#btnPrevStep');
    const nextBtn = this.container.querySelector('#btnNextStep');
    const doneBtn = this.container.querySelector('#btnToggleDone');
    const cmdBox = this.container.querySelector('#activeCmdBox');
    const copyCmdBtn = this.container.querySelector('#btnCopyCmd');

    if (prevBtn) prevBtn.addEventListener('click', () => this.prevStep());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextStep());
    if (doneBtn) doneBtn.addEventListener('click', () => this.toggleCurrentStepDone());

    const copyCmd = () => {
      navigator.clipboard.writeText(cmdText);
      if (copyCmdBtn) copyCmdBtn.textContent = '✓ Copied';
      setTimeout(() => {
        if (copyCmdBtn) copyCmdBtn.textContent = '📋 Copy';
      }, 1500);

      const appInstance = (window as any).appInstance;
      if (appInstance && typeof appInstance.showToast === 'function') {
        appInstance.showToast(`Copied GDS Command: ${cmdText}`);
      }
    };

    if (cmdBox) cmdBox.addEventListener('click', copyCmd);
    if (copyCmdBtn) copyCmdBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCmd();
    });

    this.container.querySelectorAll('.step-dot-item').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
        this.currentStepIndex = idx;
        this.render();
      });
    });
  }

  private interpolateCommand(cmd: string): string {
    const ctx = (window as any).ctxData || {};
    let res = cmd;
    const pnr = ctx.pnr || 'HT89KL';
    const airline = ctx.airline || 'VN';
    const pax = ctx.pax || '2';
    const lastName = ctx.lastName || 'NGUYEN';

    res = res.replace(/\[PNR\]/g, pnr);
    res = res.replace(/\[airline\]/g, airline);
    res = res.replace(/\[pax\]/g, pax);
    res = res.replace(/\[last_name\]/g, lastName);
    res = res.replace(/\[date\]/g, '25OCT');
    res = res.replace(/\[citypair\]/g, 'SGNPAR');
    res = res.replace(/\[class\]/g, 'M');
    res = res.replace(/\[line\]/g, '1');
    res = res.replace(/\[line_num\]/g, '7');
    res = res.replace(/\[old_segment\]/g, '4');
    res = res.replace(/\[old_segments\]/g, '3-4');
    res = res.replace(/\[new_segments\]/g, '5');
    res = res.replace(/\[new_segment\]/g, '5');
    res = res.replace(/\[dep\]/g, 'SGN');
    res = res.replace(/\[dest\]/g, 'PAR');
    res = res.replace(/\[flown_date\]/g, '10OCT');
    res = res.replace(/\[new_date\]/g, '25OCT');
    res = res.replace(/\[office\]/g, 'SGN1A0987');
    res = res.replace(/\[issue_date\]/g, '01SEP');
    res = res.replace(/\[ticket_line\]/g, '1');
    res = res.replace(/\[pax_line\]/g, '1,2');
    res = res.replace(/\[pax_numbers\]/g, '1,2');
    res = res.replace(/\[initials\]/g, 'DD');

    return res;
  }

  private formatHighlightedCmd(cmd: string): string {
    let escaped = this.escapeHtml(cmd);
    // Highlight separators and command codes
    escaped = escaped.replace(/(→)/g, '<span class="cmd-arrow">$1</span>');
    escaped = escaped.replace(/(RT\w+|SP[\d,]+|ER|RTAXR|RTTN|TWD\/L\d+|FXQ\/[^\s]+|FXO\/[^\s]+|FQP[^\s]+|XE\d+|SS\d+\w+|TRDC\/ALL|WV\d+|WFRFTR[^\s]+|WFRTR[^\s]+)/g, '<span class="cmd-token">$1</span>');
    return escaped;
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
