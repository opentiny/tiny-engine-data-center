'use strict';
const { sanitizeEntity } = require('strapi-utils');
const { ERROR_TYPE } = require('../../../config/constants');
const { throwErrors } = require('../../../config/toolkits');
const {
  isTruthy,
  handlePublicScope,
  handleTinyReserved,
  findAllMaterial,
  filterUserField
} = require('../../../config/material');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
const idRegExp = /^[0-9]+$/; // Tips: 非必要情况下正则不要用g参数；如果必须使用，需要尽量限制使用范围，不要设为全局变量。

module.exports = {
  async find(ctx) {
    const { list } = await findAllMaterial(ctx.session.user, ctx.request.query, 'user-components', 'user_components', [
      'createdBy'
    ]);
    return list.map((item) =>
      sanitizeEntity(
        { ...item, createdBy: filterUserField(item.createdBy) },
        { model: strapi.models['user-components'] }
      )
    );
  },

  async pagination(ctx) {
    const { list, total } = await findAllMaterial(
      ctx.session.user,
      ctx.request.query,
      'user-components',
      'user_components',
      ['createdBy']
    );
    const formatList = list.map((item) =>
      sanitizeEntity(
        { ...item, createdBy: filterUserField(item.createdBy) },
        { model: strapi.models['user-components'] }
      )
    );
    return {
      total,
      list: formatList
    };
  },

  async count(ctx) {
    const { list } = await findAllMaterial(ctx.session.user, ctx.request.query, 'user-components', 'user_components');
    return list.length;
  },

  async update(ctx) {
    const { id } = ctx.params;
    const newData = { ...ctx.request.body };

    let currentPublicScope = newData.public;
    if (!isTruthy(currentPublicScope)) {
      currentPublicScope = (await strapi.services['user-components'].findOne({ id })).public;
    }

    handlePublicScope(currentPublicScope, newData);
    handleTinyReserved(ctx.session.user, newData);

    const component = await strapi.services['user-components'].update({ id }, newData);
    return sanitizeEntity(component, { model: strapi.models['user-components'] });
  },

  async create(ctx) {
    const data = { ...ctx.request.body };

    handlePublicScope(data.public, data);
    handleTinyReserved(ctx.session.user, data, true);

    const component = await strapi.services['user-components'].create(data);
    return sanitizeEntity(component, { model: strapi.models['user-components'] });
  },

  async associated(ctx) {
    const { id } = ctx.params;
    if (!idRegExp.test(id)) {
      throwErrors(`${id}: wrong component id`, ERROR_TYPE.badRequest);
    }
    // 通过直接写sql的方式查询关联关系
    const sql = `select a.material_id from  materials_user_components__user_components_materials a where \`user-component_id\`=${id}`;
    const data = await strapi.connections.default.raw(sql);
    return { count: data?.[0].length || 0 };
  }
};
