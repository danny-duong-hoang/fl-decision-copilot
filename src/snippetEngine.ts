import Fuse from 'fuse.js';
import { DataStore } from './data/defaultData';
import { Snippet } from './types';

export class SnippetEngine {
  private dataStore: DataStore;
  private onCopyCallback: (text: string, title: string) => void;
  private activeFilter: string = 'all';
  private currentQuery: string = '';
  private selectedIndex: number = 0;
  private filteredSnippets: Snippet[] = [];
  private activeModalSnippet: Snippet | null = null;
  private fuseInstance: Fuse<Snippet> | null = null;

  private searchInput!: HTMLInputElement;
  private suggestionsContainer!: HTMLElement;
  private filterTabsContainer!: HTMLElement;
  private varModal!: HTMLElement;
  private varModalForm!: HTMLFormElement;
  private varInputsContainer!: HTMLElement;
  private varPreviewText!: HTMLElement;
  private varModalTitle!: HTMLElement;
  private varCancelBtn!: HTMLButtonElement;
  private varModalClose!: HTMLButtonElement;

  constructor(dataStore: DataStore, onCopyCallback: (text: string, title: string) => void) {
    this.dataStore = dataStore;
    this.onCopyCallback = onCopyCallback;

    this.searchInput = document.getElementById('snippetSearchInput') as HTMLInputElement;
    this.suggestionsContainer = document.getElementById('snippetSuggestionsList') as HTMLElement;
    this.filterTabsContainer = document.getElementById('snippetFilterTabs') as HTMLElement;
    this.varModal = document.getElementById('variableModal') as HTMLElement;
    this.varModalForm = document.getElementById('varModalForm') as HTMLFormElement;
    this.varInputsContainer = document.getElementById('varInputsContainer') as HTMLElement;
    this.varPreviewText = document.getElementById('varPreviewText') as HTMLElement;
    this.varModalTitle = document.getElementById('varModalTitle') as HTMLElement;
    this.varCancelBtn = document.getElementById('varCancelBtn') as HTMLButtonElement;
    this.varModalClose = document.getElementById('varModalClose') as HTMLButtonElement;

    this.initFuse();
    this.bindEvents();
  }

  public init(): void {
    this.renderFilterTabs();
    this.search('');
  }

  public initFuse(): void {
    const snippets = this.dataStore.getSnippets();
    this.fuseInstance = new Fuse(snippets, {
      keys: [
        { name: 'triggers', weight: 0.5 },
        { name: 'title', weight: 0.3 },
        { name: 'text', weight: 0.2 }
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 1
    });
  }

  private bindEvents(): void {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.currentQuery = (e.target as HTMLInputElement).value;
        this.selectedIndex = 0;
        this.search(this.currentQuery);
      });

      this.searchInput.addEventListener('keydown', (e) => {
        this.handleKeydown(e);
      });
    }

    if (this.varCancelBtn) {
      this.varCancelBtn.addEventListener('click', () => this.closeVariableModal());
    }
    if (this.varModalClose) {
      this.varModalClose.addEventListener('click', () => this.closeVariableModal());
    }

    if (this.varModalForm) {
      this.varModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleVariableFormSubmit();
      });
    }
  }

  private renderFilterTabs(): void {
    if (!this.filterTabsContainer) return;

    const categories = [
      { id: 'all', label: 'All' },
      { id: 'opening', label: '1. Opening' },
      { id: 'acknowledgement', label: '2. Ack' },
      { id: 'commitment', label: '3. Commit' },
      { id: 'probing', label: '4. Probe' },
      { id: 'solution', label: '5. Solution' },
      { id: 'agreement', label: '6. Agree' },
      { id: 'summary', label: '7. Summary' },
      { id: 'closing', label: '8. Close' },
      { id: 'hold', label: 'Hold' },
      { id: 'idle', label: 'Idle' },
      { id: 'refund_timing', label: 'Timing' }
    ];

    this.filterTabsContainer.innerHTML = categories.map(cat => `
      <button class="filter-tab ${cat.id === this.activeFilter ? 'active' : ''}" data-cat="${cat.id}">
        ${cat.label}
      </button>
    `).join('');

    this.filterTabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = (tab as HTMLElement).dataset.cat || 'all';
        this.activeFilter = cat;
        this.filterTabsContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.selectedIndex = 0;
        this.search(this.currentQuery);
      });
    });
  }

  public filterByCepStep(stepName: string): void {
    this.activeFilter = stepName;
    if (this.filterTabsContainer) {
      this.filterTabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
        if ((tab as HTMLElement).dataset.cat === stepName) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }
    this.selectedIndex = 0;
    this.search(this.currentQuery);
  }

  public search(query: string): void {
    const rawQuery = (query || '').trim();
    const cleanQuery = rawQuery.startsWith('@') ? rawQuery.slice(1).toLowerCase() : rawQuery.toLowerCase();
    const allSnippets = this.dataStore.getSnippets();

    let candidateList: Snippet[] = [];

    if (!rawQuery) {
      candidateList = allSnippets;
    } else {
      const exactTriggerMatches = allSnippets.filter(s =>
        s.triggers.some(t => {
          const tClean = t.toLowerCase().replace(/^@/, '');
          return tClean === cleanQuery || tClean.startsWith(cleanQuery) || cleanQuery.startsWith(tClean);
        })
      );

      const fuseResults = this.fuseInstance ? this.fuseInstance.search(rawQuery).map(r => r.item) : [];

      const map = new Map<string, Snippet>();
      exactTriggerMatches.forEach(s => map.set(s.id, s));
      fuseResults.forEach(s => {
        if (!map.has(s.id)) {
          map.set(s.id, s);
        }
      });

      candidateList = Array.from(map.values());
    }

    if (this.activeFilter !== 'all') {
      this.filteredSnippets = candidateList.filter(s => s.cep_step === this.activeFilter);
    } else {
      this.filteredSnippets = candidateList;
    }

    this.renderSuggestions();
  }

  private renderSuggestions(): void {
    if (!this.suggestionsContainer) return;

    if (this.filteredSnippets.length === 0) {
      this.suggestionsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No snippets matching "<strong>${this.escapeHtml(this.currentQuery)}</strong>"
        </div>
      `;
      return;
    }

    const itemsToRender = this.filteredSnippets.slice(0, 8);

    this.suggestionsContainer.innerHTML = itemsToRender.map((snip, index) => {
      const isSelected = index === this.selectedIndex;
      const triggersHtml = (snip.triggers || []).map(t => `<span class="snippet-tag">${this.escapeHtml(t)}</span>`).join('');
      const varsHtml = (snip.vars || []).map(v => `<span class="var-chip">{${this.escapeHtml(v)}}</span>`).join('');

      return `
        <div class="snippet-card ${isSelected ? 'selected' : ''}" data-index="${index}" data-id="${snip.id}">
          <div class="snippet-card-top">
            <span class="snippet-card-title">${this.escapeHtml(snip.title)}</span>
            <div class="snippet-trigger-tags">${triggersHtml}</div>
          </div>
          <div class="snippet-card-text">${this.highlightVariables(snip.text)}</div>
          ${varsHtml ? `<div class="snippet-card-vars">${varsHtml}</div>` : ''}
        </div>
      `;
    }).join('');

    this.suggestionsContainer.querySelectorAll('.snippet-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt((card as HTMLElement).dataset.index || '0', 10);
        this.selectSnippet(this.filteredSnippets[index]);
      });
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.filteredSnippets.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = Math.min(this.filteredSnippets.length, 8) - 1;
      this.selectedIndex = this.selectedIndex < maxIndex ? this.selectedIndex + 1 : 0;
      this.renderSuggestions();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const maxIndex = Math.min(this.filteredSnippets.length, 8) - 1;
      this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : maxIndex;
      this.renderSuggestions();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.filteredSnippets[this.selectedIndex]) {
        this.selectSnippet(this.filteredSnippets[this.selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      this.searchInput.blur();
    }
  }

  public selectSnippet(snippet: Snippet): void {
    if (!snippet) return;

    if (snippet.vars && snippet.vars.length > 0) {
      this.openVariableModal(snippet);
    } else {
      this.copyToClipboard(snippet.text, snippet.title);
    }
  }

  private openVariableModal(snippet: Snippet): void {
    this.activeModalSnippet = snippet;
    if (!this.varModal) return;

    this.varModalTitle.textContent = `Fill Variables: ${snippet.title}`;

    const c = (window as any).ctxData || {};

    const defaults: Record<string, string> = {
      cust_name: (c.lastName && c.lastName.trim()) ? c.lastName.trim() : 'Customer',
      order_num: (c.pnr && c.pnr.trim()) ? c.pnr.trim() : 'ETG-984210',
      pnr: (c.pnr && c.pnr.trim()) ? c.pnr.trim() : 'ABCDEF',
      airline: (c.airline && c.airline.trim()) ? c.airline.trim() : 'VN',
      pax_count: (c.pax && c.pax.trim() && c.pax !== '[pax]' && c.pax !== '[số khách]') ? c.pax.trim() : '1',
      agent_name: 'Alex',
      currency: 'EUR',
      amount: '50.00',
      penalty: '40.00',
      fee: '30.00',
      refund_amount: '180.00',
      tax_amount: '65.00',
      date: 'tomorrow',
      request: 'flight cancellation',
      action_taken: 'the cancellation request',
      ref_number: 'RF-88231',
      email: 'customer@example.com',
      link: 'https://pay.example.com/checkout/98421',
      expires_min: '30',
      payout_date: '2026-08-20',
      arn_number: '745210984321098'
    };

    this.varInputsContainer.innerHTML = snippet.vars.map(varKey => {
      const val = defaults[varKey] || '';
      return `
        <div class="variable-input-row">
          <label for="var_${varKey}">{${this.escapeHtml(varKey)}}</label>
          <input type="text" id="var_${varKey}" name="${varKey}" value="${this.escapeHtml(val)}" class="var-field" />
        </div>
      `;
    }).join('');

    this.updatePreviewFromInputs();

    this.varInputsContainer.querySelectorAll('.var-field').forEach(input => {
      input.addEventListener('input', () => this.updatePreviewFromInputs());
    });

    this.varModal.classList.add('active');

    const firstInput = this.varInputsContainer.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  }

  private updatePreviewFromInputs(): void {
    if (!this.activeModalSnippet || !this.varPreviewText) return;

    let text = this.activeModalSnippet.text;
    const inputs = this.varInputsContainer.querySelectorAll('.var-field') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => {
      const varName = input.name;
      const val = input.value || `{${varName}}`;
      const regex = new RegExp(`\\{${varName}\\}`, 'g');
      text = text.replace(regex, val);
    });

    this.varPreviewText.textContent = text;
  }

  private handleVariableFormSubmit(): void {
    if (!this.activeModalSnippet) return;

    let text = this.activeModalSnippet.text;
    const inputs = this.varInputsContainer.querySelectorAll('.var-field') as NodeListOf<HTMLInputElement>;
    inputs.forEach(input => {
      const varName = input.name;
      const val = input.value || `{${varName}}`;
      const regex = new RegExp(`\\{${varName}\\}`, 'g');
      text = text.replace(regex, val);
    });

    this.copyToClipboard(text, this.activeModalSnippet.title);
    this.closeVariableModal();
  }

  private closeVariableModal(): void {
    if (this.varModal) {
      this.varModal.classList.remove('active');
    }
    this.activeModalSnippet = null;
  }

  public async copyToClipboard(text: string, title: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    if (this.onCopyCallback) {
      this.onCopyCallback(text, title);
    }
  }

  private highlightVariables(text: string): string {
    if (!text) return '';
    return this.escapeHtml(text).replace(/\{([^}]+)\}/g, '<span class="var-chip" style="display:inline-block; font-size:0.75rem;">{$1}</span>');
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
