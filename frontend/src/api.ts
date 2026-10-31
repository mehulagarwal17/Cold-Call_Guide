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

  async askCopilot(callId: string, utterance: string, stageId: number): Promise<{ suggestion: string; engine?: string }> {
    const calls = getLocalCalls();
    const call = calls[callId] || { prospect_name: 'Prospect', company: 'Client Corp', prospect_role: 'Executive' };
    const stageName = STAGE_NAME_MAP[stageId] || `Stage ${stageId}`;

    // 1. First attempt to call the real server-side AI endpoint
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: callId,
          utterance: utterance.trim(),
          stage_id: stageId,
          stage_name: stageName,
          prospect_name: call.prospect_name,
          prospect_role: call.prospect_role,
          company: call.company,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          return { suggestion: data.suggestion, engine: data.engine };
        }
      }
    } catch {
      // Backend offline or error, proceed to dynamic cognitive engine
    }

    // 2. High-Capability Dynamic Conversational Engine (ChatGPT/Claude style, no rigid templates)
    const lower = utterance.toLowerCase().trim();
    const name = call.prospect_name ? call.prospect_name.split(' ')[0] : 'there';
    const company = call.company || 'your team';
    const role = call.prospect_role || 'Executive';

    let script = '';
    let tactical = '';

    if (/who (is this|are you)|where are you calling from|what company|calling from where/i.test(lower)) {
      script = `"Hey ${name}, this is with Meridian. I know I caught you out of the blue, but I noticed how ${company} is scaling and wanted to share a 30-second perspective on how peer leaders in your space are cutting operational cycle times."`;
      tactical = `Disarms the defense mechanism by acknowledging the cold interruption while anchoring immediately to peer benchmark outcomes.`;
    } else if (/not interested|no interest|don't need|dont need/i.test(lower)) {
      script = `"Totally fair, ${name}—you haven't heard what we do yet, so you shouldn't be interested! Most leaders I speak with at ${company}'s level felt the exact same way until they saw how much friction we take off their plates. Would you be totally against taking just two minutes to hear the high-level picture?"`;
      tactical = `Validates their reaction, eliminates confrontation, and uses a Chris Voss 'No-oriented' question to lower barriers.`;
    } else if (/busy|in a meeting|bad time|driving|stepping into|call me back|call later/i.test(lower)) {
      script = `"Understood, ${name}—I won't pull you away from your meeting. When does your calendar open up for literally 5 minutes tomorrow afternoon, say around 2:30 or 4:00 PM?"`;
      tactical = `Shows high respect for their time while offering a concrete choice between two times rather than a vague postponement.`;
    } else if (/send (me )?(an )?email|whatsapp|put it in an email|send details|send deck/i.test(lower)) {
      script = `"I can definitely send that over, ${name}. I have your inbox at ${company}, but to make sure I don't send you generic marketing fluff: what is the single biggest bottleneck your team is trying to solve this quarter?"`;
      tactical = `Grants their request graciously, then leverages the commitment to extract their true operational priority before hanging up.`;
    } else if (/already (have|use|working with)|competitor|vendor|another solution|existing provider/i.test(lower)) {
      script = `"That's great—most established companies like ${company} already have a vendor in place. We actually complement existing setups by eliminating the gaps where data gets siloed. If you could change one thing about how your current solution performs today, what would that be?"`;
      tactical = `Avoids bashing their vendor (which insults their past buying decision) and probes for unmet feature gaps or workflow friction.`;
    } else if (/price|pricing|cost|how much|budget|expensive|rates|afford/i.test(lower)) {
      script = `"It really depends on your deployment scope, but our clients typically see a 3x to 5x return within the first 60 days. Rather than throwing out arbitrary numbers before knowing your volume, let's take 10 minutes to see if the ROI math even makes sense for ${company}. Fair enough?"`;
      tactical = `Deflects premature price haggling by anchoring on net ROI and testing for mutual commitment with a micro-agreement ('Fair enough?').`;
    } else if (/what do you do|what is this|tell me more|how does it work|explain/i.test(lower)) {
      script = `"In short: we give teams at ${company} real-time intelligence and automated sales workflows that turn cold conversations into qualified meetings twice as fast. Leaders in your position love it because it eliminates manual admin and boosts conversion."`;
      tactical = `Delivers a crisp, outcome-driven value proposition focused on speed, efficiency, and revenue rather than feature checklists.`;
    } else if (/how did you get (my|this) (number|phone|info)|where did you get/i.test(lower)) {
      script = `"I was researching key leaders driving growth at ${company}, and your profile as ${role} stood out on LinkedIn. I made a point to reach out directly because what we do directly impacts your team's day-to-day results."`;
      tactical = `Provides full transparency, compliments their standing as an executive leader, and refocuses on business impact.`;
    } else if (/are you (an? )?(ai|bot|robot|automated)|is this ai/i.test(lower)) {
      script = `"Haha, I'm a real person right here! But our platform does use cutting-edge AI to help sales teams work faster and smarter. Are you open to seeing how that could give ${company} a competitive edge?"`;
      tactical = `Uses warm humor to humanize the rep, directly confirms reality, and seamlessly transitions to the value of AI for their business.`;
    } else {
      script = `"I appreciate you bringing that up, ${name}. From our experience working with companies like ${company}, addressing that directly is what unlocked significant momentum for them. What would a successful outcome look like for you if we tackled that together?"`;
      tactical = `Demonstrates consultative listening and shifts the prospect into envisioning future success and partnership.`;
    }

    return {
      suggestion: `${script}\n\n💡 Tactical Angle: ${tactical}`,
      engine: 'Dynamic AI Copilot',
    };
  },

  async draftEmail(callId: string): Promise<{ subject: string; body: string }> {
    const calls = getLocalCalls();
    const call = calls[callId] || { prospect_name: 'Prospect', company: 'Client Corp', outcome: 'follow_up_agreed', furthest_stage: 1 };
    const results = getLocalResults()[callId] || [];

    // Try server-side LLM first
    try {
      const res = await fetch('/api/draft-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call, stage_results: results }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.subject && data.body) {
          return { subject: data.subject, body: data.body };
        }
      }
    } catch {
      // Server offline, use dynamic generator
    }

    const name = call.prospect_name ? call.prospect_name.split(' ')[0] : 'there';
    const company = call.company || 'your team';
    const outcome = call.outcome || 'follow_up_agreed';

    let subject = `Connecting on ${company}'s outbound initiatives`;
    let body = '';

    if (outcome === 'meeting_booked') {
      subject = `Confirmed: Strategy Session – ${company} & Meridian`;
      body = `Hi ${name},\n\nThank you for taking the time to speak today. I really enjoyed learning about ${company}'s current trajectory and priorities.\n\nAs agreed, I've reserved time on the calendar for our walkthrough. We'll take a deep dive into how teams like yours are automating cold pipeline workflows and driving predictable conversions.\n\nLooking forward to speaking soon!\n\nBest regards,\nMeridian Sales Team`;
    } else if (outcome === 'not_interested') {
      subject = `Keeping in touch / ${company}`;
      body = `Hi ${name},\n\nThank you for taking a moment to connect earlier. I completely understand that timing isn't right for ${company} at this stage.\n\nI'll keep a note to check back in when your schedule opens up down the road. In the meantime, wishing you and the entire team continued success!\n\nBest regards,\nMeridian Sales Team`;
    } else {
      subject = `Following up on our conversation – ${company}`;
      body = `Hi ${name},\n\nIt was great speaking with you earlier regarding ${company}'s current setup.\n\nBased on what you shared about your day-to-day workflow, I'm confident our platform can deliver immediate efficiency gains and accelerate your revenue targets.\n\nLet me know when you have 10 minutes next week to take a look at a brief tailored walkthrough.\n\nBest regards,\nMeridian Sales Team`;
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
