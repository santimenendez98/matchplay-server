export interface AuthModel {
  id?: number;
  email: string;
  password: string;
}

export interface AuthResponse {
  id: number;
  token: string;
}

export interface AuthModelSuccess {
  message: string;
  data: AuthResponse;
}

export interface AuthModelError {
  message: string;
  error: string;
}
