
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultDisplay } from './components/ResultDisplay';
import { Loader } from './components/Loader';
import { analyzeDocuments } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import type { AnalysisResult, UploadedFile } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
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

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const uploadedFiles: UploadedFile[] = await Promise.all(
        files.map(file => fileToBase64(file))
      );
      
      const analysisResult = await analyzeDocuments(uploadedFiles);
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
