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
const { ERROR_TYPE } = require('../../../config/constants');
const { throwErrors } = require('../../../config/toolkits');
const {
  isTruthy,
  handlePublicScope,
  handleTinyReserved,
  findAllMaterial,
  filterUserField
} = require('../../../config/material');

const idRegExp = /^[0-9]+$/; // Tips: 非必要情况下正则不要用g参数；如果必须使用，需要尽量限制使用范围，不要设为全局变量。

module.exports = {

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
