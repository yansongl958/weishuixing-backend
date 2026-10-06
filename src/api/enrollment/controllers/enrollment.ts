import { factories } from '@strapi/strapi';
import { getMember } from '../../../utils/member';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  /**
   * POST /api/enrollments/register
   * 已登录会员报名：body 为 { eventDocumentId }
   * 生成一条“已报名”的学员记录，同时写一条留资线索，方便工作人员跟进
   */
  async register(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('请先登录会员账号');
    }

    const eventDocumentId = ctx.request.body?.eventDocumentId;
    if (!eventDocumentId || typeof eventDocumentId !== 'string') {
      return ctx.badRequest('缺少课程信息');
    }

    const event: any = await strapi.documents('api::event.event').findOne({
      documentId: eventDocumentId,
      status: 'published',
      fields: ['title'],
    });
    if (!event) {
      return ctx.notFound('课程不存在或尚未发布');
    }

    // 已经报过名就直接返回，不重复创建
    const existing: any = await strapi.documents('api::enrollment.enrollment').findFirst({
      filters: {
        user: { id: { $eq: authUser.id } },
        event: { documentId: { $eq: eventDocumentId } },
      },
    });
    if (existing) {
      return {
        data: {
          documentId: existing.documentId,
          enroll_status: existing.enroll_status,
          already: true,
          eventTitle: event.title,
        },
      };
    }

    const member = await getMember(strapi, authUser.id);

    const created: any = await strapi.documents('api::enrollment.enrollment').create({
      data: {
        user: member?.documentId,
        event: eventDocumentId,
        enroll_status: 'registered',
      } as any,
    });

    // 同步写一条留资线索（失败不影响报名）
    try {
      await strapi.documents('api::lead.lead').create({
        data: {
          name: member?.real_name || member?.username || '',
          company: member?.company || '',
          phone: member?.phone || '',
          position: member?.position || '',
          lead_type: 'training_register',
          target_title: event.title,
          remark: '会员在线报名',
        } as any,
      });
    } catch (err) {
      strapi.log.error('写入报名线索失败', err);
    }

    return {
      data: {
        documentId: created.documentId,
        enroll_status: created.enroll_status,
        already: false,
        eventTitle: event.title,
      },
    };
  },

  /**
   * GET /api/enrollments/me
   * 当前会员的学习档案：参加过哪些课程、状态
   * （结业证书已改由“证书”表管理，这里不再读取学员记录里的 certificate 字段）
   */
  async me(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('请先登录会员账号');
    }

    try {
      const list: any[] = await strapi.documents('api::enrollment.enrollment').findMany({
        filters: { user: { id: { $eq: authUser.id } } },
        populate: {
          event: { fields: ['title', 'event_date', 'location'] },
        },
        sort: { createdAt: 'desc' },
        limit: 200,
      } as any);

      return {
        data: list.map((e) => ({
          documentId: e.documentId,
          enroll_status: e.enroll_status,
          createdAt: e.createdAt,
          event: e.event
            ? {
                documentId: e.event.documentId,
                title: e.event.title,
                event_date: e.event.event_date,
                location: e.event.location,
              }
            : null,
        })),
      };
    } catch (err) {
      strapi.log.error('读取学习档案失败', err);
      return ctx.internalServerError
        ? ctx.internalServerError('读取学习档案失败，请稍后再试')
        : ctx.badRequest('读取学习档案失败，请稍后再试');
    }
  },
}));
