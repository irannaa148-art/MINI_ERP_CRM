import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  field?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  return res.status(statusCode).json({
    error: {
      message,
      ...(err.field ? { field: err.field } : {}),
    },
  });
};
