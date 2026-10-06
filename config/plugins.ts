import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      // 使用长效 JWT（默认 30 天），与前端把 token 存在 localStorage 的做法匹配。
      // 原来的 'refresh' 模式下 token 很快过期，需要前端配合 cookie 刷新，目前前端没有这套逻辑。
      jwtManagement: 'legacy-support',
      jwt: {
        expiresIn: '30d',
      },
      register: {
        // 注册接口默认只接收 username / email / password。
        // 这里放行会员资料字段。注意：verified（是否认证）故意不放行，只能由管理员在后台修改。
        allowedFields: ['real_name', 'company', 'position', 'phone', 'user_type'],
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes: deniedExecutableTypes,
      },
    },
  },
});

export default config;
