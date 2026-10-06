// 简单的按 IP 限流（内存计数，服务重启后清零），用于证书查询、认领等公开接口，防止被程序批量猜测

const buckets = new Map<string, { count: number; resetAt: number }>();

// 取访客真实 IP：网站在 Nginx 后面，优先读 Nginx 传过来的 X-Real-IP
export function clientIp(ctx: any): string {
  const realIp = ctx.get?.('x-real-ip');
  if (realIp) return String(realIp).trim();
  return ctx.request?.ip || 'unknown';
}

// 返回 true 表示允许，false 表示超过频率
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // 顺手清理过期记录，避免内存一直增长
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}