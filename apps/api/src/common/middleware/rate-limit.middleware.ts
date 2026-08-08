import { Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

interface WindowState {
  count: number
  resetAt: number
}

/* Simple fixed-window in-memory rate limiter per client IP. */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windows = new Map<string, WindowState>()

  constructor(
    private readonly limit = 300,
    private readonly windowMs = 60_000,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const window = this.windows.get(key)

    if (window === undefined || now >= window.resetAt) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs })
      next()
      return
    }

    if (window.count >= this.limit) {
      res.status(429).json({
        success: false,
        error: { code: 'ERR_TOO_MANY_REQUESTS', message: 'Too many requests' },
      })
      return
    }

    window.count += 1
    next()
  }
}
