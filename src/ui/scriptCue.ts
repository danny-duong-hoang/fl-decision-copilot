import Fuse from 'fuse.js';
import { DataStore } from '../data/defaultData';
import { Snippet } from '../types';

export class ScriptCueEngine {
  private dataStore: DataStore;
  private onSpeakCallback?: (text: string, title: string) => void;
  private activeCategory: string = 'all';
  private currentQuery: string = '';
  private selectedIndex: number = 0;
  private filteredSnippets: Snippet[] = [];
  private activeCueSnippet: Snippet | null = null;
  private fuseInstance: Fuse<Snippet> | null = null;

  private searchInput!: HTMLInputElement;
  private suggestionsContainer!: HTMLElement;
  private filterChipsContainer!: HTMLElement;
  private activeCueContainer!: HTMLElement;

  constructor(dataStore: DataStore, onSpeak?: (text: string, title: string) => void) {
    this.dataStore = dataStore;
    this.onSpeakCallback = onSpeak;

    this.searchInput = document.getElementById('scriptCueSearchInput') as HTMLInputElement;
    this.suggestionsContainer = document.getElementById('scriptCueSuggestions') as HTMLElement;
    this.filterChipsContainer = document.getElementById('scriptCueFilterChips') as HTMLElement;
    this.activeCueContainer = document.getElementById('scriptCueActiveDisplay') as HTMLElement;

    this.initFuse();
  }

  public init(): void {
    this.renderCategoryChips();
    this.bindEvents();
    // Default to the first voice snippet
    const voiceSnips = this.getVoiceSnippets();
    if (voiceSnips.length > 0) {
      this.setActiveCue(voiceSnips[0]);
    }
    this.search('');
  }

  public getVoiceSnippets(): Snippet[] {
    // Only snippets that have 'voice' in their channel list
    return this.dataStore.getSnippets().filter(s => s.channel && s.channel.includes('voice'));
  }

  public initFuse(): void {
    const voiceSnippets = this.getVoiceSnippets();
    this.fuseInstance = new Fuse(voiceSnippets, {
      keys: [
        { name: 'triggers', weight: 0.5 },
        { name: 'title', weight: 0.3 },
        { name: 'text', weight: 0.2 }
      ],
      threshold: 0.4,
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
  }

  public focus(): void {
    if (this.searchInput) {
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  public search(query: string): void {
    const cleanQuery = query.trim().toLowerCase();
    const voiceSnippets = this.getVoiceSnippets();

    let results: Snippet[] = [];

    if (!cleanQuery) {
      results = this.activeCategory === 'all'
        ? voiceSnippets
        : voiceSnippets.filter(s => s.cep_step === this.activeCategory);
    } else {
      if (this.fuseInstance) {
        const fuseRes = this.fuseInstance.search(cleanQuery);
        results = fuseRes.map(r => r.item);
      } else {
        results = voiceSnippets.filter(s =>
          s.title.toLowerCase().includes(cleanQuery) ||
          s.triggers.some(t => t.toLowerCase().includes(cleanQuery)) ||
          s.text.toLowerCase().includes(cleanQuery)
        );
      }

      if (this.activeCategory !== 'all') {
        results = results.filter(s => s.cep_step === this.activeCategory);
      }
    }

    // Limit suggestions popup to top 5
    this.filteredSnippets = results.slice(0, 5);
    this.renderSuggestions();
  }

  public filterByCepStep(stepId: string): void {
    this.activeCategory = stepId;
    this.renderCategoryChips();
    if (this.searchInput) this.searchInput.value = '';
    this.search('');
    if (this.filteredSnippets.length > 0) {
      this.setActiveCue(this.filteredSnippets[0]);
    }
  }

  private renderCategoryChips(): void {
    if (!this.filterChipsContainer) return;
    const categories = [
      { id: 'all', label: 'All Cues' },
      { id: 'opening', label: '1 Open' },
      { id: 'acknowledgement', label: '2 Ack' },
      { id: 'commitment', label: '3 Commit' },
      { id: 'probing', label: '4 Probe' },
      { id: 'solution', label: '5 Solution' },
      { id: 'agreement', label: '6 Agree' },
      { id: 'summary', label: '7 Summary' },
      { id: 'closing', label: '8 Close' }
    ];

    this.filterChipsContainer.innerHTML = '';
    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `filter-tab ${this.activeCategory === cat.id ? 'active' : ''}`;
      chip.textContent = cat.label;
      chip.addEventListener('click', () => {
        this.activeCategory = cat.id;
        this.renderCategoryChips();
        this.search(this.searchInput?.value || '');
      });
      this.filterChipsContainer.appendChild(chip);
    });
  }

  private renderSuggestions(): void {
    if (!this.suggestionsContainer) return;

    if (this.filteredSnippets.length === 0) {
      this.suggestionsContainer.innerHTML = `
        <div class="empty-suggestions">
          <span>No voice cues found for "${this.escapeHtml(this.currentQuery)}". Try @ack, @hold, @rebook...</span>
        </div>
      `;
      return;
    }

    this.suggestionsContainer.innerHTML = '';
    this.filteredSnippets.forEach((snip, idx) => {
      const item = document.createElement('div');
      item.className = `snippet-item ${idx === this.selectedIndex ? 'selected' : ''}`;
      item.setAttribute('data-id', snip.id);

      const triggerTag = snip.triggers[0] || snip.id;

      item.innerHTML = `
        <div class="snippet-item-header">
          <span class="snippet-trigger-badge">${triggerTag}</span>
          <span class="snippet-title">${this.escapeHtml(snip.title)}</span>
          <span class="snippet-cep-step">${snip.cep_step}</span>
        </div>
        <div class="snippet-preview-text">${this.escapeHtml(snip.text.substring(0, 110))}...</div>
      `;

      item.addEventListener('click', () => {
        this.selectedIndex = idx;
        this.setActiveCue(snip);
        this.renderSuggestions();
      });

      this.suggestionsContainer.appendChild(item);
    });
  }

  public setActiveCue(snip: Snippet): void {
    this.activeCueSnippet = snip;
    this.renderActiveCueDisplay();
  }

  public selectSnippetById(id: string): void {
    const snip = this.dataStore.getSnippetById(id);
    if (snip) {
      this.setActiveCue(snip);
    }
  }

  public refresh(): void {
    this.renderActiveCueDisplay();
  }

  private renderActiveCueDisplay(): void {
    if (!this.activeCueContainer) return;

    if (!this.activeCueSnippet) {
      this.activeCueContainer.innerHTML = `
        <div class="empty-cue-display">
          <span>Select or search a script cue above to display large speakable text.</span>
        </div>
      `;
      return;
    }

    const snip = this.activeCueSnippet;
    const interpolatedText = this.interpolateText(snip.text);

    this.activeCueContainer.innerHTML = `
      <div class="speak-cue-card">
        <div class="speak-cue-meta">
          <div class="cue-tags">
            <span class="cue-cep-badge">${snip.cep_step.toUpperCase()}</span>
            <span class="cue-trigger-label">${snip.triggers.join(' · ')}</span>
          </div>
          <span class="cue-verified-date">Verified: ${snip.last_verified}</span>
        </div>
        <h3 class="speak-cue-title">${this.escapeHtml(snip.title)}</h3>
        
        <div class="speak-text-box">
          <div class="speak-prompt-label">🎙️ SPEAK TO CUSTOMER:</div>
          <div class="speak-cue-text">${this.formatHighlightedText(interpolatedText)}</div>
        </div>

        <div class="speak-cue-actions">
          <button type="button" class="btn btn-success btn-speak" id="btnMarkSpoken">
            <span>🗣️ Spoken / Log</span>
          </button>
          <button type="button" class="btn btn-secondary btn-copy" id="btnCopySpeakCue">
            <span>📋 Copy Text</span>
          </button>
        </div>
      </div>
    `;

    const spokenBtn = this.activeCueContainer.querySelector('#btnMarkSpoken');
    const copyBtn = this.activeCueContainer.querySelector('#btnCopySpeakCue');

    if (spokenBtn) {
      spokenBtn.addEventListener('click', () => {
        spokenBtn.classList.add('spoken-active');
        spokenBtn.innerHTML = `<span>✓ Logged Spoken</span>`;
        setTimeout(() => {
          spokenBtn.classList.remove('spoken-active');
          spokenBtn.innerHTML = `<span>🗣️ Spoken / Log</span>`;
        }, 1500);

        if (this.onSpeakCallback) {
          this.onSpeakCallback(interpolatedText, snip.title);
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(interpolatedText);
        copyBtn.innerHTML = `<span>✓ Copied</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<span>📋 Copy Text</span>`;
        }, 1500);
        if (this.onSpeakCallback) {
          this.onSpeakCallback(interpolatedText, snip.title);
        }
      });
    }
  }

  private interpolateText(template: string): string {
    const ctx = (window as any).ctxData || {};
    const replacements: Record<string, string> = {
      cust_name: ctx.lastName ? `Mr./Ms. ${ctx.lastName}` : 'Customer',
      agent_name: 'Danny',
      order_num: ctx.pnr || 'your booking',
      request: ctx.requestName || 'your flight change',
      solution: ctx.solutionName || 'rebooking the return flight to your preferred date',
      pax_count: ctx.pax || '2',
      date: ctx.newDate || 'next week',
      amount: ctx.quoteAmount || '185.00',
      currency: ctx.currency || 'EUR',
      fee_amount: '40.00',
      brand: ctx.brand === 'BCOM' ? 'Booking.com' : 'Gotogate',
      next_action: 'our ticketing department will complete the reissue'
    };

    let res = template;
    for (const [k, v] of Object.entries(replacements)) {
      const reg = new RegExp(`\\{${k}\\}`, 'g');
      res = res.replace(reg, v);
    }
    return res;
  }

  private formatHighlightedText(text: string): string {
    // Escape HTML first
    let escaped = this.escapeHtml(text);
    // Highlight currency/amounts and key dates
    escaped = escaped.replace(/(EUR \d+(\.\d{2})?|\d+ minutes|48 hours|\bSP\d+)/g, '<span class="speak-highlight">$1</span>');
    return escaped;
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.filteredSnippets.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredSnippets.length;
      this.renderSuggestions();
      this.setActiveCue(this.filteredSnippets[this.selectedIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.filteredSnippets.length) % this.filteredSnippets.length;
      this.renderSuggestions();
      this.setActiveCue(this.filteredSnippets[this.selectedIndex]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = this.filteredSnippets[this.selectedIndex];
      if (selected) {
        this.setActiveCue(selected);
      }
    } else if (e.key === 'Escape') {
      if (this.searchInput) this.searchInput.blur();
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
