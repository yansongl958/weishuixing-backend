import { factories } from '@strapi/strapi';
import { allowRequest, clientIp } from '../../../utils/rate-limit';
import { getMember } from '../../../utils/member';

// 每个 IP 每分钟最多查询 / 认领的次数
const VERIFY_LIMIT_PER_MINUTE = 20;
const CLAIM_LIMIT_PER_MINUTE = 10;

// 按 Strapi 统一的错误格式返回（用于 429、409 这类没有内置快捷方法的状态码）
function fail(ctx: any, status: number, name: string, message: string) {
  ctx.status = status;
  ctx.body = { data: null, error: { status, name, message, details: {} } };
  return ctx.body;
}

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\u3000/g, ' ').trim().slice(0, maxLength);
}

// 对外公开的证书字段（不含备注、关联的会员账号等内部信息）
function toPublic(cert: any) {
  const issuer = cert.issuer;
  return {
    certificate_no: cert.certificate_no,
    holder_name: cert.holder_name,
    company: cert.company,
    course_title: cert.course_title,
    issue_date: cert.issue_date,
    class_hours: cert.class_hours,
    cert_status: cert.cert_status,
    cert_type: cert.cert_type,
    honor_title: cert.honor_title,
    event: cert.event ? { documentId: cert.event.documentId, title: cert.event.title } : null,
    issuer: issuer
      ? {
          name: issuer.name,
          short_name: issuer.short_name,
          official_url: issuer.official_url,
          authorization_note: issuer.authorization_note,
          logo: issuer.logo?.url ? { url: issuer.logo.url } : null,
        }
      : null,
  };
}

const PUBLIC_POPULATE = {
  issuer: {
    fields: ['name', 'short_name', 'official_url', 'authorization_note'],
    populate: { logo: { fields: ['url'] } },
  },
  event: { fields: ['title'] },
};

export default factories.createCoreController('api::certificate.certificate', ({ strapi }) => ({
  /**
   * GET /api/certificates/verify?no=证书编号&name=姓名
   * 公开查询：编号和姓名都对上才返回；对不上时不透露编号是否存在
   */
  async verify(ctx: any) {
    if (!allowRequest(`verify:${clientIp(ctx)}`, VERIFY_LIMIT_PER_MINUTE, 60_000)) {
      return fail(ctx, 429, 'TooManyRequestsError', '查询过于频繁，请一分钟后再试');
    }

    const no = clean(ctx.query?.no, 64);
    const name = clean(ctx.query?.name, 32);
    if (!no || !name) {
      return ctx.badRequest('请填写证书编号和姓名');
    }

    const list: any[] = await strapi.documents('api::certificate.certificate').findMany({
      filters: {
        certificate_no: { $eq: no },
        holder_name: { $eq: name },
      },
      populate: PUBLIC_POPULATE,
      limit: 10,
    } as any);

    // claimable：该证书还没有被会员认领（只告诉前端能不能认领，不透露被谁认领）
    return {
      data: list.map((c) => ({ ...toPublic(c), claimable: !c.user })),
    };
  },

  /**
   * POST /api/certificates/claim   body: { no, name }
   * 会员认领证书：姓名必须与会员资料里的真实姓名一致
   */
  async claim(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('请先登录会员账号');
    }
    if (!allowRequest(`claim:${clientIp(ctx)}`, CLAIM_LIMIT_PER_MINUTE, 60_000)) {
      return fail(ctx, 429, 'TooManyRequestsError', '操作过于频繁，请一分钟后再试');
    }

    const no = clean(ctx.request.body?.no, 64);
    const name = clean(ctx.request.body?.name, 32);
    if (!no || !name) {
      return ctx.badRequest('请填写证书编号和姓名');
    }

    const member = await getMember(strapi, authUser.id);
    if (!member?.real_name || member.real_name.trim() !== name) {
      return ctx.forbidden('证书上的姓名与您会员资料中的姓名不一致，无法认领。如有疑问请联系工作人员');
    }

    const list: any[] = await strapi.documents('api::certificate.certificate').findMany({
      filters: {
        certificate_no: { $eq: no },
        holder_name: { $eq: name },
      },
      populate: { user: { fields: ['id'] } },
      limit: 10,
    } as any);

    if (list.length === 0) {
      return ctx.notFound('未查询到该证书');
    }

    let claimed = 0;
    for (const cert of list) {
      if (cert.user && cert.user.id !== authUser.id) {
        return fail(ctx, 409, 'ConflictError', '该证书已被其他账号认领，如有疑问请联系工作人员');
      }
      if (!cert.user) {
        await strapi.documents('api::certificate.certificate').update({
          documentId: cert.documentId,
          data: { user: member.documentId } as any,
        });
        claimed += 1;
      }
    }

    return { data: { claimed, already: claimed === 0 } };
  },

  /**
   * GET /api/certificates/me
   * 当前会员已认领的证书
   */
  async me(ctx: any) {
    const authUser = ctx.state.user;
    if (!authUser) {
      return ctx.unauthorized('请先登录会员账号');
    }

    const list: any[] = await strapi.documents('api::certificate.certificate').findMany({
      filters: { user: { id: { $eq: authUser.id } } },
      populate: PUBLIC_POPULATE,
      sort: 'issue_date:desc',
      limit: 200,
    } as any);

    return { data: list.map(toPublic) };
  },
}));
