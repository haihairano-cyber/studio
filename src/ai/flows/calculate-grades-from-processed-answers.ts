'use server';
/**
 * @fileOverview Calculates the grades from processed answers by comparing them to an answer key.
 *
 * - calculateGrades - A function that calculates the grades based on processed answers and an answer key.
 * - CalculateGradesInput - The input type for the calculateGrades function.
 * - CalculateGradesOutput - The return type for the calculateGrades function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CalculateGradesInputSchema = z.object({
  extractedAnswers: z.array(z.string()).describe('The answers extracted from the image.'),
  answerKey: z.array(z.string()).describe('The correct answers for the test.'),
});
export type CalculateGradesInput = z.infer<typeof CalculateGradesInputSchema>;

const CalculateGradesOutputSchema = z.object({
  correctAnswers: z.number().describe('The number of correct answers.'),
  incorrectAnswers: z.number().describe('The number of incorrect answers.'),
  totalQuestions: z.number().describe('The total number of questions.'),
  score: z.number().describe('The calculated score as a percentage.'),
});
export type CalculateGradesOutput = z.infer<typeof CalculateGradesOutputSchema>;

export async function calculateGrades(input: CalculateGradesInput): Promise<CalculateGradesOutput> {
  return calculateGradesFlow(input);
}

const calculateGradesFlow = ai.defineFlow(
  {
    name: 'calculateGradesFlow',
    inputSchema: CalculateGradesInputSchema,
    outputSchema: CalculateGradesOutputSchema,
  },
  async input => {
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const totalQuestions = input.answerKey.length;

    for (let i = 0; i < totalQuestions; i++) {
      if (input.extractedAnswers[i] === input.answerKey[i]) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }
    }

    const score = (correctAnswers / totalQuestions) * 100;

    return {
      correctAnswers,
      incorrectAnswers,
      totalQuestions,
      score,
    };
  }
);
