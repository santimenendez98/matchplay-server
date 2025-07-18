import { ParamsDictionary } from "express-serve-static-core";

export interface errorResponseModel {
  message: string;
  error: string;
}

export interface paramsModels extends ParamsDictionary {
  id: string;
}
