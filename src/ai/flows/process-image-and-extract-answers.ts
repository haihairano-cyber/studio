'use server';
/**
 * @fileOverview This file defines a Genkit flow to process an image of a student's answer sheet and extract the marked answers.
 *
 * - processImageAndExtractAnswers - A function that takes an image of an answer sheet as input and returns the extracted answers.
 * - ProcessImageAndExtractAnswersInput - The input type for the processImageAndExtractAnswers function.
 * - ProcessImageAndExtractAnswersOutput - The return type for the processImageAndExtractAnswers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessImageAndExtractAnswersInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a student's answer sheet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProcessImageAndExtractAnswersInput = z.infer<typeof ProcessImageAndExtractAnswersInputSchema>;

const ProcessImageAndExtractAnswersOutputSchema = z.object({
  extractedAnswers: z
    .array(z.string())
    .describe('The answers extracted from the student answer sheet.'),
});
export type ProcessImageAndExtractAnswersOutput = z.infer<typeof ProcessImageAndExtractAnswersOutputSchema>;

export async function processImageAndExtractAnswers(input: ProcessImageAndExtractAnswersInput): Promise<ProcessImageAndExtractAnswersOutput> {
  return processImageAndExtractAnswersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processImageAndExtractAnswersPrompt',
  input: {schema: ProcessImageAndExtractAnswersInputSchema},
  output: {schema: ProcessImageAndExtractAnswersOutputSchema},
  prompt: `You are an AI assistant designed to extract answers from student answer sheets.

Analyze the image provided and extract the answers marked by the student.

For each question, identify the marked answer (e.g., 'A', 'B', 'C', 'D', 'E').
- If you cannot read the answer for a question, classify it as "ANULADA".
- If a question has erasures, classify it as "ANULADA".
- If a question has more than one option marked, classify it as "ANULADA".

Return the answers as a JSON array of strings in the 'extractedAnswers' field.

Image: {{media url=photoDataUri}}
  `,
});

const processImageAndExtractAnswersFlow = ai.defineFlow(
  {
    name: 'processImageAndExtractAnswersFlow',
    inputSchema: ProcessImageAndExtractAnswersInputSchema,
    outputSchema: ProcessImageAndExtractAnswersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
