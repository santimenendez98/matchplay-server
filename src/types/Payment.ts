export interface MercadoPagoModel {
  body: bodyModel;
}

export interface bodyModel {
  items: itemModel[];
  back_urls: backUrlModel;
  auto_return: string;
  notification_url?: string;
  external_reference: string;
}

export interface itemModel {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
}

export interface backUrlModel {
  success: string;
  failure: string;
  pending: string;
}

export type mercadoPagoRequest = {
  items: Omit<itemModel, "currency_id">[];
  external_reference: string;
};
