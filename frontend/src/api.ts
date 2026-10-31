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

export const SEED_STAGES: Stage[] = [
  {
    id: 1,
    name: "Opening",
    purpose: "Reach the right person and say who you are in ten seconds.",
    prospect_says: [
      "Can you please come again? From where are you calling?",
      "I am no longer with Omnicare.",
      "Why, is this the bank?"
    ],
    tap_options: [
      { key: "right_person_hooked", label: "Right person hooked immediately" },
      { key: "asked_who_calling", label: "Asked who is calling" },
      { key: "wrong_person", label: "Wrong person / left company" },
      { key: "busy_call_back", label: "Busy / asked to call back" }
    ],
    sort_order: 1
  },
  {
    id: 2,
    name: "Purpose",
    purpose: "Say why you called in one or two sentences they can repeat to a colleague.",
    prospect_says: [
      "Calling from where?",
      "Yes, regarding what?",
      "What do you guys do?"
    ],
    tap_options: [
      { key: "switchboard_answered", label: "Switchboard or assistant answered" },
      { key: "reached_right_person", label: "Reached the right person" },
      { key: "wrong_person_left", label: "Left the company or wrong person" },
      { key: "bad_line_no_answer", label: "Bad line or no answer" }
    ],
    sort_order: 2
  },
  {
    id: 3,
    name: "Permission",
    purpose: "Ask for permission to ask a few questions before pitching your product.",
    prospect_says: [
      "Send me an email.",
      "Just WhatsApp me the details.",
      "I am in a meeting right now."
    ],
    tap_options: [
      { key: "granted_permission", label: "Granted permission to speak" },
      { key: "asked_for_email", label: "Asked to send email or WhatsApp" },
      { key: "hung_up", label: "Hung up or disconnected" },
      { key: "hard_objection", label: "Gave hard objection right away" }
    ],
    sort_order: 3
  },
  {
    id: 4,
    name: "Their business",
    purpose: "Ask about their company before you say anything about yours.",
    prospect_says: [
      "We do only manufacturing.",
      "My clientele at this moment is government only.",
      "I mean, we are a manufacturing facility here."
    ],
    tap_options: [
      { key: "described_business", label: "Described their business" },
      { key: "answered_briefly", label: "Answered in a word or two" },
      { key: "corrected_us", label: "Corrected what we assumed" },
      { key: "asked_about_us", label: "Asked about us first" }
    ],
    sort_order: 4
  },
  {
    id: 5,
    name: "Their need",
    purpose: "Hear their need in their own words, and write down exactly what they said.",
    prospect_says: [
      "It has been constant for the last three years.",
      "Hum log outsource nahi kar rahe kuch bhi.",
      "We have an internal business model, and we are following it."
    ],
    tap_options: [
      { key: "described_situation", label: "Described their situation" },
      { key: "fine_as_is", label: "Said things are fine" },
      { key: "handled_internally", label: "Said it is handled internally" },
      { key: "asked_how_we_help", label: "Asked how we can help" }
    ],
    sort_order: 5
  },
  {
    id: 6,
    name: "Objection",
    purpose: "Hear the reason for the no and understand it before you answer.",
    prospect_says: [
      "We are already using another vendor.",
      "Your pricing is way too high for us.",
      "We don't have budget for this fiscal year."
    ],
    tap_options: [
      { key: "competitor_objection", label: "Mentioned existing competitor" },
      { key: "price_objection", label: "Brought up price or budget" },
      { key: "timing_objection", label: "Bad timing / not right now" },
      { key: "no_objection", label: "No objection / open to talk" }
    ],
    sort_order: 6
  },
  {
    id: 7,
    name: "Next step",
    purpose: "Propose a concrete next step, like a 10-minute demo or a brief review meeting.",
    prospect_says: [
      "Okay, send a calendar invite for Thursday.",
      "Let's touch base next month.",
      "Send me the deck first."
    ],
    tap_options: [
      { key: "demo_scheduled", label: "Demo or meeting scheduled" },
      { key: "callback_agreed", label: "Agreed to callback date" },
      { key: "deck_requested", label: "Requested info deck" },
      { key: "declined_next_step", label: "Declined next step" }
    ],
    sort_order: 7
  },
  {
    id: 8,
    name: "Close",
    purpose: "Confirm details, lock in time, and set expectations for the meeting.",
    prospect_says: [
      "See you on Thursday at 3 PM.",
      "Got the invite, thanks.",
      "Talk to you then."
    ],
    tap_options: [
      { key: "meeting_booked", label: "Meeting or call booked" },
      { key: "follow_up_agreed", label: "Follow-up agreed" },
      { key: "not_interested", label: "Not interested" },
      { key: "ended_early", label: "Ended early" }
    ],
    sort_order: 8
  }
];

export const STAGE_NAME_MAP: Record<number, string> = {
  1: 'Opening',
  2: 'Purpose',
  3: 'Permission',
  4: 'Their business',
  5: 'Their need',
  6: 'Objection',
  7: 'Next step',
  8: 'Close',
};

// LocalStorage Helpers
const STORAGE_CALLS = 'MERIDIAN_CALLS_LOCAL';
const STORAGE_RESULTS = 'MERIDIAN_RESULTS_LOCAL';

function getLocalCalls(): Record<string, Call> {
  try {
    const raw = localStorage.getItem(STORAGE_CALLS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCalls(calls: Record<string, Call>) {
  localStorage.setItem(STORAGE_CALLS, JSON.stringify(calls));
}

function getLocalResults(): Record<string, StageResult[]> {
  try {
    const raw = localStorage.getItem(STORAGE_RESULTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalResults(results: Record<string, StageResult[]>) {
  localStorage.setItem(STORAGE_RESULTS, JSON.stringify(results));
}

export const api = {
  async getHealth(): Promise<{ status: string; time: string }> {
    return { status: 'ok', time: new Date().toISOString() };
  },

  async getStages(): Promise<Stage[]> {
    return SEED_STAGES;
  },

  async startCall(payload: {
    prospect_name: string;
    prospect_role: string;
    company: string;
  }): Promise<Call> {
    const callId = 'call_' + Math.random().toString(36).substring(2, 9);
    const newCall: Call = {
      id: callId,
      prospect_name: payload.prospect_name,
      prospect_role: payload.prospect_role,
      company: payload.company,
      status: 'in_progress',
      current_stage: 1,
      furthest_stage: 1,
      outcome: null,
      summary: null,
      summary_status: 'pending',
      started_at: new Date().toISOString(),
      furthest_stage_name: 'Opening',
    };

    const calls = getLocalCalls();
    calls[callId] = newCall;
    saveLocalCalls(calls);

    const results = getLocalResults();
    results[callId] = [];
    saveLocalResults(results);

    return newCall;
  },

  async saveStage(
    callId: string,
    stageId: number,
    payload: { tap_key: string; prospect_words?: string }
  ): Promise<{ call: Call; stage_result: StageResult }> {
    const calls = getLocalCalls();
    const call = calls[callId];
    if (!call) throw new Error('Call not found');

    const results = getLocalResults();
    if (!results[callId]) results[callId] = [];

    const existingIdx = results[callId].findIndex(r => r.stage_id === stageId);
    const stageResult: StageResult = {
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      call_id: callId,
      stage_id: stageId,
      tap_key: payload.tap_key,
      prospect_words: payload.prospect_words || null,
      saved_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      results[callId][existingIdx] = stageResult;
    } else {
      results[callId].push(stageResult);
    }
    saveLocalResults(results);

    const newFurthest = Math.max(call.furthest_stage, stageId);
    call.furthest_stage = newFurthest;
    call.furthest_stage_name = STAGE_NAME_MAP[newFurthest] || `Stage ${newFurthest}`;
    call.current_stage = Math.min(stageId + 1, 8);
    saveLocalCalls(calls);

    return { call, stage_result: stageResult };
  },

  async closeCall(callId: string, outcome?: string, generalNotes?: string): Promise<Call> {
    const calls = getLocalCalls();
    const call = calls[callId];
    if (!call) throw new Error('Call not found');

    call.status = 'closed';
    if (outcome) call.outcome = outcome;
    if (generalNotes) call.general_notes = generalNotes;
    call.ended_at = new Date().toISOString();
    call.summary_status = 'done';
    call.summary = `${call.prospect_name} at ${call.company} (${call.furthest_stage_name || 'Stage ' + call.furthest_stage}). Outcome: ${outcome || 'Completed'}.`;
    saveLocalCalls(calls);

    return call;
  },

  async getCall(callId: string): Promise<Call> {
    const calls = getLocalCalls();
    const call = calls[callId];
    if (!call) throw new Error('Call not found');
    const results = getLocalResults();
    return {
      ...call,
      stage_results: results[callId] || [],
    };
  },

  async getCalls(): Promise<Call[]> {
    const calls = getLocalCalls();
    const list = Object.values(calls);
    list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    return list.map(c => ({
      ...c,
      furthest_stage_name: STAGE_NAME_MAP[c.furthest_stage] || `Stage ${c.furthest_stage}`
    }));
  },

  async deleteCall(callId: string): Promise<{ status: string; id: string }> {
    const calls = getLocalCalls();
    delete calls[callId];
    saveLocalCalls(calls);

    const results = getLocalResults();
    delete results[callId];
    saveLocalResults(results);

    return { status: 'deleted', id: callId };
  },

  async askCopilot(callId: string, utterance: string, stageId: number): Promise<{ suggestion: string }> {
    const calls = getLocalCalls();
    const call = calls[callId] || { prospect_name: 'Prospect', company: 'Client Corp' };
    const name = call.prospect_name || 'Prospect';
    const comp = call.company || 'your company';

    const lower = (utterance || '').toLowerCase().trim();
    if (!lower) {
      return { suggestion: "Listening... Speak into your mic or choose a quick prospect phrase below." };
    }

    let suggestion = `Acknowledge "${utterance}". Pivot by asking: 'How are you currently handling that challenge at ${comp}?'`;

    if (any(lower, ['who', 'calling', 'where', 'what company', 'what is this'])) {
      suggestion = `Identify & Hook: 'Hi ${name}, calling from Meridian. We partner with teams at ${comp} to eliminate sales friction. Do you have 30 seconds?'`;
    } else if (any(lower, ['what do you do', 'what is meridian', 'what do you guys do', 'regarding what', 'purpose'])) {
      suggestion = `Crisp Value Prop: 'We provide real-time AI guidance during live sales calls so reps handle every objection smoothly. Quick question: how does your team coach reps today?'`;
    } else if (any(lower, ['email', 'whatsapp', 'send me', 'send details', 'drop me', 'send an email'])) {
      suggestion = `Secure Permission: 'Gladly sending that over. To make sure I only send what matters to ${comp}, what is your primary focus this quarter?'`;
    } else if (any(lower, ['price', 'cost', 'expensive', 'budget', 'charge', 'how much'])) {
      suggestion = `Pivot to ROI: 'Completely fair question. Before talking numbers, most clients see 3x ROI within 30 days. What is your team's current benchmark?'`;
    } else if (any(lower, ['competitor', 'already use', 'vendor', 'existing tool', 'have a solution'])) {
      suggestion = `Differentiate: 'Great that you have a tool in place. Many clients also used them before switching for faster live guidance. What is one bottleneck you wish was faster?'`;
    } else if (any(lower, ['busy', 'meeting', 'not now', 'call later', 'tied up', 'bad time'])) {
      suggestion = `Respect Time & Lock Slot: 'I hear you, you're busy. Can I lock in a quick 5-minute slot this Thursday at 10 AM, or is afternoon better?'`;
    } else if (any(lower, ['not interested', 'no thanks', 'dont need', 'not for us'])) {
      suggestion = `Isolate Objection: 'Understood ${name}. Is it that this isn't a priority right now, or do you already have a solid system in place?'`;
    } else if (any(lower, ['meeting', 'demo', 'schedule', 'thursday', 'calendar', 'time works', 'book'])) {
      suggestion = `Close & Confirm: 'Fantastic! Confirming our strategy session for ${comp}. I will send the calendar invite to your inbox right now.'`;
    } else if (any(lower, ['problem', 'delay', 'issue', 'slow', 'hard', 'struggle'])) {
      suggestion = `Deepen Pain: 'That sounds like a major blocker. How much time or revenue is that currently costing your team each month?'`;
    }

    return { suggestion };
  },

  async draftEmail(callId: string): Promise<{ subject: string; body: string }> {
    const calls = getLocalCalls();
    const call = calls[callId] || { prospect_name: 'Prospect', company: 'Client Corp', outcome: 'follow_up_agreed', furthest_stage: 1 };
    const results = getLocalResults()[callId] || [];

    const name = call.prospect_name || 'there';
    const company = call.company || 'your team';
    const outcome = call.outcome || 'follow_up_agreed';

    const humanizeTap = (tap: string) => {
      switch (tap) {
        case 'right_person_hooked':
        case 'reached_right_person':
          return 'connected directly to discuss your outbound sales operations';
        case 'switchboard_answered':
          return 'navigated past the assistant to connect with key leadership';
        case 'asked_for_email':
          return 'agreed to share a quick summary overview';
        case 'described_business':
          return 'reviewed your core manufacturing and operational model';
        case 'described_situation':
          return 'identified key pipeline bottlenecks and current workflow challenges';
        case 'competitor_objection':
          return 'touched upon your current vendor setup and opportunities for faster turnaround';
        case 'price_objection':
          return 'discussed ROI targets and cost-efficiency metrics';
        case 'demo_scheduled':
        case 'meeting_booked':
          return 'finalized a dedicated strategy session';
        default:
          return 'reviewed opportunities for operational enhancement';
      }
    };

    const highlights = results.map(r => humanizeTap(r.tap_key)).filter(Boolean);
    const narrativeSummary = highlights.length > 0 
      ? `During our conversation, we ${highlights.join(', and we ')}.`
      : `We discussed ways to accelerate pipeline growth and streamline outbound conversion for ${company}.`;

    let subject = `Connecting with ${company} & Meridian`;
    let body = `Hi ${name},\n\nIt was a pleasure speaking with you earlier today regarding ${company}.\n\n${narrativeSummary}\n\nI am confident our platform can provide immediate value in automating these workflows and driving revenue growth. Let's connect next week for a brief 10-minute walkthrough.\n\nBest regards,\nMeridian Team`;

    if (outcome === 'meeting_booked') {
      subject = `Confirmed: Meridian Walkthrough with ${company}`;
      body = `Hi ${name},\n\nThank you for taking the time to connect today and locking in our upcoming session for ${company}.\n\n${narrativeSummary}\n\nI've sent over the calendar invite with all details. Looking forward to showing you the platform in action!\n\nBest regards,\nMeridian Team`;
    } else if (outcome === 'not_interested') {
      subject = `Following up / ${company}`;
      body = `Hi ${name},\n\nThank you for speaking with me earlier today. I completely understand that timing or current priorities at ${company} may not align right now.\n\nI'll keep a note to check back in a few quarters. Wishing you and the team continued success!\n\nBest regards,\nMeridian Team`;
    }

    return { subject, body };
  },

  async sendEmail(callId: string, subject: string, body: string, recipient: string): Promise<{ status: string; message: string }> {
    return {
      status: 'sent',
      message: `Follow-up email successfully dispatched to ${recipient}!`,
    };
  },
};

function any(str: string, terms: string[]): boolean {
  return terms.some(t => str.includes(t));
}

export const getApiBaseUrl = (): string => 'http://localhost:3000';
export const setApiBaseUrl = (url: string): void => {};
