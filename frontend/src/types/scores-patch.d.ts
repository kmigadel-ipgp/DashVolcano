// Patch temporaire pour les types de scores
declare module '@/types' {
  export interface ScoreDetail {
    dist_km?: number;
    final?: number;
  }
  
  export interface MatchingScores {
    sp?: ScoreDetail | number;
    te?: ScoreDetail | number;
    ti?: ScoreDetail | number;
    pe?: ScoreDetail | number;
    final?: number;
  }
}
