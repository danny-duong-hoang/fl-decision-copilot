export interface DecisionPath {
  id: string;
  title?: string;
  when: string[];
  fl_steps: string[];
  snippets: string[];
  alternatives: string[];
  forbidden: string[];
  handoff: string;
  source: string;
  last_verified: string;
  needs_shelf_check: boolean;
}

export interface Snippet {
  id: string;
  triggers: string[];
  title: string;
  cep_step: string;
  paths?: string[];
  text: string;
  vars: string[];
  channel: string[];
  last_verified: string;
}

export interface RunbookStep {
  step_num: number;
  title: string;
  desc: string;
  cmd: string;
  notes?: string;
}

export interface Runbook {
  id: string;
  title: string;
  gds: 'amadeus' | 'sabre' | 'general';
  scenario: string;
  wizard_type: string; // 'Rebooking Wizard' | 'Modify Order' | 'Add-on Purchase'
  branch: string[];
  steps: RunbookStep[];
  source: string;
  last_verified: string;
  needs_shelf_check: boolean;
}

export interface MultiPnrRow {
  id: string;
  pnr: string;
  system: 'Amadeus' | 'Sabre' | 'LCC' | 'Portal';
  pax_affected: string;
  request_type: 'Rebook' | 'Cancel' | 'Seat' | 'Ancillary' | 'Refund' | 'Reroute';
  status: 'Pending' | 'Quoted' | 'Paid' | 'Sent to Ticketing' | 'Done';
  owner_step: string;
}

export interface CepStepDef {
  id: string;
  num: number;
  label: string;
  desc?: string;
  cueSnippetId?: string;
}

export interface QAItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface MatrixField {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface MetaConfig {
  content_version: string;
  data_source: string;
  last_updated: string;
  modify_order_reasons: Record<string, string>;
  coupon_status_actions: Record<string, string>;
  sabre_commands_quickref: Record<string, string>;
  service_fee_rules: {
    standard_voluntary_rebooking: string;
    standard_voluntary_cancellation: string;
    schedule_change_second_alt: string;
    post_departure_refund_noshow: string;
    waived_conditions: string[];
    multi_pnr_rule: string;
  };
  open_questions_notes: string[];
}
