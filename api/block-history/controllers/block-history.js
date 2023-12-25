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


module.exports = {
  async find(ctx) {
    const blockId = ctx.query.block;
    if (!blockId) {
      return strapi.services['block-history'].find(ctx.query);
    }
    const entities = await strapi.services['block-history'].findByBlockId(blockId);
    return entities.map((entity) => {
      const history = sanitizeEntity(entity, { model: strapi.models['block-history'] });
      history.content = JSON.parse(history.content);
      return history;
    });
  },
};
