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

const filterBlocks = (blocks) =>
  blocks.map(({ id }) => ({
    id,
  }));

module.exports = {
  async tinyFind(ctx) {
    const filter = ctx.request.query;
    const list = await strapi.services['block-groups'].find(filter);
    return list.map((item) =>
      sanitizeEntity(
        {
          ...item,
          blocks: filterBlocks(item.blocks),
        },
        {
          model: strapi.models['block-groups'],
        }
      )
    );
  },

  async find(ctx) {
    const res = await strapi.services['block-groups'].find(ctx.query);
    const groups = res.map(async (item) => {
      const group = sanitizeEntity(item, { model: strapi.models['block-groups'] });
      const blockRelations = await strapi.services['blocks-carriers-relation'].find({
        host: group.id,
        host_type: 'blockGroup',
      });
      group.blocks.forEach((block) => {
        block.current_version = blockRelations.find((relation) => relation.block === block.id)?.version || '';
      });
      return group;
    });
    return Promise.all(groups);
  },
};
