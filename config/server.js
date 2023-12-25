/**
* Copyright (c) 2023 - present TinyEngine Authors.
* Copyright (c) 2023 - present Huawei Cloud Computing Technologies Co., Ltd.
*
* Use of this source code is governed by an MIT-style license.
*
* THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
* BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
* A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
*
*/
module.exports = ({ env }) => ({
  // 注意 hosts 文件添加相应记录，如：127.0.0.1    localhost
  host: env('HOST', 'localhost'),
  port: env.int('TARGETPORT', 1337),
  // 部署环境使用 CONTEXT, 区分同一域名下不同的微服务，如：http://${host}:${port}/${url}
  url: env('CONTEXT', ''),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '1e5e5e3fddb49e2530a6aab94321922b'),
    },
    // 仅在 watch 开发模式下生效，如：`strapi develop --watch-admin`
    host: 'localhost',
    // 默认值：'/admin', 1. 与管理面板服务路由的前缀区分开，2. 暴露给用户的访问地址更安全
    url: '/dashboard',
  },
});
