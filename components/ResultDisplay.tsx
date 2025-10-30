import React from 'react';
import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ResultDisplayProps {
  result: AnalysisResult;
}

const ResultCard: React.FC<{ label: string; value: string | number | null; className?: string }> = ({ label, value, className }) => (
  <div className={`flex flex-col p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg ${className}`}>
    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
      {value !== null && value !== undefined ? value : 'N/A'}
    </span>
  </div>
);

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { isEligible, annualIncome, householdSize, povertyThreshold, reasoning, documentType } = result;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const handleExportPdf = () => {
    // 1. Initialize jsPDF for a standard letter-sized document
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'in',
      format: 'letter' // 8.5 x 11 inches
    });

    // 2. Define formatting constants
    const FONT_SIZE = 12;
    const FONT_FAMILY = 'Helvetica'; // A standard sans-serif font similar to Arial
    const MARGIN = 1;
    const MAX_WIDTH = 8.5 - MARGIN * 2; // Usable width for text
    const LINE_SPACING_SINGLE = (FONT_SIZE / 72) * 1.2; // 1.2 provides comfortable single-spacing
    const LINE_SPACING_DOUBLE = LINE_SPACING_SINGLE * 2;
    
    let yPos = MARGIN; // Y-position cursor, starts at the top margin

    // 3. Set default font for the document
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(FONT_SIZE);

    // --- Document Title ---
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Income Verification Summary Report', 8.5 / 2, yPos, { align: 'center' });
    yPos += 0.5; // Move down after title

    // --- Date ---
    doc.setFontSize(FONT_SIZE);
    doc.setFont(undefined, 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), MARGIN, yPos);
    yPos += LINE_SPACING_DOUBLE * 2; // Add extra space after the date

    // --- Helper function to add sections with consistent formatting ---
    const addSection = (title: string, content: string | string[]) => {
      // Check if there's enough space for the section header, if not, add a new page
      if (yPos > 11 - MARGIN - LINE_SPACING_DOUBLE) {
        doc.addPage();
        yPos = MARGIN;
      }
      
      // Section Title
      doc.setFont(undefined, 'bold');
      doc.text(title, MARGIN, yPos);
      yPos += LINE_SPACING_SINGLE * 1.5;

      // Section Content
      doc.setFont(undefined, 'normal');
      const contentArray = Array.isArray(content) ? content : [content];
      
      contentArray.forEach(line => {
        const splitLines = doc.splitTextToSize(line, MAX_WIDTH);
        
        // Check for page break before printing lines
        const requiredHeight = splitLines.length * LINE_SPACING_SINGLE;
        if (yPos + requiredHeight > 11 - MARGIN) { // 11 inches is page height
            doc.addPage();
            yPos = MARGIN;
        }
        
        doc.text(splitLines, MARGIN, yPos);
        yPos += requiredHeight; // Move Y-position down by the height of the printed text
      });

      // Add double space after the section
      yPos += LINE_SPACING_DOUBLE;
    };
    
    // 4. Build the document content using the helper function
    addSection('Eligibility Status', isEligible ? 'Eligible' : 'Not Eligible');
    
    addSection('Summary of Findings', [
        `Document Type(s) Analyzed: ${documentType || 'N/A'}`,
        `Extracted Annual Income: ${formatCurrency(annualIncome)}`,
        `Determined Household Size: ${householdSize || 'N/A'}`,
        `200% Poverty Threshold: ${formatCurrency(povertyThreshold)}`
    ]);

    addSection('Detailed Analysis', reasoning || 'No reasoning provided.');

    // 5. Save the generated PDF
    doc.save('Income_Verification_Summary.pdf');
  };

  return (
    <div className="animate-fade-in">
      <div className={`p-6 rounded-xl flex items-center space-x-4 ${isEligible ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
        {isEligible 
          ? <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400 flex-shrink-0" /> 
          : <XCircleIcon className="h-10 w-10 text-red-600 dark:text-red-400 flex-shrink-0" />
        }
        <div>
          <h2 className={`text-2xl font-bold ${isEligible ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
            Eligibility Status: {isEligible ? 'Eligible' : 'Not Eligible'}
          </h2>
          <p className={`mt-1 text-sm ${isEligible ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            Based on the provided document(s), the applicant is {isEligible ? 'likely eligible' : 'not eligible'} for assistance.
          </p>
        </div>
      </div>
      
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <ResultCard label="Document Type" value={documentType} />
        <ResultCard label="Extracted Annual Income" value={formatCurrency(annualIncome)} />
        <ResultCard label="Determined Household Size" value={householdSize} />
        <ResultCard label="200% Poverty Threshold" value={formatCurrency(povertyThreshold)} className="md:col-span-3" />
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Income verification summary</h3>
            <button
                onClick={handleExportPdf}
                className="export-button flex items-center space-x-2 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
                aria-label="Export summary to PDF"
              >
              <DownloadIcon className="h-4 w-4" />
              <span>Export PDF</span>
            </button>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
          {reasoning}
        </div>
      </div>
    </div>
  );
};
