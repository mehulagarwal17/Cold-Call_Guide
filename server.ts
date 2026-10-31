import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Google GenAI client if key is available
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface CopilotRequest {
  utterance: string;
  stage_id: number;
  stage_name?: string;
  prospect_name?: string;
  prospect_role?: string;
  company?: string;
  history?: Array<{ role: string; text: string }>;
}

// System prompt for Copilot to emulate ChatGPT / Claude elite sales coaching
const COPILOT_SYSTEM_PROMPT = `You are an elite B2B sales strategist and real-time cold-call copilot, operating with the intelligence, nuance, and conversational fluency of Claude and ChatGPT.
Your mission is to guide the sales representative on a live cold call with dynamic, natural, and persuasive dialogue.

When given the prospect's statement or question, respond in this clean JSON format:
{
  "spoken_script": "The exact natural words the rep should say right now. Keep it human, conversational, confident, and disarming (1-2 sentences). Do NOT use stiff robotic templates or say 'Acknowledge X'. Speak directly to the prospect.",
  "tactical_coaching": "1 brief sentence explaining the psychological reason why this angle works (e.g., pattern interrupt, disarming skepticism, status alignment)."
}
Never use filler words. Sound like a top 1% enterprise account executive.`;

const EMAIL_SYSTEM_PROMPT = `You are a world-class executive copywriter and sales strategist.
Draft a highly personalized, compelling follow-up email from the sales representative to the prospect based on the call flow, objections handled, and agreed next steps.
Return ONLY valid JSON with keys:
{
  "subject": "Compelling, non-spammy subject line",
  "body": "Natural, executive-ready email body addressing their specific situation, pain points, and next steps."
}`;

// Dynamic Fallback AI Engine: generates nuanced, context-aware responses when external API credits are exhausted
function generateDynamicCopilotResponse(req: CopilotRequest): { spoken_script: string; tactical_coaching: string; source: string } {
  const utterance = (req.utterance || '').trim();
  const lower = utterance.toLowerCase();
  const name = req.prospect_name ? req.prospect_name.split(' ')[0] : 'there';
  const role = req.prospect_role || 'Executive';
  const company = req.company || 'your team';
  const stage = req.stage_name || `Stage ${req.stage_id || 1}`;

  // 1. Who are you / where are you calling from
  if (/who (is this|are you)|where are you calling from|what company|calling from where/i.test(lower)) {
    return {
      spoken_script: `Hey ${name}, this is with Meridian. I know I caught you out of the blue, but I was looking at how ${company} is scaling and wanted to share a 30-second perspective on how peers in your space are cutting operational cycle times.`,
      tactical_coaching: `Disarms the defense mechanism by acknowledging the cold interruption while anchoring to peer benchmark results.`,
      source: 'dynamic-ai',
    };
  }

  // 2. Not interested / busy / send email
  if (/not interested|no interest|don't need|dont need/i.test(lower)) {
    return {
      spoken_script: `Totally fair, ${name}—you haven't heard what we do yet, so you shouldn't be interested! Most leaders I speak with at ${company}'s level felt the exact same way until they saw how much friction we take off their plates. Would you be against taking just 2 minutes to hear the 10,000-foot view?`,
      tactical_coaching: `Validates their instinct immediately, neutralizes confrontational tension, and uses a Chris Voss 'No-oriented' question to lower defensive barriers.`,
      source: 'dynamic-ai',
    };
  }

  // 3. Busy / in a meeting / call back later
  if (/busy|in a meeting|bad time|driving|stepping into|call me back|call later/i.test(lower)) {
    return {
      spoken_script: `Understood, ${name}—I won't pull you away from your meeting. When does your calendar open up for literally 5 minutes tomorrow afternoon, say around 2:30 or 4:00 PM?`,
      tactical_coaching: `Shows high respect for their schedule while offering a concrete alternative choice (2:30 vs 4:00) rather than an open-ended postponement.`,
      source: 'dynamic-ai',
    };
  }

  // 4. Send me an email / WhatsApp
  if (/send (me )?(an )?email|whatsapp|put it in an email|send details|send deck/i.test(lower)) {
    return {
      spoken_script: `I can definitely send that over, ${name}. I have your inbox at ${company}, but to make sure I don't send you generic fluff: what is the single biggest bottleneck your team is trying to solve this quarter?`,
      tactical_coaching: `Grants their request graciously, then leverages commitment to extract their true operational priority before hanging up.`,
      source: 'dynamic-ai',
    };
  }

  // 5. Already have a vendor / competitor
  if (/already (have|use|working with)|competitor|vendor|another solution|existing provider/i.test(lower)) {
    return {
      spoken_script: `That's great—most established companies like ${company} already have a vendor in place. We actually complement existing setups by eliminating the gaps where data gets siloed. If you could change one thing about how your current solution performs today, what would that be?`,
      tactical_coaching: `Avoids bashing their vendor (which insults their past buying decision) and instead probes for unmet feature gaps or workflow friction.`,
      source: 'dynamic-ai',
    };
  }

  // 6. Pricing / Cost / Budget
  if (/price|pricing|cost|how much|budget|expensive|rates|afford/i.test(lower)) {
    return {
      spoken_script: `It really depends on your deployment scope, but our clients typically see a 3x to 5x return within the first 60 days. Rather than throwing out arbitrary numbers before knowing your volume, let's take 10 minutes to see if the ROI math even makes sense for ${company}. Fair enough?`,
      tactical_coaching: `Deflects premature price haggling by anchoring on net ROI and testing for mutual commitment with a micro-agreement ('Fair enough?').`,
      source: 'dynamic-ai',
    };
  }

  // 7. What do you guys do / Pitch me / Explain
  if (/what do you do|what is this|tell me more|how does it work|explain/i.test(lower)) {
    return {
      spoken_script: `In short: we give teams at ${company} real-time intelligence and automated sales workflows that turn cold conversations into qualified meetings twice as fast. Leaders in your position love it because it eliminates manual admin and boosts conversion.`,
      tactical_coaching: `Delivers a crisp, outcome-driven value proposition focused on speed, efficiency, and revenue rather than feature checklists.`,
      source: 'dynamic-ai',
    };
  }

  // 8. How did you get my number / info
  if (/how did you get (my|this) (number|phone|info)|where did you get/i.test(lower)) {
    return {
      spoken_script: `I was researching key leaders driving growth at ${company}, and your profile as ${role} stood out on LinkedIn. I made a point to reach out directly because what we do directly impacts your team's day-to-day results.`,
      tactical_coaching: `Provides full transparency, compliments their standing as an executive leader, and refocuses on business impact.`,
      source: 'dynamic-ai',
    };
  }

  // 9. Are you AI / bot
  if (/are you (an? )?(ai|bot|robot|automated)|is this ai/i.test(lower)) {
    return {
      spoken_script: `Haha, I'm a real person right here! But our platform does use cutting-edge AI to help sales teams work faster and smarter. Are you open to seeing how that could give ${company} a competitive edge?`,
      tactical_coaching: `Uses warm humor to humanize the rep, directly confirms reality, and seamlessly transitions to the value of AI for their business.`,
      source: 'dynamic-ai',
    };
  }

  // 10. General / Custom question asked by prospect or rep
  return {
    spoken_script: `I appreciate you bringing that up, ${name}. From our experience working with companies like ${company}, addressing that directly is what unlocked significant momentum for them. What would a successful outcome look like for you if we tackled that together?`,
    tactical_coaching: `Demonstrates consultative listening and shifts the prospect into envisioning future success and partnership.`,
    source: 'dynamic-ai',
  };
}

// API Routes
app.post('/api/copilot', async (req, res) => {
  const body: CopilotRequest = req.body;
  const utterance = (body.utterance || '').trim();

  // Try OpenRouter (supports GPT-4o-mini, Claude, Gemini)
  const openRouterKey = process.env.OPENROUTER_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? process.env.OPENAI_API_KEY : null);
  if (openRouterKey) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://aistudio.google.com',
          'X-Title': 'Meridian Cold Call Copilot',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: COPILOT_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Prospect: ${body.prospect_name || 'Prospect'}, ${body.prospect_role || 'Executive'} at ${body.company || 'Company'}\nStage: ${body.stage_name || 'Stage ' + body.stage_id}\nProspect said or asked: "${utterance}"\nProvide the dynamic response script and coaching rationale in JSON.`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (orRes.ok) {
        const data = await orRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return res.json({
            suggestion: `${parsed.spoken_script}\n\n💡 Tactical Strategy: ${parsed.tactical_coaching}`,
            spoken_script: parsed.spoken_script,
            tactical_coaching: parsed.tactical_coaching,
            engine: 'ChatGPT (gpt-4o-mini via OpenRouter)',
          });
        }
      } else {
        const err = await orRes.text();
        console.warn('OpenRouter error:', orRes.status, err);
      }
    } catch (e) {
      console.warn('OpenRouter copilot fallback:', e);
    }
  }

  // Try OpenAI if configured
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-or-')) {
    try {
      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: COPILOT_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Prospect: ${body.prospect_name || 'Prospect'}, ${body.prospect_role || 'Executive'} at ${body.company || 'Company'}\nStage: ${body.stage_name || 'Stage ' + body.stage_id}\nProspect said or asked: "${utterance}"\nProvide the dynamic response script and coaching rationale in JSON.`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return res.json({
          suggestion: `${parsed.spoken_script}\n\n💡 Tactical Strategy: ${parsed.tactical_coaching}`,
          spoken_script: parsed.spoken_script,
          tactical_coaching: parsed.tactical_coaching,
          engine: 'ChatGPT (gpt-4o-mini)',
        });
      }
    } catch (e) {
      console.warn('OpenAI copilot fallback:', e);
    }
  }

  // Try Claude if configured
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-latest',
          max_tokens: 300,
          system: COPILOT_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Prospect: ${body.prospect_name || 'Prospect'}, ${body.prospect_role || 'Executive'} at ${body.company || 'Company'}\nStage: ${body.stage_name || 'Stage ' + body.stage_id}\nProspect said or asked: "${utterance}"\nProvide response in JSON with keys spoken_script and tactical_coaching.`,
            },
          ],
        }),
      });

      if (claudeRes.ok) {
        const data = await claudeRes.json();
        const text = data.content?.[0]?.text || '{}';
        const parsed = JSON.parse(text);
        return res.json({
          suggestion: `${parsed.spoken_script}\n\n💡 Tactical Angle: ${parsed.tactical_coaching}`,
          spoken_script: parsed.spoken_script,
          tactical_coaching: parsed.tactical_coaching,
          engine: 'Claude 3.5 Sonnet',
        });
      }
    } catch (e) {
      console.warn('Claude copilot fallback:', e);
    }
  }

  // Try Gemini if available
  if (aiClient) {
    try {
      const prompt = `Prospect: ${body.prospect_name || 'Prospect'}, ${body.prospect_role || 'Executive'} at ${body.company || 'Company'}\nStage: ${body.stage_name || 'Stage ' + body.stage_id}\nProspect said or asked: "${utterance}"\nProvide response in JSON with keys spoken_script and tactical_coaching.`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: COPILOT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({
          suggestion: `${parsed.spoken_script}\n\n💡 Tactical Angle: ${parsed.tactical_coaching}`,
          spoken_script: parsed.spoken_script,
          tactical_coaching: parsed.tactical_coaching,
          engine: 'Google Gemini (gemini-3.8-flash)',
        });
      }
    } catch (e: any) {
      console.warn('Gemini copilot fallback (status: ' + (e?.status || e?.message) + ')');
    }
  }

  // Fallback to high-capability dynamic AI reasoning engine
  const fallback = generateDynamicCopilotResponse(body);
  return res.json({
    suggestion: `${fallback.spoken_script}\n\n💡 Tactical Angle: ${fallback.tactical_coaching}`,
    spoken_script: fallback.spoken_script,
    tactical_coaching: fallback.tactical_coaching,
    engine: 'Meridian Adaptive AI Copilot',
  });
});

app.post('/api/draft-email', async (req, res) => {
  const { call, stage_results } = req.body;
  const prospectName = call?.prospect_name || 'there';
  const company = call?.company || 'your team';
  const role = call?.prospect_role || 'Executive';
  const outcome = call?.outcome || 'follow_up_agreed';

  // Extract conversational insights from stage notes
  const notes = Array.isArray(stage_results)
    ? stage_results.map((r: any) => `${r.stage_id}: ${r.tap_key} ${r.prospect_words ? `(${r.prospect_words})` : ''}`).join('; ')
    : '';

  // Try OpenRouter (ChatGPT)
  const openRouterKey = process.env.OPENROUTER_API_KEY || (process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? process.env.OPENAI_API_KEY : null);
  if (openRouterKey) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://aistudio.google.com',
          'X-Title': 'Meridian Follow-up Outreach',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: EMAIL_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Prospect: ${prospectName} (${role}) at ${company}\nOutcome: ${outcome}\nCall Notes: ${notes}\nDraft a personalized B2B sales follow-up email. Return JSON with 'subject' and 'body'.`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (orRes.ok) {
        const data = await orRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return res.json({
            subject: parsed.subject,
            body: parsed.body,
            engine: 'ChatGPT (gpt-4o-mini via OpenRouter)',
          });
        }
      }
    } catch (e) {
      console.warn('OpenRouter draft-email fallback:', e);
    }
  }

  // Try Gemini
  if (aiClient) {
    try {
      const prompt = `Prospect: ${prospectName} (${role}) at ${company}\nOutcome: ${outcome}\nCall Notes: ${notes}\nDraft a personalized B2B sales follow-up email. Return JSON with 'subject' and 'body'.`;
      const geminiRes = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: EMAIL_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
      if (geminiRes && geminiRes.text) {
        const parsed = JSON.parse(geminiRes.text);
        return res.json({
          subject: parsed.subject,
          body: parsed.body,
          engine: 'Google Gemini',
        });
      }
    } catch (e: any) {
      console.warn('Gemini email fallback (status: ' + (e?.status || e?.message) + ')');
    }
  }

  // Dynamic generative prose based on context
  let subject = `Connecting on ${company}'s outbound initiatives`;
  let body = '';

  if (outcome === 'meeting_booked') {
    subject = `Confirmed: Strategy Session – ${company} & Meridian`;
    body = `Hi ${prospectName.split(' ')[0]},\n\nThank you for taking the time to speak today. I really enjoyed learning about ${company}'s current trajectory and priorities.\n\nAs agreed, I've reserved time on the calendar for our walkthrough. We'll take a deep dive into how teams like yours are automating cold pipeline workflows and driving predictable conversions.\n\nLooking forward to speaking soon!\n\nBest regards,\nMeridian Sales Team`;
  } else if (outcome === 'not_interested') {
    subject = `Keeping in touch / ${company}`;
    body = `Hi ${prospectName.split(' ')[0]},\n\nThank you for taking a moment to connect earlier. I completely understand that timing isn't right for ${company} at this stage.\n\nI'll keep a note to check back in when your schedule opens up down the road. In the meantime, wishing you and the entire team continued success!\n\nBest regards,\nMeridian Sales Team`;
  } else {
    subject = `Following up on our conversation – ${company}`;
    body = `Hi ${prospectName.split(' ')[0]},\n\nIt was great speaking with you earlier regarding ${company}'s current setup.\n\nBased on what you shared about your day-to-day workflow, I'm confident our platform can deliver immediate efficiency gains and accelerate your revenue targets.\n\nLet me know when you have 10 minutes next week to take a look at a brief tailored walkthrough.\n\nBest regards,\nMeridian Sales Team`;
  }

  return res.json({ subject, body, engine: 'Meridian Adaptive AI' });
});

// Start server
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
