export interface AuthModel {
  id?: number;
  email: string;
  password: string;
}

export interface AuthResponse {
  id: string;
  token: string;
}

export interface AuthModelSuccess {
  message: string;
  data: AuthResponse;
}
