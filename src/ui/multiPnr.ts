import { MultiPnrRow } from '../types';

export class MultiPnrTracker {
  private rows: MultiPnrRow[] = [];
  private container!: HTMLElement;
  private onRowChangeCallback?: (rows: MultiPnrRow[]) => void;
  public isCollapsed: boolean = true; // Call Focus mode: collapsed on login

  constructor(onRowChange?: (rows: MultiPnrRow[]) => void) {
    this.onRowChangeCallback = onRowChange;
    this.container = document.getElementById('multiPnrTrackerContainer') as HTMLElement;

    // Seed with Priority Floor Case: 1 original PNR + 1 split PNR
    this.rows = [
      {
        id: 'row_1',
        pnr: 'HT89KL',
        system: 'Amadeus',
        pax_affected: '1 ADT (Nguyen/An)',
        request_type: 'Rebook',
        status: 'Done',
        owner_step: 'Original PNR — remains untouched on original date'
      },
      {
        id: 'row_2',
        pnr: 'SPLIT9',
        system: 'Amadeus',
        pax_affected: '2 ADT (Nguyen/Binh, Nguyen/Chi)',
        request_type: 'Rebook',
        status: 'Quoted',
        owner_step: 'Split PNR (SP1,2) — Manual FQP reprice; ready for Verify Email & MOTO'
      }
    ];
  }

  public init(): void {
    this.render();
    this.updateCollapseState();
    window.addEventListener('fl-split-step-done', () => {
      this.expand();
    });
  }

  public toggle(): void {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  public expand(): void {
    this.isCollapsed = false;
    this.updateCollapseState();
  }

  public collapse(): void {
    this.isCollapsed = true;
    this.updateCollapseState();
  }

  public updateCollapseState(): void {
    const bottomRow = document.querySelector('.grid-bottom-row');
    const panelWrap = document.getElementById('multiPnrPanelWrap');
    const toggleChip = document.getElementById('pnrRunbookHeaderToggle');
    const countBadge = document.getElementById('pnrRunbookCountBadge');

    if (countBadge) {
      countBadge.textContent = `${this.rows.length}`;
    }

    if (this.isCollapsed) {
      bottomRow?.classList.add('focus-mode-active');
      panelWrap?.classList.add('collapsed-panel');
      if (toggleChip) toggleChip.classList.remove('active');
    } else {
      bottomRow?.classList.remove('focus-mode-active');
      panelWrap?.classList.remove('collapsed-panel');
      if (toggleChip) toggleChip.classList.add('active');
    }
  }

  public getRows(): MultiPnrRow[] {
    return this.rows;
  }

  public addRow(): void {
    const newId = `row_${Date.now()}`;
    this.rows.push({
      id: newId,
      pnr: 'NEWPNR',
      system: 'Amadeus',
      pax_affected: '1 ADT',
      request_type: 'Rebook',
      status: 'Pending',
      owner_step: 'New segment opened; awaiting price check'
    });
    this.render();
    if (this.onRowChangeCallback) this.onRowChangeCallback(this.rows);
  }

  public addLccCombo(): void {
    this.rows.push({
      id: `row_lcc_${Date.now()}`,
      pnr: 'VJ789K',
      system: 'LCC',
      pax_affected: 'All ADT',
      request_type: 'Rebook',
      status: 'Pending',
      owner_step: 'LCC booking: handle via LCC guidelines; service fee goes on GDS PNR'
    });
    this.render();
    if (this.onRowChangeCallback) this.onRowChangeCallback(this.rows);
  }

  public deleteRow(id: string): void {
    this.rows = this.rows.filter(r => r.id !== id);
    this.render();
    if (this.onRowChangeCallback) this.onRowChangeCallback(this.rows);
  }

  public updateRow(id: string, updates: Partial<MultiPnrRow>): void {
    const row = this.rows.find(r => r.id === id);
    if (row) {
      Object.assign(row, updates);
      this.render();
      if (this.onRowChangeCallback) this.onRowChangeCallback(this.rows);
    }
  }

  public render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="multi-pnr-panel">
        <div class="multi-pnr-header">
          <div class="multi-pnr-title-group">
            <span class="pnr-icon">📑</span>
            <h3 class="multi-pnr-title">Multi-PNR Tracker</h3>
            <span class="pnr-count-badge">${this.rows.length} PNR(s) active</span>
          </div>

          <div class="multi-pnr-actions">
            <button type="button" class="btn btn-sm btn-secondary" id="btnAddPnrRow">
              <span>➕ Add PNR</span>
            </button>
            <button type="button" class="btn btn-sm" id="btnAddLccCombo" title="Add connecting LCC PNR">
              <span>+ LCC Leg</span>
            </button>
            <button type="button" class="btn btn-sm btn-secondary" id="btnCollapsePnrTracker" title="Collapse to Call Focus Mode">
              <span>✕ Minimize</span>
            </button>
          </div>
        </div>

        <!-- Cross-PNR Rules Reminder -->
        <div class="multi-pnr-rule-reminder">
          <strong>⚠️ CROSS-PNR RULES:</strong> Charge ETG Service fee <em>once per person/order</em> (never per PNR). On mixed LCC+GDS, write service fee on GDS booking. Prefix internal notes with <code>[PNR]</code>.
        </div>

        <!-- Table of PNR rows -->
        <div class="table-responsive">
          <table class="multi-pnr-table">
            <thead>
              <tr>
                <th>PNR</th>
                <th>System</th>
                <th>Pax Affected</th>
                <th>Request</th>
                <th>Status</th>
                <th>Current Owner Step / Remarks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${this.rows.map(r => `
                <tr data-row-id="${r.id}">
                  <td>
                    <input type="text" class="pnr-cell-input pnr-loc" value="${this.escapeHtml(r.pnr)}" maxlength="8" />
                  </td>
                  <td>
                    <select class="pnr-cell-select pnr-system">
                      <option value="Amadeus" ${r.system === 'Amadeus' ? 'selected' : ''}>Amadeus</option>
                      <option value="Sabre" ${r.system === 'Sabre' ? 'selected' : ''}>Sabre</option>
                      <option value="LCC" ${r.system === 'LCC' ? 'selected' : ''}>LCC</option>
                      <option value="Portal" ${r.system === 'Portal' ? 'selected' : ''}>Portal</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" class="pnr-cell-input pnr-pax" value="${this.escapeHtml(r.pax_affected)}" />
                  </td>
                  <td>
                    <select class="pnr-cell-select pnr-req">
                      <option value="Rebook" ${r.request_type === 'Rebook' ? 'selected' : ''}>Rebook</option>
                      <option value="Cancel" ${r.request_type === 'Cancel' ? 'selected' : ''}>Cancel</option>
                      <option value="Seat" ${r.request_type === 'Seat' ? 'selected' : ''}>Seat</option>
                      <option value="Ancillary" ${r.request_type === 'Ancillary' ? 'selected' : ''}>Ancillary</option>
                      <option value="Refund" ${r.request_type === 'Refund' ? 'selected' : ''}>Refund</option>
                      <option value="Reroute" ${r.request_type === 'Reroute' ? 'selected' : ''}>Reroute</option>
                    </select>
                  </td>
                  <td>
                    <select class="pnr-cell-select pnr-status status-tag-${r.status.toLowerCase().replace(/\s+/g, '-')}">
                      <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
                      <option value="Quoted" ${r.status === 'Quoted' ? 'selected' : ''}>Quoted</option>
                      <option value="Paid" ${r.status === 'Paid' ? 'selected' : ''}>Paid</option>
                      <option value="Sent to Ticketing" ${r.status === 'Sent to Ticketing' ? 'selected' : ''}>To Ticketing</option>
                      <option value="Done" ${r.status === 'Done' ? 'selected' : ''}>Done</option>
                    </select>
                  </td>
                  <td>
                    <input type="text" class="pnr-cell-input pnr-notes" value="${this.escapeHtml(r.owner_step)}" />
                  </td>
                  <td>
                    <button type="button" class="btn-del-pnr" title="Remove PNR row">&times;</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const addBtn = this.container.querySelector('#btnAddPnrRow');
    const addLccBtn = this.container.querySelector('#btnAddLccCombo');
    const collapseBtn = this.container.querySelector('#btnCollapsePnrTracker');

    if (addBtn) addBtn.addEventListener('click', () => this.addRow());
    if (addLccBtn) addLccBtn.addEventListener('click', () => this.addLccCombo());
    if (collapseBtn) collapseBtn.addEventListener('click', () => this.collapse());

    this.container.querySelectorAll('tbody tr').forEach(tr => {
      const rowId = tr.getAttribute('data-row-id');
      if (!rowId) return;

      const pnrInput = tr.querySelector('.pnr-loc') as HTMLInputElement;
      const sysSelect = tr.querySelector('.pnr-system') as HTMLSelectElement;
      const paxInput = tr.querySelector('.pnr-pax') as HTMLInputElement;
      const reqSelect = tr.querySelector('.pnr-req') as HTMLSelectElement;
      const statusSelect = tr.querySelector('.pnr-status') as HTMLSelectElement;
      const notesInput = tr.querySelector('.pnr-notes') as HTMLInputElement;
      const delBtn = tr.querySelector('.btn-del-pnr') as HTMLButtonElement;

      const saveRow = () => {
        const row = this.rows.find(r => r.id === rowId);
        if (row) {
          row.pnr = pnrInput.value.toUpperCase();
          row.system = sysSelect.value as any;
          row.pax_affected = paxInput.value;
          row.request_type = reqSelect.value as any;
          row.status = statusSelect.value as any;
          row.owner_step = notesInput.value;
        }
      };

      pnrInput.addEventListener('change', saveRow);
      sysSelect.addEventListener('change', saveRow);
      paxInput.addEventListener('change', saveRow);
      reqSelect.addEventListener('change', saveRow);
      statusSelect.addEventListener('change', () => {
        saveRow();
        this.render();
      });
      notesInput.addEventListener('change', saveRow);

      delBtn.addEventListener('click', () => this.deleteRow(rowId));
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
