import { DataStore } from './data/defaultData';
import { SnippetEngine } from './snippetEngine';
import { DecisionPath, MatrixField } from './types';

export class DecisionMatrix {
  private dataStore: DataStore;
  private snippetEngine: SnippetEngine;
  private selectedValues: Record<string, string> = {};
  private currentMatchedPath: DecisionPath | null = null;

  private container!: HTMLElement;
  private statusContainer!: HTMLElement;
  private actionCardContainer!: HTMLElement;
  private resetBtn!: HTMLButtonElement;

  constructor(dataStore: DataStore, snippetEngine: SnippetEngine) {
    this.dataStore = dataStore;
    this.snippetEngine = snippetEngine;

    this.container = document.getElementById('matrixFormContainer') as HTMLElement;
    this.statusContainer = document.getElementById('matrixStatusContainer') as HTMLElement;
    this.actionCardContainer = document.getElementById('actionCardContainer') as HTMLElement;
    this.resetBtn = document.getElementById('resetMatrixBtn') as HTMLButtonElement;

    this.bindEvents();
  }

  public init(): void {
    this.reset();
  }

  private bindEvents(): void {
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.reset());
    }
  }

  public reset(): void {
    this.selectedValues = {};
    this.currentMatchedPath = null;
    this.renderForm();
    this.renderActionCard(null);
  }

  public focus(): void {
    const firstSelect = this.container ? this.container.querySelector('select') : null;
    if (firstSelect) {
      firstSelect.focus();
    }
  }

  private getSchema(): MatrixField[] {
    const request = this.selectedValues['request'];

    const fields: MatrixField[] = [
      {
        id: 'request',
        label: '1. Customer Request',
        options: [
          { value: '', label: '-- Select customer request --' },
          { value: 'Cancel', label: 'Cancel flight / booking' },
          { value: 'Rebook', label: 'Rebook / Change trip' },
          { value: 'Add Baggage/Seat', label: 'Add Ancillary (Baggage / Seat)' },
          { value: 'Name Change', label: 'Name Correction / Change' },
          { value: 'Refund status only', label: 'Refund status inquiry only' }
        ]
      }
    ];

    if (request === 'Cancel') {
      fields.push({
        id: 'ticket_state',
        label: '2. Ticket / Order State',
        options: [
          { value: '', label: '-- Select ticket state --' },
          { value: 'Just booked (within void window)', label: 'Just booked (within void window)' },
          { value: 'Fully unused issued', label: 'Fully unused issued' },
          { value: 'Partial used', label: 'Partial used' },
          { value: 'Already in refund flow', label: 'Already in refund flow' }
        ]
      });

      fields.push({
        id: 'disruption',
        label: '3. Disruption Flag',
        options: [
          { value: 'None', label: 'None (Voluntary request)' },
          { value: 'Force Majeure / Schedule Change', label: 'Force Majeure / Schedule Change (Involuntary)' }
        ]
      });

      if (this.selectedValues['disruption'] !== 'Force Majeure / Schedule Change' &&
          this.selectedValues['ticket_state'] !== 'Just booked (within void window)') {

        fields.push({
          id: 'system',
          label: '4. Booking System',
          options: [
            { value: 'Amadeus', label: 'Amadeus / GDS standard' },
            { value: 'LCC', label: 'LCC (Low Cost Carrier)' },
            { value: 'External portal (AC...)', label: 'External portal (AC, etc.)' }
          ]
        });

        if (this.selectedValues['system'] === 'LCC') {
          fields.push({
            id: 'time',
            label: '5. Time Condition',
            options: [
              { value: '', label: '-- Select time window --' },
              { value: 'Same calendar day', label: 'Same calendar day (LCC Void)' },
              { value: 'After booking day', label: 'After booking day (Standard LCC CXL)' }
            ]
          });
        }

        fields.push({
          id: 'cxl_product',
          label: '6. CXL Product on Order',
          options: [
            { value: 'None', label: 'None / Standard' },
            { value: 'CXL Protection / CFAR', label: 'Cancellation Protection / CFAR' }
          ]
        });

        if (this.selectedValues['cxl_product'] !== 'CXL Protection / CFAR') {
          fields.push({
            id: 'fare_outcome',
            label: '7. Fare Outcome Direction',
            options: [
              { value: '', label: '-- Select fare rule outcome --' },
              { value: 'Refundable w/ airline fee', label: 'Refundable with airline penalty' },
              { value: 'Tax only', label: 'Non-refundable (Tax-only recovery)' }
            ]
          });
        }
      }
    } else if (request === 'Add Baggage/Seat') {
      fields.push({
        id: 'time',
        label: '2. Time to Departure',
        options: [
          { value: '', label: '-- Select departure timing --' },
          { value: '< 48h before departure', label: '< 48h before departure (Restricted)' },
          { value: '>= 48h before departure', label: '>= 48h before departure (Allowed via portal)' }
        ]
      });
    } else if (request === 'Name Change') {
      fields.push({
        id: 'name_type',
        label: '2. Correction Type',
        options: [
          { value: '', label: '-- Select correction type --' },
          { value: '<=3 chars or marriage (NACO)', label: '<=3 chars typo or marriage legal change (NACO)' },
          { value: '>3 chars / Full passenger transfer (NACH)', label: '>3 chars / Transfer to another person (NACH)' }
        ]
      });
    } else if (request === 'Rebook') {
      fields.push({
        id: 'disruption',
        label: '2. Disruption Flag',
        options: [
          { value: 'None', label: 'None (Voluntary rebooking)' },
          { value: 'Force Majeure / Schedule Change', label: 'Force Majeure / Schedule Change' }
        ]
      });

      if (this.selectedValues['disruption'] !== 'Force Majeure / Schedule Change') {
        fields.push({
          id: 'system',
          label: '3. Booking System',
          options: [
            { value: '', label: '-- Select booking system --' },
            { value: 'Amadeus', label: 'Amadeus' },
            { value: 'Sabre', label: 'Sabre' },
            { value: 'LCC', label: 'LCC' }
          ]
        });

        fields.push({
          id: 'ticket_state',
          label: '4. Ticket State',
          options: [
            { value: '', label: '-- Select ticket state --' },
            { value: 'Unused', label: 'Fully Unused (Open status)' },
            { value: 'Partial used', label: 'Partially used' }
          ]
        });
      }
    } else if (request === 'Refund status only') {
      fields.push({
        id: 'ticket_state',
        label: '2. Ticket State',
        options: [
          { value: 'Already in refund flow', label: 'Already in refund / payout flow' }
        ]
      });
    }

    return fields;
  }

  private renderForm(): void {
    if (!this.container) return;

    const fields = this.getSchema();
    let html = '';

    fields.forEach((field, idx) => {
      const currentVal = this.selectedValues[field.id] || '';
      const optionsHtml = field.options.map(opt => `
        <option value="${this.escapeHtml(opt.value)}" ${opt.value === currentVal ? 'selected' : ''}>
          ${this.escapeHtml(opt.label)}
        </option>
      `).join('');

      html += `
        <div class="matrix-step-group">
          <label class="field-label" for="matrix_${field.id}">
            <span>${field.label}</span>
            <span class="step-counter">${idx + 1}/${fields.length}</span>
          </label>
          <div class="custom-select-wrapper">
            <select id="matrix_${field.id}" data-field="${field.id}">
              ${optionsHtml}
            </select>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;

    this.container.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const fieldId = target.dataset.field || '';
        const val = target.value;
        this.handleFieldChange(fieldId, val);
      });
    });

    this.evaluatePath();
  }

  private handleFieldChange(fieldId: string, val: string): void {
    this.selectedValues[fieldId] = val;

    const fields = this.getSchema();
    const changedIdx = fields.findIndex(f => f.id === fieldId);
    if (changedIdx !== -1) {
      for (let i = changedIdx + 1; i < fields.length; i++) {
        delete this.selectedValues[fields[i].id];
      }
    }

    this.renderForm();
  }

  private evaluatePath(): void {
    const paths = this.dataStore.getPaths();
    let bestMatch: DecisionPath | null = null;
    let maxMatchedCount = 0;

    for (const path of paths) {
      if (!path.when || path.when.length === 0) continue;

      let allConditionsMet = true;
      const conditionsCount = path.when.length;

      for (const cond of path.when) {
        const parts = cond.split('=').map(s => s.trim());
        if (parts.length !== 2) continue;

        const key = parts[0].toLowerCase();
        const targetVal = parts[1].toLowerCase();

        let actualVal = '';
        if (key.includes('request')) actualVal = this.selectedValues['request'] || '';
        else if (key.includes('ticket state')) actualVal = this.selectedValues['ticket_state'] || '';
        else if (key.includes('time')) actualVal = this.selectedValues['time'] || '';
        else if (key.includes('disruption')) actualVal = this.selectedValues['disruption'] || '';
        else if (key.includes('system')) actualVal = this.selectedValues['system'] || '';
        else if (key.includes('type')) actualVal = this.selectedValues['name_type'] || '';
        else if (key.includes('cxl product')) actualVal = this.selectedValues['cxl_product'] || '';
        else if (key.includes('fare outcome')) actualVal = this.selectedValues['fare_outcome'] || '';

        if (!actualVal || (!actualVal.toLowerCase().includes(targetVal) && !targetVal.includes(actualVal.toLowerCase()))) {
          allConditionsMet = false;
          break;
        }
      }

      if (allConditionsMet && conditionsCount > maxMatchedCount) {
        bestMatch = path;
        maxMatchedCount = conditionsCount;
      }
    }

    this.currentMatchedPath = bestMatch;
    this.renderActionCard(bestMatch);
    this.updateStatusIndicator(bestMatch);
  }

  private updateStatusIndicator(matchedPath: DecisionPath | null): void {
    if (!this.statusContainer) return;

    if (matchedPath) {
      this.statusContainer.innerHTML = `
        <span style="color: var(--accent-emerald); font-weight: 600;">✓ Path Identified: <strong>${this.escapeHtml(matchedPath.title || matchedPath.id)}</strong></span>
        <span class="kbd-badge">Match Ready</span>
      `;
    } else if (this.selectedValues['request']) {
      this.statusContainer.innerHTML = `
        <span>Select remaining fields to identify SOP path...</span>
        <span class="kbd-badge">In Progress</span>
      `;
    } else {
      this.statusContainer.innerHTML = `
        <span>Start by selecting Customer Request</span>
        <span class="kbd-badge">Ready</span>
      `;
    }
  }

  private renderActionCard(path: DecisionPath | null): void {
    if (!this.actionCardContainer) return;

    if (!path) {
      this.actionCardContainer.innerHTML = `
        <div class="action-card-empty">
          <div class="empty-icon">🧭</div>
          <h3>No Path Selected</h3>
          <p>Progressively select options in the Decision Matrix to load the First Line Action Card, approved scripts, and critical SOP boundaries.</p>
        </div>
      `;
      return;
    }

    const shelfAlert = path.needs_shelf_check ? `
      <span class="badge-shelf-alert">
        <span>⚠️</span> Needs Shelf / OPS Blog Check
      </span>
    ` : '';

    const verifiedBadge = path.last_verified ? `
      <span class="badge-verified">✓ Verified: ${this.escapeHtml(path.last_verified)}</span>
    ` : '';

    const criteriaPills = (path.when || []).map(w => `<span class="criteria-pill">${this.escapeHtml(w)}</span>`).join('');

    const stepsHtml = (path.fl_steps || []).map((step, idx) => `
      <li class="fl-step-item">
        <span class="step-check-icon">${idx + 1}</span>
        <span>${this.escapeHtml(step)}</span>
      </li>
    `).join('');

    const allSnippets = this.dataStore.getSnippets();
    const matchedSnippets = (path.snippets || []).map(sId => allSnippets.find(s => s.id === sId)).filter(Boolean);

    const saySnippetsHtml = matchedSnippets.length > 0 ? matchedSnippets.map(snip => `
      <div class="say-snippet-card" data-snippet-id="${snip!.id}">
        <div class="say-snippet-header">
          <span class="say-snippet-title">${this.escapeHtml(snip!.title)}</span>
          <span class="kbd-badge">Click to Copy / Fill</span>
        </div>
        <div class="say-snippet-text">${this.escapeHtml(snip!.text)}</div>
      </div>
    `).join('') : `
      <div style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">
        No specific path snippets. Use global CEP scripts from the left panel.
      </div>
    `;

    const alternativesHtml = (path.alternatives && path.alternatives.length > 0) ? `
      <div class="card-section">
        <div class="section-label" style="color: var(--accent-emerald);">
          <span>💡 Valid Alternatives to Offer</span>
        </div>
        <div class="alternatives-box">
          <ul class="alternatives-list">
            ${path.alternatives.map(alt => `<li><span>✓</span> ${this.escapeHtml(alt)}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : '';

    const forbiddenHtml = (path.forbidden && path.forbidden.length > 0) ? `
      <div class="card-section">
        <div class="section-label" style="color: var(--accent-rose);">
          <span>⛔ CRITICAL DO NOT (STOP)</span>
        </div>
        <div class="forbidden-box">
          <ul class="forbidden-list">
            ${path.forbidden.map(f => `<li><span class="stop-icon">✕</span> ${this.escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : '';

    const handoffHtml = `
      <div class="card-section">
        <div class="section-label">
          <span>📤 Handoff Queue & Routing</span>
        </div>
        <div class="handoff-box">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 2px;">Target Queue:</div>
            <div class="handoff-queue">${this.escapeHtml(path.handoff || 'None')}</div>
          </div>
          <button class="btn btn-sm" id="copyZendeskNoteBtn">
            <span>📋 Copy Errand Note</span>
          </button>
        </div>
      </div>
    `;

    this.actionCardContainer.innerHTML = `
      <div class="action-card-content">
        <div class="action-card-header">
          <div class="path-badge-container">
            <span class="path-id-badge">PATH: ${this.escapeHtml(path.id)}</span>
            ${shelfAlert}
            ${verifiedBadge}
          </div>
          <h2 class="path-title">${this.escapeHtml(path.title || path.id)}</h2>
          <div class="path-criteria-pills">${criteriaPills}</div>
        </div>

        <div class="card-section">
          <div class="section-label">
            <span>📋 FL Do Now (SOP Authority Steps)</span>
          </div>
          <ul class="fl-steps-list">${stepsHtml}</ul>
        </div>

        <div class="card-section">
          <div class="section-label" style="color: var(--accent-cyan);">
            <span>💬 Say / Paste to Customer (Chat Script)</span>
          </div>
          <div class="say-paste-grid">${saySnippetsHtml}</div>
        </div>

        ${alternativesHtml}
        ${forbiddenHtml}
        ${handoffHtml}

        <div class="source-meta-bar">
          <div><strong>Source of Truth:</strong> ${this.escapeHtml(path.source || 'Shelf Knowledge Base')}</div>
          <div><em>Rule Pack V1 (Offline / In-Memory)</em></div>
        </div>
      </div>
    `;

    this.actionCardContainer.querySelectorAll('.say-snippet-card').forEach(card => {
      card.addEventListener('click', () => {
        const sId = (card as HTMLElement).dataset.snippetId;
        const snippet = allSnippets.find(s => s.id === sId);
        if (snippet && this.snippetEngine) {
          this.snippetEngine.selectSnippet(snippet);
        }
      });
    });

    const zdBtn = document.getElementById('copyZendeskNoteBtn');
    if (zdBtn) {
      zdBtn.addEventListener('click', () => {
        const zdNote = `[FL COPILOT HANDOFF]\nPath: ${path.id} (${path.title || ''})\nTarget Queue: ${path.handoff}\nCriteria: ${(path.when || []).join(' | ')}\nActions Done: ${(path.fl_steps || []).join(' -> ')}\nVerification: ${path.source} (${path.last_verified})`;
        if (this.snippetEngine) {
          this.snippetEngine.copyToClipboard(zdNote, 'Zendesk Errand Note');
        }
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
