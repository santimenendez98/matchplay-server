export interface MatchModel {
  id?: string;
  creator_id: string;
  court_id: string;
  reservation_id: string;
  current_players?: number;
  total_players: number;
  price_per_player: number;
  status?: "pending" | "completed" | "cancelled";
}

export interface JoinMatchModel {
  match_id: string;
  player_id: string;
  joined_at: string;
  payment_method: "debit_card" | "cash" | "bank_transfer";
}

export interface SendMessageModel {
  match_id: string;
  player_id: string;
  message: string;
  sent_at?: string;
}

export interface MatchModelSuccess {
  message: string;
  data: MatchModel[];
}

export interface MatchGetModelSuccess {
  message: string;
  data: MatchModel;
}

export interface JoinMatchModelSuccess {
  message: string;
  data: JoinMatchModel;
}

export interface sendMatchMessageModelSuccess {
  message: string;
  data: SendMessageModel[];
}
