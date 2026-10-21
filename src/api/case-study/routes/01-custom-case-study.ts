// 自定义路由：案例库（文件名以 01- 开头，确保比默认路由先加载）
// 案例全文和附件只通过这两个接口按权限返回
// 后台权限：Public 和 Authenticated 都只勾 Case-study 的 publicList、publicDetail，不要勾 find、findOne
export default {
  routes: [
    {
      method: 'GET',
      path: '/case-library',
      handler: 'api::case-study.case-study.publicList',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/case-library/:slug',
      handler: 'api::case-study.case-study.publicDetail',
      config: { policies: [] },
    },
  ],
};
