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
];

export default config;
