export type TrainingPoint = {
  step: number;
  loss: number;
  lr: number;
  grad_norm: number;
};

export type TrainingRun = {
  id: string;
  name: string;
  points: TrainingPoint[];
};

export type Metric = "loss" | "lr" | "grad_norm";