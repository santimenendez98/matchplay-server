export interface complexModel {
  id?: number;
  admin_id: number;
  name: string;
  location: string;
  description: string;
  image_url?: string;
}

export interface complexModelSuccess {
  message: string;
  data: complexModel[];
}

export interface complexGetModelSuccess {
  message: string;
  data: complexModel;
}

export type UpdateComplexModel = Pick<
  complexModel,
  "name" | "location" | "description" | "image_url"
>;
