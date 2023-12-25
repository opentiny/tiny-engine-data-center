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
/**
 * 创建/查询时，添加租户标识
 */
module.exports = async (ctx, next) => {
  const { user } = ctx.session;
  const { header, method, body, query } = ctx.request;

  if (!user && header?.['x-tinybuilder-user'] === 'backend') {
    return next();
  }

  if (!['POST', 'GET'].includes(method)) {
    return next();
  }

  // 目前从简，使用 user 当前所属租户进行关联/查询。后续如有多个租户，需要从请求头取值
  const { tenants = [] } = user;
  const tenantIds = tenants.map((item) => item.id);
  if (!tenantIds.length) {
    const { id } = await strapi.query('tenant').findOne({ tenant_id: 'public' }, []);
    tenantIds.push(id);
  }

  if (method === 'POST') {
    Object.assign(body, {
      tenant: tenantIds[0],
    });
  } else if (method === 'GET') {
    Object.assign(query, {
      tenant: tenantIds,
    });
  } else {
    return next();
  }

  return next();
};
