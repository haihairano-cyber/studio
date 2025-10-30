export interface TestTemplate {
  id: string;
  name: string;
  answerKey: string[];
}

export interface GradingResult {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  score: number;
}

export interface DetailedResult {
  question: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}
