// 会员相关的公共小工具，供各个控制器复用

// 读取会员的完整资料（含 documentId），ctx.state.user 里的字段不一定齐全，这里统一从数据库读
export async function getMember(strapi: any, userId: number) {
  return strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: [
      'id',
      'documentId',
      'username',
      'email',
      'real_name',
      'company',
      'phone',
      'position',
      'user_type',
      'verified',
    ],
  });
}

// 北京时间的今天，格式 YYYY-MM-DD，用于和资料的解锁日期比较
export function todayInChina(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}
