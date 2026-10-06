// 自定义路由：资料下载（文件名以 01- 开头，确保比默认路由先加载）
export default {
  routes: [
    {
      method: 'GET',
      path: '/resources/:id/download',
      handler: 'api::resource.resource.download',
      config: { policies: [] },
    },
  ],
};
