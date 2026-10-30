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
