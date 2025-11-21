import { GoogleGenAI, Type } from "@google/genai";
import { FEDERAL_POVERTY_LEVELS, FPL_ADDITIONAL_PERSON_AMOUNT } from './constants.js';
import type { UploadedFile, AnalysisResult } from "./types.js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is a Vercel Serverless Function
// https://vercel.com/docs/functions/serverless-functions
export default async function handler(request: VercelRequest, response: VercelResponse) {
  try {
    console.log('API function started');

    if (request.method !== 'POST') {
      return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { files, householdSize } = request.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return response.status(400).json({ message: 'No files provided.' });
    }

    if (!householdSize || typeof householdSize !== 'number' || householdSize < 1) {
      return response.status(400).json({ message: 'Valid household size is required.' });
    }

    console.log('Initializing Gemini AI...');

    // Securely initialize GenAI on the server with the API key from environment variables
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return response.status(500).json({ message: 'API key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

  // Calculate the FPL and threshold for the provided household size
  let povertyLevel: number;
  if (householdSize <= 8) {
    povertyLevel = FEDERAL_POVERTY_LEVELS[householdSize];
  } else {
    povertyLevel = FEDERAL_POVERTY_LEVELS[8] + (FPL_ADDITIONAL_PERSON_AMOUNT * (householdSize - 8));
  }
  const povertyThreshold = povertyLevel * 2; // 200% FPL

  const prompt = `
    You are an expert financial analyst specializing in verifying income for government assistance programs. Your task is to determine if an applicant's household income is at or below 200% of the Federal Poverty Level (FPL).

    The applicant has indicated their household size is: ${householdSize} person(s).

    Based on the 2024 FPL guidelines for the 48 contiguous states and D.C., the 100% FPL for this household size is: $${povertyLevel.toLocaleString()}
    The 200% FPL threshold for this household is: $${povertyThreshold.toLocaleString()}

    Analyze the provided document(s) and perform the following steps:
    1. Identify the type of document(s) provided (e.g., W-2, 1040 Tax Return, SNAP/TANF benefit letter, pay stub, application form, etc.). If multiple documents are present, list them all.
    2. **Cross-Verification (Crucial):** If multiple documents or pages are provided (e.g., an application form with self-reported income AND a pay stub/payment statement), you MUST cross-verify the numbers.
       - Prioritize the income figures from official documents (W-2, tax return, pay stub) over self-reported numbers.
       - If a Year-to-Date (YTD) income is provided on a pay stub, annualize it to get a projected annual income. For example, if a pay stub from June 30th shows $25,000 YTD, the projected annual income is approximately $50,000. Use the date of the document to make an accurate projection.
       - In your reasoning, explicitly state whether the self-reported income aligns with the income calculated from the supporting documents. The final income determination must be based on the official documents if there's a discrepancy.
    3. Extract the applicant's final, verified annual gross income. **IMPORTANT: When calculating income, you MUST only include base pay or regular wages. Exclude any payments specifically identified as 'Overtime,' 'Bonus,' 'Commission,' or other non-recurring, non-guaranteed payments. Your calculation should reflect the applicant's standard, predictable income.** If income is presented weekly, bi-weekly, or monthly, you must annualize it. Use the result from the cross-verification step if applicable.
    4. Compare the applicant's annual income to the 200% FPL threshold of $${povertyThreshold.toLocaleString()} for their household size of ${householdSize}.
    5. If the document is a letter confirming participation in a government assistance program like SNAP, TANF, WIC, or Medicaid, the applicant is automatically eligible regardless of income shown elsewhere. State this in your reasoning.

    Return your analysis ONLY in the specified JSON format. Use the household size of ${householdSize} that was provided.
  `;

  const fileParts = (files as UploadedFile[]).map(file => ({
    inlineData: {
      mimeType: file.mimeType,
      data: file.data,
    },
  }));

  const textPart = { text: prompt };

    console.log('Calling Gemini API...');
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [textPart, ...fileParts] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isEligible: { type: Type.BOOLEAN, description: "True if annual income is at or below 200% of FPL, or if they are on government assistance." },
            annualIncome: { type: Type.NUMBER, description: "The calculated total annual gross income based ONLY on regular pay (excluding overtime/bonuses). Null if not found." },
            reasoning: { type: Type.STRING, description: "A detailed step-by-step explanation of how the conclusion was reached, including the cross-verification process and specific exclusion of non-standard income." },
            documentType: { type: Type.STRING, description: "The type of document(s) identified (e.g., 'W-2 and Pay Stub', 'Tax Return 1040')." },
          },
          required: ["isEligible", "annualIncome", "reasoning", "documentType"]
        },
      },
    });

    if (!geminiResponse.text) {
      throw new Error('No response text from Gemini API');
    }

    console.log('Parsing Gemini response...');
    const jsonText = geminiResponse.text.trim();
    const result = JSON.parse(jsonText);

    // Add the household size and FPL calculations to the result
    const enrichedResult = {
      ...result,
      householdSize,
      povertyLevel,
      povertyThreshold,
    };

    console.log('Analysis successful, sending response');
    // Send the successful result back to the frontend
    response.status(200).json(enrichedResult as AnalysisResult);

  } catch (error) {
    console.error("API function error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error details:", errorMessage);
    // Send an error response back to the frontend
    response.status(500).json({ message: `Failed to analyze documents: ${errorMessage}` });
  }
}