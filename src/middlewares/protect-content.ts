/**
 * 会员内容保护中间件（对所有 /api/ 开头的接口生效，不影响后台管理界面）
 *
 * 1. 资料的 file 字段：任何接口都不返回文件地址，只返回文件名、格式、大小（file_info）。
 *    真正的下载地址只能通过 /api/resources/:id/download 获取，那里会检查权限。
 * 2. 文章的 content 字段：
 *    - visiblity = public（或未设置）：所有人可读
 *    - visiblity = member：登录会员可读
 *    - visiblity = vip：付费会员功能尚未上线，暂时对所有人只显示摘要
 *    无权阅读时删除正文，并加上 locked: true，前端据此显示“登录后阅读全文”。
 * 3. download_logs、enrollments、certificates：不随任何接口带出，
 *    会员只能通过各自的 /me 接口看自己的记录，证书只能通过编号 + 姓名查询。
 *
 * 这样无论从哪个接口、用什么 populate 参数间接取数据，都拿不到受保护的内容。
 */

const DOWNLOAD_PATH = /^\/api\/resources\/[^/]+\/download\/?$/;
const HIDDEN_RELATIONS = ['download_logs', 'enrollments', 'certificates'];

function canReadArticle(node: any, user: any): boolean {
  // 字段被 fields 参数排除时，无法判断权限，一律按受保护处理
  if (!('visiblity' in node)) return false;
  const vis = node.visiblity;
  if (vis === 'public' || vis === null || vis === undefined) return true;
  if (vis === 'member') return !!user;
  return false; // vip 等其他级别
}

function walk(node: any, user: any, seen: WeakSet<object>) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) walk(item, user, seen);
    return;
  }

  if ('file' in node) {
    const f = node.file;
    node.file_info =
      f && typeof f === 'object'
        ? { name: f.name, ext: f.ext, mime: f.mime, size: f.size }
        : null;
    delete node.file;
  }

  for (const key of HIDDEN_RELATIONS) {
    if (key in node) delete node[key];
  }

  if ('content' in node) {
    if (canReadArticle(node, user)) {
      node.locked = false;
    } else {
      delete node.content;
      node.locked = true;
    }
  }

  for (const key of Object.keys(node)) walk(node[key], user, seen);
}

export default (_config: any, { strapi: _strapi }: any) => {
  return async (ctx: any, next: () => Promise<void>) => {
    await next();

    if (!ctx.path || !ctx.path.startsWith('/api/')) return;
    if (DOWNLOAD_PATH.test(ctx.path)) return;

    const body = ctx.body;
    if (!body || typeof body !== 'object' || Buffer.isBuffer(body)) return;
    if (typeof body.pipe === 'function') return; // 文件流不处理

    walk(body, ctx.state?.user, new WeakSet());
  };
};
