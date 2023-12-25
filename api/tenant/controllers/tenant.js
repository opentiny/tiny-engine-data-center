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
const { sanitizeEntity } = require('strapi-utils');
const { ROLES } = require('../../../config/constants');
const { getUniqueRoleByName } = require('../../../config/toolkits');

module.exports = {
  async find(ctx) {
    const filter = ctx.request.query;
    const { add_admin_info, fat } = filter;
    delete filter.add_admin_info;
    delete filter.fat;
    const relatedItems = Number(fat) !== 1 ? [] : undefined;
    const list = await strapi.services.tenant.find(filter, relatedItems);
    if (Number(add_admin_info) !== 1) {
      return list;
    }
    const ids = list.map((item) => item.id);
    const admins = await getTenantAdmins(ids);
    return {
      list,
      admins,
    };
  },

  findBlockFilterConditions() {
    return strapi.services.block.findBlockFilterConditions();
  },

  async pagination(ctx) {
    const filter = ctx.request.query;
    const { add_admin_info } = filter;
    delete filter.add_admin_info;
    const list = await strapi.services.tenant.find(filter, []);
    const total = await strapi.services.tenant.count(filter);
    const res = {
      total,
      list: list.map((item) =>
        sanitizeEntity(item, {
          model: strapi.models.tenant,
        })
      ),
    };
    if (Number(add_admin_info) === 1) {
      const ids = list.map((item) => item.id);
      res.admins = await getTenantAdmins(ids);
    }
    return res;
  },
};

const getTenantAdmins = async (ids) => {
  const tenantAdminRoles = await getUniqueRoleByName(ROLES.tenantAdmin);
  return strapi.services['auth-users-units-role'].find(
    {
      unit_id_in: ids,
      unit_type: 'tenant',
      role: tenantAdminRoles.id,
      _or: [{ expired_time_gt: Date.now() }, { expired_time_null: true }],
    },
    ['user']
  );
};
