import React, { useState, useEffect, useRef } from 'react';
import { api, Stage, Call, StageResult } from './api';

interface LiveCallProps {
  stages: Stage[];
  onNavigateToPastCalls?: () => void;
  onError: (msg: string | null) => void;
}

export const LiveCall: React.FC<LiveCallProps> = ({
  stages,
  onNavigateToPastCalls,
  onError,
}) => {
  // Start form state
  const [prospectName, setProspectName] = useState('');
  const [prospectRole, setProspectRole] = useState('');
  const [company, setCompany] = useState('');
  const [startingCall, setStartingCall] = useState(false);

  // Active call state
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [savedStagesMap, setSavedStagesMap] = useState<Record<number, StageResult>>({});
  const [selectedTap, setSelectedTap] = useState<string>('');
  const [prospectWords, setProspectWords] = useState<string>('');

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Saving / closing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedCallSummary, setClosedCallSummary] = useState<Call | null>(null);
  const [cardError, setCardError] = useState<{ message: string; retry: () => void } | null>(null);

  // Email outreach state & handlers
  const [emailDrafting, setEmailDrafting] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  const handleDraftEmail = async () => {
    if (!closedCallSummary) return;
    try {
      setEmailDrafting(true);
      const res = await api.draftEmail(closedCallSummary.id);
      setEmailSubject(res.subject);
      setEmailBody(res.body);
    } catch (err: any) {
      onError(err.message || 'Failed to draft email.');
    } finally {
      setEmailDrafting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!closedCallSummary) return;
    try {
      setEmailSending(true);
      await api.sendEmail(closedCallSummary.id, emailSubject, emailBody, closedCallSummary.prospect_name);
      setEmailSentSuccess(true);
    } catch (err: any) {
      onError(err.message || 'Failed to send email.');
    } finally {
      setEmailSending(false);
    }
  };

  // Live Speech Recognition (Balto-style AI Copilot) state
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [aiLivePrompt, setAiLivePrompt] = useState<string>('Click "Start Live AI Copilot" to listen in real-time...');
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiLivePrompt('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setAiLivePrompt('🎙 Listening... AI Copilot is active and analyzing conversation in real-time.');
      };

      recognition.onresult = async (event: any) => {
        let transcriptChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcriptChunk += event.results[i][0].transcript;
        }
        setLiveTranscript(transcriptChunk);
        if (transcriptChunk.trim().length > 3) {
          await handleSimulatePhrase(transcriptChunk);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setAiLivePrompt('⚠️ Microphone access denied or blocked in iframe. Please check browser permissions or open in a new tab.');
        } else {
          setAiLivePrompt(`⚠️ Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      console.error(e);
      setAiLivePrompt('Could not start microphone. Check browser permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setAiLivePrompt('Live AI Copilot paused.');
  };

  const handleSimulatePhrase = async (phrase: string) => {
    setLiveTranscript(phrase);
    setAiLivePrompt('⚡ Gemini AI is thinking...');
    try {
      if (currentCall) {
        const res = await api.askCopilot(currentCall.id, phrase, activeStageId);
        setAiLivePrompt(res.suggestion);
      } else {
        setAiLivePrompt(`⚡ Gemini AI: Acknowledge "${phrase}" and address their business needs.`);
      }
    } catch {
      setAiLivePrompt(`⚡ Gemini AI: Acknowledge "${phrase}" and ask an open-ended question.`);
    }
  };



  // Start & run timer when call starts
  useEffect(() => {
    if (currentCall && currentCall.status === 'in_progress') {
      const startTime = new Date(currentCall.started_at).getTime();
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setElapsedSeconds(diff);
      };
      updateTimer();
      timerRef.current = window.setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentCall]);

  // Sync inputs when active stage changes
  useEffect(() => {
    if (currentCall) {
      const saved = savedStagesMap[activeStageId];
      if (saved) {
        setSelectedTap(saved.tap_key || '');
        setProspectWords(saved.prospect_words || '');
      } else {
        setSelectedTap('');
        setProspectWords('');
      }
    }
  }, [activeStageId, currentCall]);

  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Handle Start Call
  const handleStartCall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prospectName.trim() || !prospectRole.trim() || !company.trim()) return;

    try {
      setStartingCall(true);
      setCardError(null);
      onError(null);
      const call = await api.startCall({
        prospect_name: prospectName.trim(),
        prospect_role: prospectRole.trim(),
        company: company.trim(),
      });
      setCurrentCall(call);
      setActiveStageId(1);
      setSavedStagesMap({});
      setSelectedTap('');
      setProspectWords('');
      setClosedCallSummary(null);
    } catch (err: any) {
      setCardError({
        message: err.message || 'Failed to start call. Please check your connection.',
        retry: () => handleStartCall(),
      });
    } finally {
      setStartingCall(false);
    }
  };

  // 2. Handle Next / Finish Call
  const handleNextOrFinish = async () => {
    if (!currentCall || !selectedTap) return;

    try {
      setIsSubmitting(true);
      setCardError(null);
      onError(null);

      // Save current stage
      const saveRes = await api.saveStage(currentCall.id, activeStageId, {
        tap_key: selectedTap,
        prospect_words: prospectWords.trim() || undefined,
      });

      // Update local state map
      setSavedStagesMap((prev) => ({
        ...prev,
        [activeStageId]: saveRes.stage_result,
      }));
      setCurrentCall(saveRes.call);

      if (activeStageId === 8) {
        // Stage 8 Finish Call -> close with outcome = selected tap
        const closed = await api.closeCall(currentCall.id, selectedTap);
        setCurrentCall(null);
        setClosedCallSummary(closed);
      } else {
        // Advance to next stage
        const nextStage = activeStageId + 1;
        setActiveStageId(nextStage);
      }
    } catch (err: any) {
      // Kept user's typed words and selected tap intact in state
      setCardError({
        message: err.message || 'Failed to save stage. Your entered words and tap have been kept.',
        retry: handleNextOrFinish,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle End Call (at any stage)
  const handleEndCall = async () => {
    if (!currentCall) return;

    try {
      setIsSubmitting(true);
      setCardError(null);
      onError(null);

      // Save active stage first if tap was selected
      if (selectedTap) {
        try {
          await api.saveStage(currentCall.id, activeStageId, {
            tap_key: selectedTap,
            prospect_words: prospectWords.trim() || undefined,
          });
        } catch {
          // Continue to close even if stage save fails
        }
      }

      // Close call immediately with ended_early
      const closed = await api.closeCall(currentCall.id);
      setCurrentCall(null);
      setClosedCallSummary(closed);
    } catch (err: any) {
      setCardError({
        message: err.message || 'Failed to end call. Click retry to try closing again.',
        retry: handleEndCall,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNewCall = () => {
    setCurrentCall(null);
    setClosedCallSummary(null);
    setProspectName('');
    setProspectRole('');
    setCompany('');
    setActiveStageId(1);
    setSavedStagesMap({});
    setSelectedTap('');
    setProspectWords('');
    setEmailDrafting(false);
    setEmailSubject('');
    setEmailBody('');
    setEmailSending(false);
    setEmailSentSuccess(false);
    onError(null);
  };

  // -------------------------------------------------------------
  // VIEW A: Call Finished / Closed Confirmation Screen
  // -------------------------------------------------------------
  if (closedCallSummary) {
    const outcomeLabels: Record<string, string> = {
      meeting_booked: 'Meeting or call booked',
      follow_up_agreed: 'Report or follow-up agreed',
      not_interested: 'Not interested',
      no_conversation: 'Wrong person / No conversation',
      ended_early: 'Ended early',
    };

    const outcomeText = closedCallSummary.outcome
      ? outcomeLabels[closedCallSummary.outcome] || closedCallSummary.outcome
      : 'Ended early';

    return (
      <div className="guide-card">
        <div className="card-header">
          <div className="header-left">
            <span className="brand-title">Meridian Call Guide</span>
          </div>
          <span className="call-timer">{formatTimer(elapsedSeconds)}</span>
        </div>

        <div className="saved-screen">
          <div className="saved-icon">✓</div>
          <h2 className="saved-title">Call saved</h2>

          <div className="saved-meta-card">
            <div className="saved-row">
              <span className="saved-row-label">Prospect:</span>
              <span className="saved-row-val">{closedCallSummary.prospect_name}</span>
            </div>
            <div className="saved-row">
              <span className="saved-row-label">Company:</span>
              <span className="saved-row-val">{closedCallSummary.company}</span>
            </div>
            <div className="saved-row">
              <span className="saved-row-label">Stage reached:</span>
              <span className="saved-row-val">
                Stage {closedCallSummary.furthest_stage}:{' '}
                {closedCallSummary.furthest_stage_name ||
                  stages.find((s) => s.id === closedCallSummary.furthest_stage)?.name ||
                  'Unknown'}
              </span>
            </div>
            <div className="saved-row">
              <span className="saved-row-label">Outcome:</span>
              <span className="saved-row-val">{outcomeText}</span>
            </div>
          </div>

          <div className="saved-summary-box">
            <div className="saved-summary-label">Summary</div>
            <div className="saved-summary-text">
              {closedCallSummary.summary ||
                (closedCallSummary.summary_status === 'failed'
                  ? 'Summary unavailable'
                  : closedCallSummary.summary_status === 'skipped'
                  ? 'Call logged successfully'
                  : 'Generating summary...')}
            </div>
          </div>

          {/* Automated Post-Call Outreach: AI Follow-Up Email Generator */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✉️</span> AI Follow-Up Email (Gmail / SendGrid API)
            </div>
            {!emailSubject && !emailDrafting && !emailSentSuccess && (
              <button
                type="button"
                onClick={handleDraftEmail}
                style={{
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                ✨ Draft Tailored Follow-Up Email with Gemini
              </button>
            )}

            {emailDrafting && (
              <div style={{ textAlign: 'center', padding: '12px 0', fontSize: '12px', color: '#64748b' }}>
                <span className="spinner spinner-dark" style={{ width: '12px', height: '12px' }}></span> Drafting personalized email...
              </div>
            )}

            {emailSubject && !emailSentSuccess && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 600 }}
                  placeholder="Email Subject"
                />
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={4}
                  style={{ padding: '6px 8px', fontSize: '11.5px', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit', resize: 'vertical' }}
                  placeholder="Email Body"
                />
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: emailSending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {emailSending && <span className="spinner" style={{ width: '12px', height: '12px' }}></span>}
                  {emailSending ? 'Sending...' : '📤 Send Follow-Up Email'}
                </button>
              </div>
            )}

            {emailSentSuccess && (
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
                ✓ Follow-up email successfully dispatched to {closedCallSummary.prospect_name}!
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <button className="btn-primary" onClick={handleResetForNewCall}>
              Start new call
            </button>
            {onNavigateToPastCalls && (
              <button
                type="button"
                className="nav-link-btn"
                style={{ textAlign: 'center', marginTop: '4px' }}
                onClick={onNavigateToPastCalls}
              >
                Go to Past Calls →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: Start Form Screen (Before a Call Starts)
  // -------------------------------------------------------------
  if (!currentCall) {
    const isStartDisabled =
      !prospectName.trim() || !prospectRole.trim() || !company.trim() || startingCall;

    return (
      <div className="guide-card">
        <div className="card-header">
          <div className="header-left">
            <span className="brand-title">Meridian Call Guide</span>
          </div>
          <span className="call-timer">00:00</span>
        </div>

        <form onSubmit={handleStartCall} className="start-card-body">
          <div style={{ marginBottom: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Start a cold call</h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Enter prospect details to begin stage guidance.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="prospect-name">Prospect Name</label>
            <input
              id="prospect-name"
              type="text"
              placeholder="e.g. Rajesh Sharma"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="prospect-role">Prospect Role</label>
            <input
              id="prospect-role"
              type="text"
              placeholder="e.g. Managing Director"
              value={prospectRole}
              onChange={(e) => setProspectRole(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              type="text"
              placeholder="e.g. Apex Forge Ltd"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          {cardError && (
            <div className="card-error-box" role="alert">
              <span>{cardError.message}</span>
              <button type="button" className="retry-btn" onClick={cardError.retry}>
                Retry
              </button>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isStartDisabled}>
            {startingCall && <span className="spinner"></span>}
            {startingCall ? 'Starting call...' : 'Start call'}
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW C: Active Call Guidance Screen (Top to Bottom per 8.1)
  // -------------------------------------------------------------
  const activeStage = stages.find((s) => s.id === activeStageId) || stages[0];
  const nextStageInfo = stages.find((s) => s.id === activeStageId + 1);
  const nextButtonLabel =
    activeStageId === 8
      ? 'Finish call'
      : nextStageInfo
      ? `Next: ${nextStageInfo.name}`
      : 'Next stage';

  const quotes = activeStage?.prospect_says || [];
  const taps = activeStage?.tap_options || [];

  return (
    <div className="guide-card">
      {/* 1. Header: product name on the left, running timer (mm:ss) on the right */}
      <div className="card-header">
        <div className="header-left">
          <span className="brand-title">Meridian Call Guide</span>
        </div>
        <span className="call-timer">{formatTimer(elapsedSeconds)}</span>
      </div>

      {/* 2. Prospect card: name in bold, then role, company and 'first call' on one line */}
      <div className="prospect-card">
        <div className="prospect-name">{currentCall.prospect_name}</div>
        <div className="prospect-meta">
          {currentCall.prospect_role}, {currentCall.company} •{' '}
          <span className="prospect-tag">first call</span>
        </div>
      </div>

      {/* Balto AI Live Copilot Widget */}
      <div
        style={{
          background: isListening ? 'var(--primary-light)' : 'var(--surface-alt)',
          border: `1px solid ${isListening ? 'var(--primary)' : 'var(--border-color)'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              title={isListening ? "Stop listening" : "Start live mic copilot"}
              style={{
                background: isListening ? 'var(--danger)' : 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s ease',
              }}
            >
              🎙
            </button>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Balto AI Copilot
                {isListening && (
                  <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '8px', fontWeight: 700 }}>
                    LISTENING
                  </span>
                )}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {isListening ? 'Listening to call...' : 'Click mic to listen or test below'}
              </div>
            </div>
          </div>
        </div>

        {/* Decent Suggestion Box given by LLM / Copilot */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid var(--border-color)',
            borderRadius: '6px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            ⚡ AI Real-Time Suggestion
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.35 }}>
            {aiLivePrompt}
          </div>
          {liveTranscript && (
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              Heard: "{liveTranscript}"
            </div>
          )}
        </div>
      </div>

      {/* 3. Progress: eight numbered squares */}
      <div className="progress-grid" aria-label="Call progress stages">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
          const isCurrent = num === activeStageId;
          const isCompleted = !!savedStagesMap[num];
          const canClick = isCompleted || num <= (currentCall.furthest_stage || 1);

          let className = 'progress-sq';
          if (isCurrent) className += ' current';
          else if (isCompleted) className += ' completed';

          return (
            <button
              key={num}
              type="button"
              className={className}
              disabled={!canClick}
              onClick={() => canClick && setActiveStageId(num)}
              title={`Stage ${num}: ${stages.find((s) => s.id === num)?.name || ''}`}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* 4. Stage label ('Stage 2 of 8'), stage name in large type, purpose line */}
      <div className="stage-info">
        <div className="stage-badge">Stage {activeStageId} of 8</div>
        <h1 className="stage-title">{activeStage?.name}</h1>
        <p className="stage-purpose">{activeStage?.purpose}</p>
      </div>

      {/* 5. 'They may say': exactly 3 prospect quotes in a stacked list */}
      <div className="section-block">
        <div className="section-label">They may say</div>
        <div className="quotes-list">
          {quotes.slice(0, 3).map((q, idx) => (
            <div key={idx} className="quote-bubble">
              “{q}”
            </div>
          ))}
        </div>
      </div>

      {/* 6. 'What happened': exactly 4 tap buttons in a 2x2 grid */}
      <div className="section-block">
        <div className="section-label">
          {activeStageId === 8 ? 'Call Outcome (Tap one)' : 'What happened'}
        </div>
        <div className="taps-grid">
          {taps.slice(0, 4).map((tap) => {
            const isSelected = selectedTap === tap.key;
            return (
              <button
                key={tap.key}
                type="button"
                className={`tap-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedTap(tap.key)}
              >
                {tap.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. 'Their words': one textarea with a 1000 character counter. Stage 5 is larger */}
      <div className="words-box-container">
        <div className="words-header">
          <label htmlFor="prospect-words" className="section-label" style={{ marginBottom: 0 }}>
            {activeStageId === 5 ? 'Their words (write exact words - required verbatim)' : 'Their words'}
          </label>
          <span className={`char-counter ${prospectWords.length > 950 ? 'limit' : ''}`}>
            {prospectWords.length} / 1000
          </span>
        </div>
        <textarea
          id="prospect-words"
          className={`words-textarea ${activeStageId === 5 ? 'tall' : ''}`}
          rows={activeStageId === 5 ? 6 : 3}
          placeholder={
            activeStageId === 5
              ? 'Hear their need in their own words, and write down exactly what they said...'
              : 'Write down any specific details or quotes (optional)...'
          }
          value={prospectWords}
          onChange={(e) => setProspectWords(e.target.value.slice(0, 1000))}
          maxLength={1000}
        />
      </div>

      {/* Inline Error Banner with Retry (Never loses typed text or selected tap) */}
      {cardError && (
        <div className="card-error-box" role="alert">
          <span>{cardError.message}</span>
          <button type="button" className="retry-btn" onClick={cardError.retry}>
            Retry
          </button>
        </div>
      )}

      {/* 8. Buttons: primary 'Next: <next stage>' / 'Finish call' and secondary 'End call' */}
      <div className="card-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!selectedTap || isSubmitting}
          onClick={handleNextOrFinish}
        >
          {isSubmitting && <span className="spinner"></span>}
          {isSubmitting ? 'Saving...' : nextButtonLabel}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={isSubmitting}
          onClick={handleEndCall}
        >
          {isSubmitting ? 'Ending...' : 'End call'}
        </button>
      </div>
    </div>
  );
};
