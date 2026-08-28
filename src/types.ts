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

export interface CepStepDef {
  id: string;
  num: number;
  label: string;
}

export interface QAItem {
  id: string;
  text: string;
}

export interface MatrixField {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}
