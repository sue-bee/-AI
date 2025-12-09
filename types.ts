export type ModelType = 'fnn' | 'rnn' | 'lstm';

export interface CoupletResult {
  upper: string;
  lower: string;
  explanation: string;
  qualityScore?: number; // 0-100 score based on training loss
}

export interface TrainingMetric {
  epoch: number;
  loss: number;
  accuracy: number;
}

export interface StepInfo {
  title: string;
  desc: string;
  formula?: string; // Optional math formula
  formulaDesc?: string; // Optional simple Chinese explanation for the formula
  highlightIds: string[]; // IDs of SVG elements to highlight
  view?: 'folded' | 'unfolded'; // Specific to RNN
  fadeIds?: string[]; // IDs to fade out
}

export interface TrainingParams {
  epochs: number;
  learningRate: number;
}