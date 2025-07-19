export interface SportModel {
  id?: number;
  name: string;
  max_players: number;
}

export interface SportModelSuccess {
  message: string;
  data: SportModel[];
}

export type SportGetModelSuccess = {
  message: string;
  data: SportModel;
};
