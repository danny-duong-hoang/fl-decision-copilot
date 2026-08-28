import { SnippetEngine } from './snippetEngine';
import { CepStepDef, QAItem } from './types';

export class CepStepper {
  private snippetEngine: SnippetEngine;
  private steps: CepStepDef[] = [
    { id: 'opening', num: 1, label: 'Opening' },
    { id: 'acknowledgement', num: 2, label: 'Acknowledgement' },
    { id: 'commitment', num: 3, label: 'Commitment' },
    { id: 'probing', num: 4, label: 'Probing' },
    { id: 'solution', num: 5, label: 'Solution' },
    { id: 'agreement', num: 6, label: 'Agreement' },
    { id: 'summary', num: 7, label: 'Summary' },
    { id: 'closing', num: 8, label: 'Closing' }
  ];
  private currentStepIndex: number = 0;
  private completedSteps: Set<number> = new Set();

  private container!: HTMLElement;
  private qaModal!: HTMLElement;
  private qaOpenBtn!: HTMLButtonElement;
  private qaCloseBtn!: HTMLButtonElement;
  private qaDoneBtn!: HTMLButtonElement;
  private qaResetBtn!: HTMLButtonElement;
  private qaListContainer!: HTMLElement;
  private qaProgressFill!: HTMLElement;
  private qaProgressText!: HTMLElement;

  private qaItems: QAItem[] = [
    { id: 'qa_open', text: '1. Opening: Used proper branded greeting & agent name' },
    { id: 'qa_ack', text: '2. Acknowledgement: Paraphrased customer’s request accurately' },
    { id: 'qa_comm', text: '3. Commitment: Expressed strong ownership without weak language' },
    { id: 'qa_probe', text: '4. Probing: Verified order number, passenger name & flight conditions' },
    { id: 'qa_sol', text: '5. Solution: Checked airline rules/GDS and quoted exact options & fees' },
    { id: 'qa_agree', text: '6. Agreement: Secured explicit customer approval before clicking Modify' },
    { id: 'qa_sum', text: '7. Summary: Provided complete recap (Request, Action, Ref #, Next Step)' },
    { id: 'qa_close', text: '8. Closing: Offered further assistance and closed with courtesy' }
  ];

  private qaChecked: Set<string> = new Set();

  constructor(snippetEngine: SnippetEngine) {
    this.snippetEngine = snippetEngine;

    this.container = document.getElementById('stepperContainer') as HTMLElement;
    this.qaModal = document.getElementById('qaModal') as HTMLElement;
    this.qaOpenBtn = document.getElementById('openQaModalBtn') as HTMLButtonElement;
    this.qaCloseBtn = document.getElementById('qaModalClose') as HTMLButtonElement;
    this.qaDoneBtn = document.getElementById('qaDoneBtn') as HTMLButtonElement;
    this.qaResetBtn = document.getElementById('qaResetBtn') as HTMLButtonElement;
    this.qaListContainer = document.getElementById('qaListContainer') as HTMLElement;
    this.qaProgressFill = document.getElementById('qaProgressFill') as HTMLElement;
    this.qaProgressText = document.getElementById('qaProgressText') as HTMLElement;

    this.bindEvents();
  }

  public init(): void {
    this.renderStepper();
    this.renderQaList();
  }

  private bindEvents(): void {
    if (this.qaOpenBtn) {
      this.qaOpenBtn.addEventListener('click', () => this.openQaModal());
    }
    if (this.qaCloseBtn) {
      this.qaCloseBtn.addEventListener('click', () => this.closeQaModal());
    }
    if (this.qaDoneBtn) {
      this.qaDoneBtn.addEventListener('click', () => this.closeQaModal());
    }
    if (this.qaResetBtn) {
      this.qaResetBtn.addEventListener('click', () => {
        this.qaChecked.clear();
        this.renderQaList();
      });
    }
  }

  private renderStepper(): void {
    if (!this.container) return;

    let html = '';
    this.steps.forEach((step, idx) => {
      const isActive = idx === this.currentStepIndex;
      const isCompleted = this.completedSteps.has(idx);

      html += `
        <div class="stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-index="${idx}" data-id="${step.id}">
          <span class="step-num">${isCompleted ? '✓' : step.num}</span>
          <span class="step-label">${step.label}</span>
        </div>
      `;

      if (idx < this.steps.length - 1) {
        html += `<div class="step-connector ${isCompleted ? 'completed' : ''}"></div>`;
      }
    });

    this.container.innerHTML = html;

    this.container.querySelectorAll('.stepper-step').forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt((el as HTMLElement).dataset.index || '0', 10);
        this.goToStep(index);
      });
    });
  }

  public goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;

    for (let i = 0; i < index; i++) {
      this.completedSteps.add(i);
    }

    this.currentStepIndex = index;
    this.renderStepper();

    const activeStep = this.steps[index];
    if (this.snippetEngine) {
      this.snippetEngine.filterByCepStep(activeStep.id);
    }
  }

  public openQaModal(): void {
    if (this.qaModal) {
      this.qaModal.classList.add('active');
      this.renderQaList();
    }
  }

  public closeQaModal(): void {
    if (this.qaModal) {
      this.qaModal.classList.remove('active');
    }
  }

  private renderQaList(): void {
    if (!this.qaListContainer) return;

    this.qaListContainer.innerHTML = this.qaItems.map(item => {
      const isChecked = this.qaChecked.has(item.id);
      return `
        <label class="qa-item">
          <input type="checkbox" data-qa-id="${item.id}" ${isChecked ? 'checked' : ''} />
          <span class="qa-item-text">${item.text}</span>
        </label>
      `;
    }).join('');

    this.qaListContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.dataset.qaId || '';
        if (target.checked) {
          this.qaChecked.add(id);
        } else {
          this.qaChecked.delete(id);
        }
        this.updateQaProgress();
      });
    });

    this.updateQaProgress();
  }

  private updateQaProgress(): void {
    const total = this.qaItems.length;
    const count = this.qaChecked.size;
    const pct = Math.round((count / total) * 100);

    if (this.qaProgressFill) {
      this.qaProgressFill.style.width = `${pct}%`;
    }
    if (this.qaProgressText) {
      this.qaProgressText.textContent = `${count}/${total} Checked (${pct}%)`;
    }
  }
}
