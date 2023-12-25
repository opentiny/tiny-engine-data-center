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
const { findAllMaterial, filterUserField } = require('../../../config/material');
const { throwErrors } = require('../../../config/toolkits');

module.exports = {
  findBlockNotInGroup(id, params = {}) {
    const { label_contains, author, tenant, tag, limit = 100, offset = 0 } = params;
    const knex = strapi.connections.dbDefault;
    return knex('blocks')
      .whereNotIn('id', function () {
        this.select('block_id').from('blocks_groups__block_groups_blocks').where('block-group_id', id);
      })
      .modify((queryBuilder) => {
        if (typeof author === 'string') {
          queryBuilder.where({ author });
        } else if (Array.isArray(author)) {
          queryBuilder.whereIn('author', author);
        } else {
          throwErrors('the parameter is incorrect', ERROR_TYPE.badRequest);
        }
      })
      .modify((queryBuilder) => {
        if (typeof tenant === 'string') {
          queryBuilder.where({ tenant });
        } else if (Array.isArray(tenant)) {
          queryBuilder.whereIn('tenant', tenant);
        } else {
          throwErrors('the parameter is incorrect', ERROR_TYPE.badRequest);
        }
      })
      .modify((queryBuilder) => {
        if (typeof tag === 'string' && /^\w+$/.test(tag)) {
          queryBuilder.where('tags', 'like', `%"${tag}"%`);
        }
      })
      .modify((queryBuilder) => {
        if (label_contains) {
          queryBuilder.where('label', 'like', `%${label_contains}%`);
        }
      })
      .limit(limit)
      .offset(offset);
  },
  allTags() {
    const knex = strapi.connections.dbDefault;
    return knex.select('tags').from('blocks').whereNotNull('tags');
  },
  async listNew(params) {
    const { categoryId, appId, createdBy } = params;
    // 如果有 categoryId, 只查category下的blocks
    if (categoryId) {
      const category = await strapi.query('block-category').findOne({ id: categoryId });
      return category.blocks;
    }
    // 如果没有 categoryId
    // 1. 查询和 app 相关的所有 category
    // 2. 组合 categories 下的所有 blocks
    // 3. 查询个人创建的 blocks
    // 4. 将个人的和 categories 下的 blocks 合并去重
    const categories = await strapi.query('block-category').find({ app: appId });
    const appBlocks = categories.reduce((pre, cur) => {
      return pre.concat(cur.blocks || []);
    }, []);
    const personalBlocks = await strapi.query('Block').find({ createdBy });
    const retBlocks = [];
    personalBlocks.concat(appBlocks).forEach((block) => {
      const isFind = retBlocks.find((retBlock) => {
        return retBlock.id === block.id;
      });
      if (!isFind) {
        retBlocks.push(block);
      }
    });
    return retBlocks;
  },

  async findBlocks(user, query, includeFields) {
    const { list } = await findAllMaterial(user, query, 'block', 'blocks', [
      'createdBy',
      'occupier',
      'categories',
      'histories',
    ]);
    const modelFilter = { model: strapi.models.block };
    if (includeFields) {
      modelFilter.includeFields = includeFields;
    }
    return list.map((item) => {
      const { histories, ...rest } = item;
      const histories_length = histories.filter((history) => ![null, 'N/A'].includes(history.version)).length;
      const block = sanitizeEntity(
        {
          ...rest,
          createdBy: filterUserField(item.createdBy),
          occupier: filterUserField(item.occupier),
        },
        modelFilter
      );
      block.histories_length = histories_length;
      return block;
    });
  },
};
