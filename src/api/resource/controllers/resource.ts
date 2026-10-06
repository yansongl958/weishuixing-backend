import { factories } from '@strapi/strapi';
import { getMember, todayInChina } from '../../../utils/member';

export default factories.createCoreController('api::resource.resource', ({ strapi }) => ({
  /**
   * GET /api/resources/:id/download
   * 检查权限 -> 记录下载 -> 返回文件地址
   */
  async download(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('请先登录会员账号');
    }

    const { id } = ctx.params; // 资料的 documentId

    const resource: any = await strapi.documents('api::resource.resource').findOne({
      documentId: id,
      status: 'published',
      populate: {
        file: true,
        event: { fields: ['title'] },
      },
    });

    if (!resource) {
      return ctx.notFound('资料不存在或尚未发布');
    }
    if (!resource.file?.url) {
      return ctx.notFound('该资料暂未上传文件');
    }

    // 权限判断
    let allowed = false;
    if (resource.access_level !== 'attendee') {
      allowed = true; // 会员资料：登录即可
    } else if (resource.unlock_date && resource.unlock_date <= todayInChina()) {
      allowed = true; // 学员资料已过解锁日期
    } else if (resource.event?.documentId) {
      const count = await strapi.documents('api::enrollment.enrollment').count({
        filters: {
          user: { id: { $eq: authUser.id } },
          event: { documentId: { $eq: resource.event.documentId } },
          enroll_status: { $eq: 'attended' },
        },
      });
      allowed = count > 0;
    }

    if (!allowed) {
      const eventTitle = resource.event?.title;
      return ctx.forbidden(
        eventTitle ? `本资料为《${eventTitle}》学员专享` : '本资料为学员专享',
        {
          reason: 'attendee_only',
          event: resource.event
            ? { documentId: resource.event.documentId, title: resource.event.title }
            : null,
        }
      );
    }

    // 记录下载（记录失败不影响下载）
    try {
      const member = await getMember(strapi, authUser.id);
      await strapi.documents('api::download-log.download-log').create({
        data: {
          user: member?.documentId,
          resource: resource.documentId,
        } as any,
      });
      await strapi.db.query('api::resource.resource').updateMany({
        where: { documentId: resource.documentId },
        data: { download_count: (resource.download_count ?? 0) + 1 },
      });
    } catch (err) {
      strapi.log.error('记录下载失败', err);
    }

    return {
      data: {
        url: resource.file.url,
        name: resource.file.name,
        ext: resource.file.ext,
      },
    };
  },
}));
