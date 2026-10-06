// 自定义路由：证书查询、认领、我的证书
// 文件名以 01- 开头，确保 /certificates/verify 和 /certificates/me 比默认的 /certificates/:id 先匹配
export default {
  routes: [
    {
      method: 'GET',
      path: '/certificates/verify',
      handler: 'api::certificate.certificate.verify',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/certificates/claim',
      handler: 'api::certificate.certificate.claim',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/certificates/me',
      handler: 'api::certificate.certificate.me',
      config: { policies: [] },
    },
  ],
};