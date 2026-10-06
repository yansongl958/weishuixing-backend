// 自定义路由：会员报名、我的学习档案
// 文件名以 01- 开头，确保 /enrollments/me 比默认的 /enrollments/:id 先匹配
export default {
  routes: [
    {
      method: 'POST',
      path: '/enrollments/register',
      handler: 'api::enrollment.enrollment.register',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/enrollments/me',
      handler: 'api::enrollment.enrollment.me',
      config: { policies: [] },
    },
  ],
};
