export interface Stage {
  id: number;
  name: string;
  purpose: string;
  prospect_says: string[];
  tap_options: { key: string; label: string }[];
  sort_order: number;
}

export interface Call {
  id: string;
  prospect_name: string;
  prospect_role: string;
  company: string;
  status: 'in_progress' | 'closed';
  current_stage: number;
  furthest_stage: number;
  outcome?: string | null;
  summary?: string | null;
  summary_status: 'pending' | 'done' | 'failed' | 'skipped';
  started_at: string;
  ended_at?: string | null;
  furthest_stage_name?: string;
  general_notes?: string | null;
  stage_results?: StageResult[];
}

export interface StageResult {
  id?: string;
  call_id: string;
  stage_id: number;
  tap_key: string;
  prospect_words?: string | null;
  saved_at?: string;
}

// Fallback order: localStorage -> import.meta.env.VITE_API_BASE_URL -> Vite proxy in dev/preview -> Render backend
export const getApiBaseUrl = (): string => {
  const local = typeof window !== 'undefined' ? localStorage.getItem('CALL_GUIDE_API_URL') : null;
  if (local !== null && local !== undefined) return local.trim().replace(/\/$/, '');
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/$/, '');
  // When running in dev server / AI Studio preview iframe, use relative path so Vite proxy forwards requests to Render
  if (typeof window !== 'undefined' && (window.location.hostname.includes('run.app') || window.location.port === '3000')) {
    return '';
  }
  return 'https://cold-call-guide-s90e.onrender.com';
};

export const setApiBaseUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('CALL_GUIDE_API_URL', url.trim());
  }
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.detail) {
        detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      // Body not JSON
    }
    const err = new Error(detail);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<{ status: string; time: string }> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/health`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  async getStages(): Promise<Stage[]> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/stages`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  async startCall(payload: {
    prospect_name: string;
    prospect_role: string;
    company: string;
  }): Promise<Call> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async saveStage(
    callId: string,
    stageId: number,
    payload: { tap_key: string; prospect_words?: string }
  ): Promise<{ call: Call; stage_result: StageResult }> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/calls/${callId}/stages/${stageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async closeCall(callId: string, outcome?: string, generalNotes?: string): Promise<Call> {
    const base = getApiBaseUrl();
    const body: Record<string, any> = {};
    if (outcome) body.outcome = outcome;
    if (generalNotes && generalNotes.trim()) body.general_notes = generalNotes.trim();
    const res = await fetch(`${base}/calls/${callId}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async getCall(callId: string): Promise<Call> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/calls/${callId}`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  async getCalls(): Promise<Call[]> {
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/calls`, {
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },
};
