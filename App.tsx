import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { Login } from './components/Login';
import { analyzeDocuments } from './services/geminiService';
import { fileToBase64, validateFilesSize } from './utils/fileUtils';
import type { AnalysisResult, UploadedFile } from './types';

// 2024 Federal Poverty Level guidelines (48 contiguous states + DC)
const FPL_BASE: Record<number, number> = {
  1: 15060, 2: 20440, 3: 25820, 4: 31200,
  5: 36580, 6: 41960, 7: 47340, 8: 52720,
};
const FPL_ADDITIONAL = 5380;

const getPovertyThreshold = (householdSize: number): number => {
  const base = householdSize <= 8
    ? FPL_BASE[householdSize]
    : FPL_BASE[8] + (FPL_ADDITIONAL * (householdSize - 8));
  return base * 2; // 200% FPL
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Auth helper
export const getAuthToken = () => sessionStorage.getItem('income_verifier_token');

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    sessionStorage.removeItem('income_verifier_token');
    window.location.reload();
    throw new Error('Session expired');
  }

  return res;
};

const App: React.FC = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [householdSize, setHouseholdSize] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session
  useEffect(() => {
    const token = sessionStorage.getItem('income_verifier_token');
    if (token) setAuthenticated(true);
  }, []);

  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('income_verifier_token', data.token);
        setAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('income_verifier_token');
    setAuthenticated(false);
  };

  const handleFilesChange = useCallback((selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyzeClick = async () => {
    if (files.length === 0) {
      setError("Please upload at least one document.");
      return;
    }

    if (householdSize < 1 || householdSize > 20) {
      setError("Please enter a valid household size (1-20).");
      return;
    }

    const sizeValidation = validateFilesSize(files);
    if (!sizeValidation.valid) {
      const sizeMB = (sizeValidation.totalSize / (1024 * 1024)).toFixed(2);
      setError(`Files are too large (${sizeMB} MB). Please reduce file size or number of files.`);
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const uploadedFiles: UploadedFile[] = await Promise.all(
        files.map(file => fileToBase64(file))
      );

      const analysisResult = await analyzeDocuments(uploadedFiles, householdSize);
      setResult(analysisResult);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setHouseholdSize(1);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        {/* Header */}
        <header style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="heading-display">Income Verification</h1>
              <p className="text-body mt-sm">
                Upload income documents to determine FPL eligibility
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main card */}
        <div className="card">
          {!result ? (
            <>
              {/* Upload section */}
              <div>
                <label className="heading-section mb-md" style={{ display: 'block' }}>
                  Documents
                </label>
                <FileUpload onFilesChange={handleFilesChange} disabled={isLoading} />
              </div>

              <div className="divider" />

              {/* Household size */}
              <div>
                <label htmlFor="household-size" className="label">
                  Household Size
                </label>
                <input
                  type="number"
                  id="household-size"
                  min="1"
                  max="20"
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
                  disabled={isLoading}
                  className="input input-number"
                />
                <p className="text-small mt-sm">
                  Total number of people in the household (1-20)
                </p>
              </div>

              {/* Income threshold info */}
              <div className="threshold-box">
                <div className="threshold-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Income Eligibility Threshold</span>
                </div>
                <div className="threshold-value">
                  {formatCurrency(getPovertyThreshold(householdSize))}
                  <span className="threshold-label">annual gross income</span>
                </div>
                <p className="threshold-note">
                  For a household of {householdSize}, income must be at or below this amount (200% of the Federal Poverty Level) to qualify.
                </p>
              </div>

              <div className="divider" />

              {/* Submit */}
              <button
                onClick={handleAnalyzeClick}
                disabled={isLoading || files.length === 0}
                className="btn btn-primary btn-full"
              >
                {isLoading ? 'Analyzing...' : 'Analyze Documents'}
              </button>

              {/* Loading / Error states */}
              {isLoading && (
                <div className="mt-xl">
                  <Loader />
                </div>
              )}

              {error && (
                <div className="alert alert-error mt-lg">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              <ResultDisplay result={result} />
              <div className="mt-xl">
                <button
                  onClick={handleReset}
                  className="btn btn-secondary btn-full"
                >
                  Analyze Another Document
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-xl">
          <p className="text-small">
            For internal use only. Results should be verified by staff.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
