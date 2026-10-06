import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  {
    name: 'strapi::session',
    config: {
      proxy: true,
    },
  },
  'strapi::favicon',
  'strapi::public',
  // 会员内容保护（代码在 src/middlewares/protect-content.ts），必须放在最后
  'global::protect-content',
];

export default config;