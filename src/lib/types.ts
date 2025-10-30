export interface TestTemplate {
  id: string;
  name: string;
  answerKey: string[];
  points: number[];
}

export interface GradingResult {
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  score: number;
  totalPoints: number;
  earnedPoints: number;
}

export interface DetailedResult {
  question: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
}
