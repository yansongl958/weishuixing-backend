// 自定义路由：我的下载记录
// 文件名以 01- 开头，确保 /download-logs/me 比默认的 /download-logs/:id 先匹配
export default {
  routes: [
    {
      method: 'GET',
      path: '/download-logs/me',
      handler: 'api::download-log.download-log.me',
      config: { policies: [] },
    },
  ],
};
