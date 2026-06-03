class AppError {
  public readonly message: string;
  public readonly statusCode: number;
  public readonly stack: string;

  constructor(message: string, statusCode = 400) {
    this.message = message;
    this.statusCode = statusCode;
    this.stack = new Error().stack || "";
  }
}

export default AppError;
