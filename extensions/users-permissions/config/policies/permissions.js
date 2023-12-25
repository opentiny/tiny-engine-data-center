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
const { checkUser, checkPermission, updateUser } = require('../check');
const { TINY_BUILDER_USER, CUSTOM_HEADER } = require('../../../../config/constants');
const { isMe } = require('../../../../config/toolkits');
module.exports = async (ctx, next) => {
  const {
    header,
    route: { plugin },
  } = ctx.request;

  const { whitelist, backend, develop } = TINY_BUILDER_USER;
  const { xUser } = CUSTOM_HEADER;
  // 此插件仅对 end users 调用的数据 API 鉴权，所以 admin panel 相关的路由，直接放行
  if (plugin && plugin !== 'application') {
    ctx.tinyBuilderPermissionCheck = 'complete';
    return next();
  }
  // 对于特殊请求的用户信息获取
  const emptyUser = header[xUser];
  /**
   * 对于白名单、定时任务的请求一律放行
   * 白名单：请求只为了取数据，需要请求path和strapi 配置的白名单一致  
   * 定时任务： 由于定时任务没有用户信息，所以不存在权限校验，且定时任务的请求一般为只读请求  strapi需要为定时任务请求的接口划定范围
   */
  if ([whitelist, backend, develop].includes(emptyUser)) {
    // 先简单的放行
    const user = await strapi.query('user', 'users-permissions').findOne({ id: 86 });
    ctx.session.user = user;
    ctx.tinyBuilderPermissionCheck = 'complete';
    return next();
  }

  // 对于user-tenants-role/me 接口来说，更新role 及 当前选中的 tenant 信息即可
  if (isMe(ctx)) {
    await updateUser(ctx);
    ctx.tinyBuilderPermissionCheck = 'complete';
    return next();
  }
  // 校验真实用户信息
  await checkUser(ctx);
  return checkPermission(ctx, next);
};
