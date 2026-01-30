import React from 'react';
import jsPDF from 'jspdf';
import type { AnalysisResult } from '../types';

interface ResultDisplayProps {
  result: AnalysisResult;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { isEligible, annualIncome, householdSize, povertyThreshold, reasoning, documentType } = result;

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'in',
      format: 'letter'
    });

    const FONT_SIZE = 12;
    const MARGIN = 1;
    const MAX_WIDTH = 8.5 - MARGIN * 2;
    const LINE_SPACING_SINGLE = (FONT_SIZE / 72) * 1.2;
    const LINE_SPACING_DOUBLE = LINE_SPACING_SINGLE * 2;

    let yPos = MARGIN;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(FONT_SIZE);

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Income Verification Summary Report', 8.5 / 2, yPos, { align: 'center' });
    yPos += 0.5;

    doc.setFontSize(FONT_SIZE);
    doc.setFont(undefined, 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), MARGIN, yPos);
    yPos += LINE_SPACING_DOUBLE * 2;

    const addSection = (title: string, content: string | string[]) => {
      if (yPos > 11 - MARGIN - LINE_SPACING_DOUBLE) {
        doc.addPage();
        yPos = MARGIN;
      }

      doc.setFont(undefined, 'bold');
      doc.text(title, MARGIN, yPos);
      yPos += LINE_SPACING_SINGLE * 1.5;

      doc.setFont(undefined, 'normal');
      const contentArray = Array.isArray(content) ? content : [content];

      contentArray.forEach(line => {
        const splitLines = doc.splitTextToSize(line, MAX_WIDTH);
        const requiredHeight = splitLines.length * LINE_SPACING_SINGLE;
        if (yPos + requiredHeight > 11 - MARGIN) {
            doc.addPage();
            yPos = MARGIN;
        }
        doc.text(splitLines, MARGIN, yPos);
        yPos += requiredHeight;
      });

      yPos += LINE_SPACING_DOUBLE;
    };

    addSection('Eligibility Status', isEligible ? 'Eligible' : 'Not Eligible');

    addSection('Summary of Findings', [
        `Document Type(s) Analyzed: ${documentType || 'N/A'}`,
        `Extracted Annual Income: ${formatCurrency(annualIncome)}`,
        `Determined Household Size: ${householdSize || 'N/A'}`,
        `200% Poverty Threshold: ${formatCurrency(povertyThreshold)}`
    ]);

    addSection('Detailed Analysis', reasoning || 'No reasoning provided.');

    doc.save('Income_Verification_Summary.pdf');
  };

  return (
    <div>
      {/* Status header */}
      <div className={`result-card ${isEligible ? 'eligible' : 'ineligible'}`}>
        <div className="result-header">
          <svg className={`result-icon ${isEligible ? 'eligible' : 'ineligible'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isEligible ? (
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          <h2 className="result-title">
            {isEligible ? 'Eligible' : 'Not Eligible'}
          </h2>
        </div>

        {/* Stats grid */}
        <div className="result-grid">
          <div>
            <div className="result-stat-label">Document Type</div>
            <div className="result-stat-value">{documentType || 'N/A'}</div>
          </div>
          <div>
            <div className="result-stat-label">Annual Income</div>
            <div className="result-stat-value">{formatCurrency(annualIncome)}</div>
          </div>
          <div>
            <div className="result-stat-label">Household Size</div>
            <div className="result-stat-value">{householdSize || 'N/A'}</div>
          </div>
          <div>
            <div className="result-stat-label">200% FPL Threshold</div>
            <div className="result-stat-value">{formatCurrency(povertyThreshold)}</div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="result-reasoning">
          <h4>Analysis Summary</h4>
          <p>{reasoning}</p>
        </div>
      </div>

      {/* Export button */}
      <div className="mt-lg">
        <button
          onClick={handleExportPdf}
          className="btn btn-secondary btn-full"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export PDF Report
        </button>
      </div>
    </div>
  );
};
