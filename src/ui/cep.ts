import { CepStepDef, QAItem } from '../types';

export class CepManager {
  private steps: CepStepDef[] = [
    { id: 'opening', num: 1, label: '1 Open', desc: 'Greeting, identity & request acknowledgement' },
    { id: 'acknowledgement', num: 2, label: '2 Ack', desc: 'Paraphrase request accurately' },
    { id: 'commitment', num: 3, label: '3 Commit', desc: 'Show strong ownership, no weak language' },
    { id: 'probing', num: 4, label: '4 Probe', desc: 'Verify PNR, pax count, dates & airline condition' },
    { id: 'solution', num: 5, label: '5 Solution', desc: 'GDS price breakdown, fees & options' },
    { id: 'agreement', num: 6, label: '6 Agree', desc: 'Explicit customer agreement before changes' },
    { id: 'summary', num: 7, label: '7 Summary', desc: '4-part recap: request, discussed, agreed, next' },
    { id: 'closing', num: 8, label: '8 Close', desc: 'Anything else & professional farewell' }
  ];

  private currentStepIndex: number = 0;
  private completedSteps: Set<number> = new Set();
  private onStepChangeCallback?: (stepId: string) => void;

  // Hold timer state
  private holdSeconds: number = 0;
  private holdInterval: any = null;
  private holdRunning: boolean = false;

  // QA Items (8-point scorecard)
  private qaItems: QAItem[] = [
    { id: 'qa_open', text: '1. Opening: Used proper branded greeting & agent name', checked: false },
    { id: 'qa_ack', text: '2. Acknowledgement: Paraphrased customer request clearly', checked: false },
    { id: 'qa_comm', text: '3. Commitment: Expressed strong ownership without weak language', checked: false },
    { id: 'qa_probe', text: '4. Probing: Verified order number, passenger name & flight conditions', checked: false },
    { id: 'qa_sol', text: '5. Solution: Checked airline rules/GDS and quoted exact options & fees', checked: false },
    { id: 'qa_agree', text: '6. Agreement: Secured explicit customer approval before ticketing', checked: false },
    { id: 'qa_sum', text: '7. Summary: Provided complete recap (Request, Discussed, Agreed, Next)', checked: false },
    { id: 'qa_close', text: '8. Closing: Offered further assistance and closed with courtesy', checked: false }
  ];

  private stepperContainer!: HTMLElement;
  private qaModal!: HTMLElement;
  private qaProgressFill!: HTMLElement;
  private qaProgressText!: HTMLElement;
  private holdTimerDisplay!: HTMLElement;
  private holdToggleBtn!: HTMLButtonElement;

  constructor(onStepChange?: (stepId: string) => void) {
    this.onStepChangeCallback = onStepChange;
    this.stepperContainer = document.getElementById('stepperContainer') as HTMLElement;
    this.qaModal = document.getElementById('qaModal') as HTMLElement;
    this.qaProgressFill = document.getElementById('qaProgressFill') as HTMLElement;
    this.qaProgressText = document.getElementById('qaProgressText') as HTMLElement;
    this.holdTimerDisplay = document.getElementById('holdTimerDisplay') as HTMLElement;
    this.holdToggleBtn = document.getElementById('holdToggleBtn') as HTMLButtonElement;
  }

  public init(): void {
    this.renderStepper();
    this.renderQaList();
    this.bindEvents();
    this.updateHoldDisplay();
  }

  public setStepByIndex(idx: number): void {
    if (idx < 0 || idx >= this.steps.length) return;
    this.completedSteps.add(this.currentStepIndex);
    this.currentStepIndex = idx;
    this.renderStepper();
    const step = this.steps[idx];
    if (this.onStepChangeCallback) {
      this.onStepChangeCallback(step.id);
    }
  }

  public getCurrentStepId(): string {
    return this.steps[this.currentStepIndex].id;
  }

  private bindEvents(): void {
    const qaOpenBtn = document.getElementById('openQaModalBtn');
    const qaCloseBtn = document.getElementById('qaModalClose');
    const qaDoneBtn = document.getElementById('qaDoneBtn');
    const qaResetBtn = document.getElementById('qaResetBtn');

    if (qaOpenBtn) qaOpenBtn.addEventListener('click', () => this.openQaModal());
    if (qaCloseBtn) qaCloseBtn.addEventListener('click', () => this.closeQaModal());
    if (qaDoneBtn) qaDoneBtn.addEventListener('click', () => this.closeQaModal());
    if (qaResetBtn) {
      qaResetBtn.addEventListener('click', () => {
        this.qaItems.forEach(i => i.checked = false);
        this.renderQaList();
      });
    }

    if (this.holdToggleBtn) {
      this.holdToggleBtn.addEventListener('click', () => this.toggleHoldTimer());
    }

    const holdResetBtn = document.getElementById('holdResetBtn');
    if (holdResetBtn) {
      holdResetBtn.addEventListener('click', () => this.resetHoldTimer());
    }
  }

  public renderStepper(): void {
    if (!this.stepperContainer) return;
    this.stepperContainer.innerHTML = '';

    this.steps.forEach((step, idx) => {
      const stepEl = document.createElement('button');
      stepEl.type = 'button';
      const isActive = idx === this.currentStepIndex;
      const isCompleted = this.completedSteps.has(idx);

      stepEl.className = `stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
      stepEl.setAttribute('title', `${idx + 1}. ${step.label} — ${step.desc}`);
      stepEl.setAttribute('aria-label', `${step.label}: ${step.desc}`);
      stepEl.innerHTML = `
        <span class="step-num">${isCompleted ? '✓' : idx + 1}</span>
      `;

      stepEl.addEventListener('click', () => {
        this.setStepByIndex(idx);
      });

      this.stepperContainer.appendChild(stepEl);

      if (idx < this.steps.length - 1) {
        const connector = document.createElement('div');
        connector.className = `step-connector ${isCompleted ? 'completed' : ''}`;
        this.stepperContainer.appendChild(connector);
      }
    });
  }

  public openQaModal(): void {
    if (this.qaModal) {
      this.renderQaList();
      this.qaModal.classList.add('active');
    }
  }

  public closeQaModal(): void {
    if (this.qaModal) {
      this.qaModal.classList.remove('active');
    }
  }

  private renderQaList(): void {
    const listContainer = document.getElementById('qaListContainer');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    let checkedCount = 0;

    this.qaItems.forEach((item) => {
      if (item.checked) checkedCount++;

      const row = document.createElement('label');
      row.className = `qa-item-row ${item.checked ? 'checked' : ''}`;
      row.innerHTML = `
        <input type="checkbox" ${item.checked ? 'checked' : ''} />
        <span class="qa-item-text">${item.text}</span>
      `;

      const input = row.querySelector('input') as HTMLInputElement;
      input.addEventListener('change', () => {
        item.checked = input.checked;
        this.renderQaList();
      });

      listContainer.appendChild(row);
    });

    const total = this.qaItems.length;
    const pct = Math.round((checkedCount / total) * 100);

    if (this.qaProgressFill) this.qaProgressFill.style.width = `${pct}%`;
    if (this.qaProgressText) this.qaProgressText.textContent = `${checkedCount}/${total}`;

    const badge = document.getElementById('qaBadgeCount');
    if (badge) badge.textContent = `${checkedCount}/8`;
  }

  // Hold Timer logic (soft 10-minute hold reminder)
  public toggleHoldTimer(): void {
    if (this.holdRunning) {
      this.pauseHoldTimer();
    } else {
      this.startHoldTimer();
    }
  }

  public startHoldTimer(): void {
    if (this.holdRunning) return;
    this.holdRunning = true;
    if (this.holdToggleBtn) this.holdToggleBtn.textContent = '⏸ Pause';
    this.holdInterval = setInterval(() => {
      this.holdSeconds++;
      this.updateHoldDisplay();
    }, 1000);
  }

  public pauseHoldTimer(): void {
    this.holdRunning = false;
    if (this.holdInterval) clearInterval(this.holdInterval);
    if (this.holdToggleBtn) this.holdToggleBtn.textContent = '▶ Resume';
  }

  public resetHoldTimer(): void {
    this.pauseHoldTimer();
    this.holdSeconds = 0;
    if (this.holdToggleBtn) this.holdToggleBtn.textContent = '▶ Hold';
    this.updateHoldDisplay();
  }

  private updateHoldDisplay(): void {
    if (!this.holdTimerDisplay) return;
    const mins = Math.floor(this.holdSeconds / 60);
    const secs = this.holdSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.holdTimerDisplay.textContent = formatted;

    // Highlight amber/red if over 10 minutes (soft limit)
    const holdChip = document.getElementById('holdTimerChip');
    if (holdChip) {
      if (this.holdSeconds >= 600) {
        holdChip.classList.add('warn-overtime');
      } else {
        holdChip.classList.remove('warn-overtime');
      }
    }
  }
}
