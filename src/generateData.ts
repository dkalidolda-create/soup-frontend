import type { TrainingPoint, TrainingRun } from "./types";

export function generatePoints(count: number): TrainingPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    step: index + 1,
    loss: 1 / (index + 1),
    lr: 0.001,
    grad_norm: 1.2,
  }));
}

export function generateRuns(): TrainingRun[] {
  const runs = Array.from({ length: 20 }, (_, index) => ({
    id: `run-${index + 1}`,
    name: `Experiment ${index + 1}`,
    points: generatePoints(1000),
  }));

  
  runs[0].points[100].loss = NaN;

  
  runs[1].points[200].loss = Infinity;

  
runs[2].points.push({
  step: 100,
  loss: 0.9,
  lr: 0.001,
  grad_norm: 1.2,
});


const points = runs[3].points;
const firstPoint = points[0];

points[0] = points[500];
points[500] = firstPoint;



runs[4].points = runs[4].points.filter(
  point => point.step < 401 || point.step > 450
);


runs[5].name = "Million points — single spike";
runs[5].points = generatePoints(1_000_000);


runs[5].points[500_000].loss = 10;


  return runs;
}
 

