
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { analyzeDocuments } from './services/geminiService';
import { fileToBase64, validateFilesSize } from './utils/fileUtils';
import type { AnalysisResult, UploadedFile } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [householdSize, setHouseholdSize] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    // Validate file sizes before processing
    const sizeValidation = validateFilesSize(files);
    if (!sizeValidation.valid) {
      const sizeMB = (sizeValidation.totalSize / (1024 * 1024)).toFixed(2);
      setError(`Files are too large (${sizeMB} MB). Please reduce file size or number of files. Try uploading smaller images or fewer documents.`);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            Income Verification Analyst
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Upload documents to determine eligibility based on Federal Poverty Level.
          </p>
        </header>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 md:p-8">
          <FileUpload onFilesChange={handleFilesChange} disabled={isLoading} />

          <div className="mt-6">
            <label htmlFor="household-size" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Number of Household Occupants
            </label>
            <input
              type="number"
              id="household-size"
              min="1"
              max="20"
              value={householdSize}
              onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
              disabled={isLoading}
              className="block w-full md:w-48 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter the total number of people in the household
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleAnalyzeClick}
              disabled={isLoading || files.length === 0}
              className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Documents'}
            </button>
          </div>

          <div className="mt-8">
            {isLoading && <Loader />}
            {error && (
              <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {result && <ResultDisplay result={result} />}
          </div>
        </div>
        <footer className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} AI Income Analyst. For demonstration purposes only.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
