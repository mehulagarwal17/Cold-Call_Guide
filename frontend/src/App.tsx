import React, { useState, useEffect } from 'react';
import { api, Stage, getApiBaseUrl, setApiBaseUrl } from './api';
import { LiveCall } from './LiveCall';
import { PastCalls } from './PastCalls';
import './styles.css';

export default function App() {
  // Sync tab with pathname: '/' -> 'live', '/calls' -> 'past'
  const getInitialTab = (): 'live' | 'past' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/calls') || window.location.hash === '#calls') {
        return 'past';
      }
    }
    return 'live';
  };

  const [currentTab, setCurrentTab] = useState<'live' | 'past'>(getInitialTab);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState<string>(getApiBaseUrl());
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/calls') || window.location.hash === '#calls') {
        setCurrentTab('past');
      } else {
        setCurrentTab('live');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (tab: 'live' | 'past') => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath = tab === 'past' ? '/calls' : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  };

  const initBackendAndStages = async () => {
    setGlobalError(null);
    setIsWakingServer(true);

    try {
      // 1. Health check to wake the Render free-tier server
      await api.getHealth();
      setIsWakingServer(false);

      // 2. Fetch the 8 stages
      const stagesData = await api.getStages();
      setStages(stagesData);
    } catch (err: any) {
      setIsWakingServer(false);
      setGlobalError(
        err.message || 'Could not connect to backend. Please verify your backend server URL.'
      );
    }
  };

  useEffect(() => {
    initBackendAndStages();
  }, []);

  const handleUpdateApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiEndpoint);
    initBackendAndStages();
  };

  return (
    <div className="app-viewport">
      {/* Top Nav Switcher */}
      <nav className="nav-bar">
        <div style={{ display: 'flex', gap: '14px' }}>
          <a
            href="/"
            className="nav-link-btn"
            style={{
              fontWeight: currentTab === 'live' ? '800' : '500',
              textDecoration: currentTab === 'live' ? 'underline' : 'none',
              color: currentTab === 'live' ? '#2563eb' : '#64748b',
            }}
            onClick={(e) => {
              e.preventDefault();
              navigateTo('live');
            }}
          >
            Live Call
          </a>
          <a
            href="/calls"
            className="nav-link-btn"
            style={{
              fontWeight: currentTab === 'past' ? '800' : '500',
              textDecoration: currentTab === 'past' ? 'underline' : 'none',
              color: currentTab === 'past' ? '#2563eb' : '#64748b',
            }}
            onClick={(e) => {
              e.preventDefault();
              navigateTo('past');
            }}
          >
            Past Calls
          </a>
        </div>
        <button
          type="button"
          className="nav-link-btn"
          style={{ fontSize: '11px', textDecoration: 'none', color: '#64748b' }}
          onClick={() => setShowConfig(!showConfig)}
        >
          ⚙ API: {apiEndpoint ? apiEndpoint.replace(/^https?:\/\//, '').slice(0, 16) + '...' : 'default proxy'}
        </button>
      </nav>

      {/* Discreet API Base URL Config (if toggled) */}
      {showConfig && (
        <form
          onSubmit={handleUpdateApiUrl}
          style={{
            width: '100%',
            maxWidth: '410px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <label style={{ fontWeight: 600, color: '#334155' }}>Backend API URL:</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="Leave empty for local proxy or enter https://..."
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Render Server Waking Banner (Section 8.3) */}
      {isWakingServer && (
        <div className="server-banner" role="status">
          <span className="spinner spinner-dark"></span>
          <span>Waking the server, this can take up to a minute</span>
        </div>
      )}

      {/* Global Error Banner with Retry (Section 8.3) */}
      {globalError && (
        <div className="error-banner" role="alert">
          <span>{globalError}</span>
          <button type="button" onClick={initBackendAndStages}>
            Retry
          </button>
        </div>
      )}

      {/* Screen 1: Live Call (route /) */}
      {currentTab === 'live' && (
        <LiveCall
          stages={stages}
          onNavigateToPastCalls={() => navigateTo('past')}
          onError={(msg) => setGlobalError(msg)}
        />
      )}

      {/* Screen 2: Past Calls (route /calls) */}
      {currentTab === 'past' && (
        <PastCalls
          stages={stages}
          onStartNewCall={() => navigateTo('live')}
          onError={(msg) => setGlobalError(msg)}
        />
      )}
    </div>
  );
}
