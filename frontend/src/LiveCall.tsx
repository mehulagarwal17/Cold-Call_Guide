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
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Saving / closing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedCallSummary, setClosedCallSummary] = useState<Call | null>(null);
  const [cardError, setCardError] = useState<{ message: string; retry: () => void } | null>(null);

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

      recognition.onresult = (event: any) => {
        let transcriptChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcriptChunk += event.results[i][0].transcript;
        }
        setLiveTranscript(transcriptChunk);

        // Real-time keyword & phrase analysis (Balto-style prompts & stage guidance)
        const lower = transcriptChunk.toLowerCase();
        if (lower.includes('who') || lower.includes('calling') || lower.includes('where')) {
          setActiveStageId(2);
          setAiLivePrompt('💡 Copilot: Prospect asked who is calling. State your company & purpose clearly.');
        } else if (lower.includes('email') || lower.includes('whatsapp') || lower.includes('send me') || lower.includes('drop me')) {
          setActiveStageId(3);
          setAiLivePrompt('💡 Copilot: Permission requested! Agree to send a quick WhatsApp or email summary.');
        } else if (lower.includes('price') || lower.includes('cost') || lower.includes('expensive') || lower.includes('budget') || lower.includes('charge')) {
          setActiveStageId(6);
          setAiLivePrompt('💡 Copilot: Price objection! Isolate cost vs. value and ask what their current loss is.');
        } else if (lower.includes('competitor') || lower.includes('already use') || lower.includes('vendor')) {
          setActiveStageId(6);
          setAiLivePrompt('💡 Copilot: Competitor mentioned. Acknowledge and ask what they wish was faster.');
        } else if (lower.includes('problem') || lower.includes('issue') || lower.includes('delay') || lower.includes('time') || lower.includes('hours') || lower.includes('weeks')) {
          setActiveStageId(5);
          setAiLivePrompt('💡 Copilot: Pain point detected! Type this exact quote into "Their words" in Stage 5.');
        } else if (lower.includes('meeting') || lower.includes('demo') || lower.includes('call me on') || lower.includes('schedule')) {
          setActiveStageId(8);
          setAiLivePrompt('💡 Copilot: Closing signal detected! Move to Stage 8 to book the meeting.');
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

  const handleSimulatePhrase = (phrase: string) => {
    setLiveTranscript(phrase);
    const lower = phrase.toLowerCase();
    if (lower.includes('who') || lower.includes('calling') || lower.includes('where')) {
      setActiveStageId(2);
      setAiLivePrompt('💡 Copilot: Prospect asked who is calling. State your company & purpose clearly.');
    } else if (lower.includes('email') || lower.includes('whatsapp') || lower.includes('send me') || lower.includes('drop me')) {
      setActiveStageId(3);
      setAiLivePrompt('💡 Copilot: Permission requested! Agree to send a quick WhatsApp or email summary.');
    } else if (lower.includes('price') || lower.includes('cost') || lower.includes('expensive') || lower.includes('budget') || lower.includes('charge')) {
      setActiveStageId(6);
      setAiLivePrompt('💡 Copilot: Price objection! Isolate cost vs. value and ask what their current loss is.');
    } else if (lower.includes('competitor') || lower.includes('already use') || lower.includes('vendor')) {
      setActiveStageId(6);
      setAiLivePrompt('💡 Copilot: Competitor mentioned. Acknowledge and ask what they wish was faster.');
    } else if (lower.includes('problem') || lower.includes('issue') || lower.includes('delay') || lower.includes('time') || lower.includes('hours') || lower.includes('weeks')) {
      setActiveStageId(5);
      setAiLivePrompt('💡 Copilot: Pain point detected! Type this exact quote into "Their words" in Stage 5.');
    } else if (lower.includes('meeting') || lower.includes('demo') || lower.includes('call me on') || lower.includes('schedule')) {
      setActiveStageId(8);
      setAiLivePrompt('💡 Copilot: Closing signal detected! Move to Stage 8 to book the meeting.');
    } else {
      setAiLivePrompt(`💡 Copilot analyzed: "${phrase}". Keep probing their needs.`);
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
      setGeneralNotes('');
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
        // Stage 8 Finish Call -> close with outcome = selected tap and persistent general notes
        const closed = await api.closeCall(currentCall.id, selectedTap, generalNotes);
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

      // Close call immediately with ended_early and persistent general notes
      const closed = await api.closeCall(currentCall.id, undefined, generalNotes);
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
    setGeneralNotes('');
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

      {/* Balto-Style Live AI Speech Copilot Bar */}
      <div
        style={{
          background: isListening ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${isListening ? '#86efac' : '#e2e8f0'}`,
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>{isListening ? '🟢' : '🎙'}</span>
            <strong style={{ fontSize: '13px', color: '#0f172a' }}>Balto AI Live Copilot</strong>
            {isListening && (
              <span
                style={{
                  fontSize: '10px',
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  animation: 'pulse 1.5s infinite',
                }}
              >
                LISTENING LIVE
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            style={{
              background: isListening ? '#dc2626' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            {isListening ? 'Stop Listening' : '🎙 Start Live AI Copilot'}
          </button>
        </div>

        <div
          style={{
            fontSize: '12.5px',
            color: '#334155',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '8px 10px',
            lineHeight: 1.4,
          }}
        >
          {aiLivePrompt}
        </div>

        {liveTranscript && (
          <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', maxHeight: '40px', overflowY: 'auto' }}>
            <strong>Heard:</strong> "{liveTranscript}"
          </div>
        )}

        {/* Quick Test / Simulate Prospect Speech buttons for iframe environments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Simulate Prospect Speech (Instant AI Copilot Test):</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              'Who is calling?',
              'Send me an email',
              'Too expensive',
              'Already use a competitor',
              'Delivery takes 3 weeks',
              'Let\'s schedule a demo'
            ].map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSimulatePhrase(phrase)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  borderRadius: '12px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                "{phrase}"
              </button>
            ))}
          </div>
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

      {/* Persistent General Call Notes Section (persists across stages until call ends) */}
      <div className="words-box-container" style={{ marginTop: '8px' }}>
        <div className="words-header">
          <label htmlFor="general-notes" className="section-label" style={{ marginBottom: 0 }}>
            General Call Notes <span style={{ fontWeight: 400, color: '#64748b', fontSize: '11px' }}>(persists across all stages)</span>
          </label>
          <span className={`char-counter ${generalNotes.length > 1900 ? 'limit' : ''}`}>
            {generalNotes.length} / 2000
          </span>
        </div>
        <textarea
          id="general-notes"
          className="words-textarea"
          rows={2}
          style={{ minHeight: '50px', fontSize: '12.5px' }}
          placeholder="Overall notes about this prospect, background context, or key takeaways (persists until call finishes)..."
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value.slice(0, 2000))}
          maxLength={2000}
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
