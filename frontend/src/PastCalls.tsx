import React, { useState, useEffect } from 'react';
import { api, Call, Stage, StageResult } from './api';

interface PastCallsProps {
  stages: Stage[];
  onStartNewCall: () => void;
  onError: (msg: string | null) => void;
}

export const PastCalls: React.FC<PastCallsProps> = ({
  stages,
  onStartNewCall,
  onError,
}) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedCallDetail, setSelectedCallDetail] = useState<Call | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Load all calls newest first
  const loadCalls = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      onError(null);
      const data = await api.getCalls();
      setCalls(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to load past calls.';
      setFetchError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  // When a row is clicked, fetch full detail with stage results
  const handleSelectCall = async (callId: string) => {
    try {
      setSelectedCallId(callId);
      setLoadingDetail(true);
      onError(null);
      const detail = await api.getCall(callId);
      setSelectedCallDetail(detail);
    } catch (err: any) {
      onError(err.message || 'Failed to load call details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setSelectedCallId(null);
    setSelectedCallDetail(null);
  };

  const formatDateTime = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getTapLabel = (stageId: number, tapKey?: string | null): string => {
    if (!tapKey) return 'No tap recorded';
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return tapKey;
    const opt = stage.tap_options.find((o) => o.key === tapKey);
    return opt ? opt.label : tapKey;
  };

  const outcomeLabels: Record<string, string> = {
    meeting_booked: 'Meeting booked',
    follow_up_agreed: 'Follow-up agreed',
    not_interested: 'Not interested',
    no_conversation: 'No conversation',
    ended_early: 'Ended early',
  };

  // -------------------------------------------------------------
  // DETAIL VIEW: Read-only call view with each stage's tap & words
  // -------------------------------------------------------------
  if (selectedCallId) {
    if (loadingDetail || !selectedCallDetail) {
      return (
        <div className="guide-card" style={{ padding: '24px 16px', textAlign: 'center' }}>
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <span className="brand-title">Call Details</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Loading stage results...</p>
        </div>
      );
    }

    const stageResults = selectedCallDetail.stage_results || [];

    return (
      <div className="guide-card">
        <div className="card-header">
          <button
            type="button"
            className="nav-link-btn"
            style={{ color: '#38bdf8', textDecoration: 'none', padding: 0 }}
            onClick={handleBackToList}
          >
            ← Back to Past Calls
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {formatDateTime(selectedCallDetail.started_at)}
          </span>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Prospect Header */}
          <div className="prospect-card" style={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div className="prospect-name">{selectedCallDetail.prospect_name}</div>
            <div className="prospect-meta">
              {selectedCallDetail.prospect_role}, {selectedCallDetail.company}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                Reached: {selectedCallDetail.furthest_stage_name?.toUpperCase() || `STAGE ${selectedCallDetail.furthest_stage}`}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#f1f5f9',
                  color: '#334155',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                Outcome: {selectedCallDetail.outcome ? outcomeLabels[selectedCallDetail.outcome] || selectedCallDetail.outcome : 'In progress'}
              </span>
            </div>
          </div>

          {/* One-line summary */}
          <div className="saved-summary-box">
            <div className="saved-summary-label">Summary</div>
            <div className="saved-summary-text">
              {selectedCallDetail.summary ||
                (selectedCallDetail.summary_status === 'failed'
                  ? 'Summary unavailable'
                  : selectedCallDetail.summary_status === 'skipped'
                  ? 'Call logged'
                  : 'Pending summary...')}
            </div>
          </div>

          {/* Stage by stage results */}
          <div>
            <div className="section-label" style={{ marginBottom: '8px' }}>
              Stage History ({stageResults.length} stages saved)
            </div>

            {stageResults.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                No stage taps were recorded for this call.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stageResults.map((sr) => {
                  const stageObj = stages.find((s) => s.id === sr.stage_id);
                  const stageName = stageObj?.name || `Stage ${sr.stage_id}`;
                  const tapLabel = getTapLabel(sr.stage_id, sr.tap_key);

                  return (
                    <div
                      key={sr.stage_id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>
                          Stage {sr.stage_id}: {stageName}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600 }}>
                        Tap: {tapLabel}
                      </div>
                      {sr.prospect_words && (
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: '#334155',
                            background: '#ffffff',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            marginTop: '2px',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#64748b' }}>Their words: </span>
                          "{sr.prospect_words}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '8px' }}
            onClick={onStartNewCall}
          >
            Start a new call
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LIST VIEW: One row per call, newest first (Section 8.2)
  // -------------------------------------------------------------
  return (
    <div className="guide-card">
      <div className="card-header">
        <div className="header-left">
          <span className="brand-title">Past Calls</span>
        </div>
        <button
          type="button"
          onClick={loadCalls}
          style={{
            background: 'none',
            border: 'none',
            color: '#38bdf8',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
            <span className="spinner spinner-dark"></span>
            <span>Loading calls...</span>
          </div>
        ) : fetchError ? (
          <div className="card-error-box" role="alert" style={{ margin: '16px 0' }}>
            <span>{fetchError}</span>
            <button type="button" className="retry-btn" onClick={loadCalls}>
              Retry
            </button>
          </div>
        ) : calls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>No calls yet</p>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>
              Calls saved from the Live Call screen will appear here.
            </p>
            <button type="button" className="btn-primary" onClick={onStartNewCall}>
              Start your first call
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {calls.map((c) => {
              const summaryText =
                c.summary ||
                (c.summary_status === 'failed'
                  ? 'Summary unavailable'
                  : c.outcome
                  ? `Outcome: ${outcomeLabels[c.outcome] || c.outcome}`
                  : 'In progress');

              const stageReachedName = (
                c.furthest_stage_name ||
                stages.find((s) => s.id === c.furthest_stage)?.name ||
                `STAGE ${c.furthest_stage}`
              ).toUpperCase();

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCall(c.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#93c5fd')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  {/* Left: name and company in bold, with one-line summary underneath (blank for now) */}
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <div style={{ fontSize: '14px', lineHeight: 1.25 }}>
                      <strong>{c.prospect_name}</strong>, <strong>{c.company}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: c.summary ? '#1e293b' : c.summary_status === 'failed' ? '#dc2626' : '#64748b',
                        fontStyle: c.summary_status === 'failed' ? 'italic' : 'normal',
                        marginTop: '3px',
                        lineHeight: 1.3,
                        minHeight: '16px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '220px',
                      }}
                      title={c.summary || (c.summary_status === 'failed' ? 'Summary unavailable' : '')}
                    >
                      {c.summary
                        ? c.summary
                        : c.summary_status === 'failed'
                        ? 'Summary unavailable'
                        : c.summary_status === 'pending'
                        ? 'Generating summary...'
                        : ''}
                    </div>
                  </div>

                  {/* Right: Stage reached in capitals, date/time under it */}
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0369a1',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {stageReachedName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                      {formatDateTime(c.started_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
