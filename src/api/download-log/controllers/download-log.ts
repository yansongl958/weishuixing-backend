import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::download-log.download-log', ({ strapi }) => ({
  /**
   * GET /api/download-logs/me
   * 当前会员的下载记录（最近 100 条）
   */
  async me(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('请先登录会员账号');
    }

    const list: any[] = await strapi.documents('api::download-log.download-log').findMany({
      filters: { user: { id: { $eq: authUser.id } } },
      populate: {
        resource: { fields: ['title', 'category'] },
      },
      sort: 'createdAt:desc',
      limit: 100,
    } as any);

    return {
      data: list.map((log) => ({
        documentId: log.documentId,
        createdAt: log.createdAt,
        resource: log.resource
          ? {
              documentId: log.resource.documentId,
              title: log.resource.title,
              category: log.resource.category,
            }
          : null,
      })),
    };
  },
}));
