export type errorHandler = {
  statusCode: number;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
  errors?: string[];
};

export type ErrorResponse = errorHandler;
