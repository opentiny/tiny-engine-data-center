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
const { sanitizeEntity } = require('strapi-utils/lib');
const { ERROR_TYPE } = require('../../../config/constants');
const { throwErrors } = require('../../../config/toolkits');
const { VERSION_REG } = require('../../../config/constants');

module.exports = {
  // 根据materialId, 批量删除物料资产包
  async batchDelete(ctx) {
    const { mid } = ctx.query;
    if (!mid) {
      throwErrors('Missing  parameter', ERROR_TYPE.badRequest);
    }
    const entity = await strapi.services['material-histories'].delete({
      material: mid,
    });
    // 删除与组件的关联关系
    const cleanUpFlag = await strapi.services['material-histories'].cleanUpComponentRelByMid(mid);
    strapi.log.info('material-histories cleanUpComponentRelByMid result:', cleanUpFlag);

    return sanitizeEntity(entity, {
      model: strapi.models['material-histories'],
    });
  },

  // 查询物料下属物料资产包是否关联了设计器
  async associated(ctx) {
    const { mid } = ctx.query;
    if (!mid) {
      throwErrors('Missing  parameter', ERROR_TYPE.badRequest);
    }
    const associated = await strapi.services['material-histories'].queryAssociation(mid);
    return {
      associated,
    };
  },

  async findSimple(ctx) {
    const materialHistories = await strapi.services['material-histories'].find(ctx.query);
    return sanitizeEntity(materialHistories, {
      model: strapi.models['material-histories'],
      includeFields: ['id', 'version', 'created_at', 'description'],
    })
      .filter(({ version }) => VERSION_REG.test(version))
      .reverse();
  },
};
