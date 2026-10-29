-- seed.sql: the 8 stages of a cold call, final version
-- Format follows the DeepThought reference screen: EXACTLY 3 prospect quotes and EXACTLY 4 taps per stage.
-- Stage names and purposes: DeepThought "structure of a cold call" page.
-- Quotes: taken from the 100 transcripts (transcript id in the comment above each stage).
-- Stage 8 tap keys are the call OUTCOMES and are saved as calls.outcome.
-- Safe to re-run (upsert). Run db/schema.sql first.

insert into stages (id, name, purpose, prospect_says, tap_options, sort_order) values

-- Quotes: T010, T039, T090
(1, 'Opening',
 'Reach the right person and say who you are in ten seconds.',
 '["Can you please come again? From where are you calling?", "I am no longer with Omnicare.", "Why, is this the bank?"]',
 '[{"key":"gatekeeper_answered","label":"Switchboard or assistant answered"},
   {"key":"reached_right_person","label":"Reached the right person"},
   {"key":"left_or_wrong_person","label":"Left the company or wrong person"},
   {"key":"bad_line_or_no_answer","label":"Bad line or no answer"}]',
 1),

-- Quotes: T047, T047, T084
(2, 'Purpose',
 'Say why you called in one or two sentences they can repeat to a colleague.',
 '["Calling from where?", "Yes, regarding what?", "What do you guys do?"]',
 '[{"key":"asked_who_calling","label":"Asked who is calling"},
   {"key":"asked_what_about","label":"Asked what it is about"},
   {"key":"asked_what_we_do","label":"Asked what we do"},
   {"key":"let_me_go_on","label":"Let me go on"}]',
 2),

-- Quotes: T005, T026, T001
(3, 'Permission',
 'Find out if they will talk now: a yes, a no, or a time to call back.',
 '["Can you call me in an hour?", "I am driving, but I can speak to you.", "After 2 PM. Call us in the afternoon."]',
 '[{"key":"yes_talk_now","label":"Said yes, talk now"},
   {"key":"call_later","label":"Asked us to call later"},
   {"key":"send_first","label":"Wants it on WhatsApp or email first"},
   {"key":"no_time","label":"Said no time"}]',
 3),

-- Quotes: T081, T081, T084
(4, 'Their business',
 'Ask about their company before you say anything about yours.',
 '["We do only manufacturing.", "My clientele at this moment is government only.", "I mean, we are a manufacturing facility here."]',
 '[{"key":"described_business","label":"Described their business"},
   {"key":"answered_briefly","label":"Answered in a word or two"},
   {"key":"corrected_us","label":"Corrected what we assumed"},
   {"key":"asked_about_us","label":"Asked about us first"}]',
 4),

-- Quotes: T084, T021, T009
(5, 'Their need',
 'Hear their need in their own words, and write down exactly what they said.',
 '["It has been constant for the last three years.", "Hum log outsource nahi kar rahe kuch bhi.", "We have an internal business model, and we are following it."]',
 '[{"key":"described_situation","label":"Described their situation"},
   {"key":"fine_as_is","label":"Said things are fine"},
   {"key":"handled_internally","label":"Said it is handled internally"},
   {"key":"asked_how_we_help","label":"Asked how we can help"}]',
 5),

-- Quotes: T047, T024, T053
(6, 'Objection',
 'Hear the reason for the no and understand it before you answer.',
 '["What are the charges for that?", "I am not the right person, my CFO takes care of all those things.", "No, I don''t have time for such work. You should call somebody else."]',
 '[{"key":"not_right_person","label":"Not the right person"},
   {"key":"asked_cost","label":"Asked about cost or what is in it for us"},
   {"key":"not_interested","label":"Not interested or no time"},
   {"key":"not_relevant","label":"Not relevant to them"}]',
 6),

-- Quotes: T047, T084, T006
(7, 'Next step',
 'Agree one concrete next step, with a time or a channel.',
 '["Send me the details, let''s have a look.", "Both work for me. You can send it over WhatsApp.", "Can you send the mail, please?"]',
 '[{"key":"send_on_whatsapp","label":"Agreed to WhatsApp"},
   {"key":"send_by_email","label":"Agreed to email"},
   {"key":"named_a_time","label":"Named a time themselves"},
   {"key":"referred_colleague","label":"Referred us to someone"}]',
 7),

-- Quotes: T084, T012, T081
(8, 'Close',
 'End clearly and record the outcome, the next step and their words from stage 5.',
 '["Done.", "Okay. Thank you.", "Okay, thank you for your time."]',
 '[{"key":"meeting_booked","label":"Meeting or call booked"},
   {"key":"follow_up_agreed","label":"Report or follow-up agreed"},
   {"key":"not_interested","label":"Not interested"},
   {"key":"no_conversation","label":"Wrong person or no real conversation"}]',
 8)

on conflict (id) do update set
  name = excluded.name,
  purpose = excluded.purpose,
  prospect_says = excluded.prospect_says,
  tap_options = excluded.tap_options,
  sort_order = excluded.sort_order;
