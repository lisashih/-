export interface VisualPlan {
  id: number;
  title: string;
  concept: string;
  visualDescription: string;
  headline: string;
  subHeadline: string;
  style: string;
  prompt: string;
}

export type ImageSize = "1K" | "2K" | "4K";
