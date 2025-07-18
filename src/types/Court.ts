export interface CourtModel {
  id?: string;
  complex_id: number;
  sport_id: number;
  name: string;
  image_url?: string;
}

export interface CourtModelSuccess {
  message: string;
  data: CourtModel[];
}

export interface CourtGetModelSuccess {
  message: string;
  data: CourtModel;
}

export type updateCourtModel = Pick<CourtModel, "name" | "image_url">;
