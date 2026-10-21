import { factories } from '@strapi/strapi';

// 案例库接口：按访问者身份分层返回内容
// - 所有人：公开字段（标题、单位、地区、规模、摘要、专题、专家、是否优秀案例）
// - 登录会员：再加全文 content、走过的弯路 detours
// - 参加过任意一期培训（报名状态 attended）的会员：再加附件 attachments
// 注意：后台不要给 Public / Authenticated 勾 Case-study 的 find、findOne，只勾 publicList、publicDetail
// 全文以 full_text 返回，不用 content：项目里会员文章的全局处理会拦截名为 content 的字段（会删掉并加 locked）

const PUBLIC_FIELDS = [
  'title',
  'slug',
  'org_name',
  'region',
  'scale',
  'summary',
  'is_excellent',
  'award_year',
  'publishedAt',
];

function pickPublic(c: any) {
  const out: any = { documentId: c.documentId };
  for (const f of PUBLIC_FIELDS) out[f] = c[f] ?? null;
  return out;
}

// 是否参加过任意一期培训
async function isAttendee(strapi: any, userId: number): Promise<boolean> {
  const n = await strapi.documents('api::enrollment.enrollment').count({
    filters: {
      user: { id: { $eq: userId } },
      enroll_status: { $eq: 'attended' },
    },
  });
  return n > 0;
}

export default factories.createCoreController('api::case-study.case-study', ({ strapi }) => ({
  /**
   * GET /api/case-library
   * 可选参数：topic=专题slug、expert=专家documentId、excellent=true、page、pageSize
   */
  async publicList(ctx: any) {
    const q = ctx.query || {};
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(q.pageSize, 10) || 12));

    const filters: any = {};
    if (q.topic) filters.topics = { slug: { $eq: String(q.topic) } };
    if (q.expert) filters.experts = { documentId: { $eq: String(q.expert) } };
    if (q.excellent === 'true') filters.is_excellent = { $eq: true };

    const [rows, total] = await Promise.all([
      strapi.documents('api::case-study.case-study').findMany({
        status: 'published',
        filters,
        fields: PUBLIC_FIELDS as any,
        populate: {
          topics: { fields: ['name', 'slug'] },
          experts: { fields: ['name'] },
        },
        sort: [{ is_excellent: 'desc' }, { publishedAt: 'desc' }] as any,
        start: (page - 1) * pageSize,
        limit: pageSize,
      }),
      strapi.documents('api::case-study.case-study').count({ status: 'published', filters } as any),
    ]);

    return {
      data: (rows as any[]).map((c: any) => ({
        ...pickPublic(c),
        topics: c.topics || [],
        experts: (c.experts || []).map((e: any) => ({ documentId: e.documentId, name: e.name })),
      })),
      meta: {
        pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
      },
    };
  },

  /**
   * GET /api/case-library/:slug
   * 返回 access：public（未登录）/ member（会员）/ attendee（参训学员，可看附件）
   */
  async publicDetail(ctx: any) {
    const { slug } = ctx.params;

    const c: any = await strapi.documents('api::case-study.case-study').findFirst({
      status: 'published',
      filters: { slug: { $eq: slug } },
      populate: {
        topics: { fields: ['name', 'slug'] },
        experts: {
          fields: ['name', 'title', 'institution', 'specialty', 'appointment', 'honors'],
          populate: { avatar: true },
        },
        attachments: true,
      },
    });

    if (!c) {
      return ctx.notFound('案例不存在或尚未发布');
    }

    const attachments: any[] = c.attachments || [];
    const hasContent =
      (Array.isArray(c.content) && c.content.length > 0) ||
      (Array.isArray(c.detours) && c.detours.length > 0);

    const data: any = {
      ...pickPublic(c),
      topics: c.topics || [],
      experts: (c.experts || []).map((e: any) => ({
        documentId: e.documentId,
        name: e.name,
        title: e.title,
        institution: e.institution,
        specialty: e.specialty,
        appointment: e.appointment,
        honors: e.honors,
        avatar: e.avatar?.url ? { url: e.avatar.url } : null,
      })),
      access: 'public',
      has_content: hasContent,
      attachment_count: attachments.length,
    };

    const authUser = ctx.state.user;
    if (authUser) {
      data.access = 'member';
      data.full_text = c.content || [];
      data.detours = c.detours || [];

      if (attachments.length > 0 && (await isAttendee(strapi, authUser.id))) {
        data.access = 'attendee';
        data.attachments = attachments.map((f: any) => ({
          name: f.name,
          url: f.url,
          ext: f.ext,
          size: f.size,
        }));
      }
    }

    return { data };
  },
}));
