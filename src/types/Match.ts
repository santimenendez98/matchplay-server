export interface MatchModel {
  id?: string;
  creator_id: string;
  court_id: string;
  reservation_id: string;
}

export interface MatchModelSuccess {
  message: string;
  data: MatchModel[];
}

export interface MatchGetModelSuccess {
  message: string;
  data: MatchModel;
}
