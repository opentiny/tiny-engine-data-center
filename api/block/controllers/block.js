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
const { throwErrors } = require('../../../config/toolkits');
const {
  ERROR_TYPE,
  CANVAS_STATE,
  CUSTOM_HEADER,
  TINY_BUILDER_USER,
  PUBLIC_SCOPE,
  ROLES,
  TINY_ACCOUNTS,
} = require('../../../config/constants');
const {
  isTruthy,
  handlePublicScope,
  handleTinyReserved,
  findAllMaterial,
  filterUserField,
} = require('../../../config/material');

const updateBlock = async (ctx, id, body) => {
  let currentPublicScope = body.public;
  if (!isTruthy(currentPublicScope)) {
    currentPublicScope = (await strapi.services.block.findOne({ id })).public;
  }

  handlePublicScope(currentPublicScope, body);
  handleTinyReserved(ctx.session.user, body);

  const result = await strapi.services.block.update({ id }, body);
  return sanitizeEntity(result, { model: strapi.models.block });
};

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const block = await strapi.services.block.findOne({ id });
    if (block?.histories) {
      block.histories = block.histories.filter((item) => ![null, 'N/A'].includes(item.version));
    }
    return sanitizeEntity(block, { model: strapi.models.block });
  },

  async users(ctx) {
    const { list } = await findAllMaterial(ctx.session.user, ctx.request.query, 'block', 'blocks', []);
    const userSet = new Set();
    list.forEach((item) => !userSet.has(item.createdBy) && userSet.add(item.createdBy));
    const getUsersSql = `SELECT id, username, resetPasswordToken FROM \`users-permissions_user\` WHERE id IN(${Array.from(
      userSet
    ).join(',')}) `;
    const data = await strapi.connections.dbDefault.raw(getUsersSql);
    return (data && data[0]) || [];
  },
  async checkUpdate(ctx) {
    const { id } = ctx.params;
    const { body, header } = ctx.request;
    const { appId } = ctx.query;
    const { user } = ctx.session;
    const emptyUser = header[CUSTOM_HEADER.xUser];
    const isBackendUser = emptyUser === TINY_BUILDER_USER.backend;
    // 删除更新请求中的占用者数据属性，防止有人瞎改
    delete body.occupier;
    if (isBackendUser) {
      return updateBlock(ctx, id, body);
    }
    const block = await strapi.services.block.findOne({ id });
    // 如果创建者是本人, 直接更新
    if (user.id === block.createdBy.id) {
      return updateBlock(ctx, id, body);
    }
    // 如果创建者非本人
    // 区块为私有或公开: 无权限, 私有 1, 公开 0
    if ([PUBLIC_SCOPE.PRIVATE, PUBLIC_SCOPE.FULL_PUBLIC].includes(block.public)) {
      throwErrors(
        `The current block is created by ${block.createdBy.username}(${block.createdBy.resetPasswordToken})`,
        ERROR_TYPE.forbidden
      );
    }
    // 如果为半公开: 2
    // 半公开范围不包含该组织
    const tenant = block.public_scope_tenants.find((itTenant) => itTenant.id === Number(user.tenant.id));
    if (!tenant) {
      throwErrors(`does not include the tenant: ${user.tenant.id}`, ERROR_TYPE.forbidden);
    }
    // 区块是否属于应用
    const blockCategories = await strapi.services['block-category'].find({ app: appId });
    const appBlocks = blockCategories.reduce((pre, cur) => pre.concat(cur.blocks || []), []);
    const isFind = appBlocks.some((blockItem) => blockItem.id === Number(id));
    if (!isFind) {
      throwErrors('the category does not belong to the application.', ERROR_TYPE.forbidden);
    }
    // 更新者是否为区块所属应用的应用开发者，应用管理员
    const auths = await strapi.services['auth-users-units-role'].find({
      user: user.id,
      unit_type: 'apps',
      unit_id: appId,
      _or: [{ expired_time_gt: Date.now() }, { expired_time_null: true }],
    });
    const hasAuth = auths.some((auth) => {
      return [ROLES.appAdmin, ROLES.appDev].includes(auth.role.name);
    });
    // 更新者非区块所属应用的应用开发者，应用管理员
    if (!hasAuth) {
      throwErrors('user master be app admin or app developer', ERROR_TYPE.forbidden);
    }

    return updateBlock(ctx, id, body);
  },

  async updateOccupier(ctx) {
    const { id } = ctx.params;
    const { state } = ctx.request.query;
    const { user } = ctx.session;
    let { occupier } = await strapi.services.block.findOne({ id });
    occupier = occupier && trimUserData(occupier);
    const isICanDoIt = iCanDoIt(occupier, user);
    if (isICanDoIt) {
      const arg = state === CANVAS_STATE.occupy ? user.id : null;
      const result = await strapi.services.block.update(
        { id },
        {
          occupier: arg,
        }
      );
      occupier = trimUserData(result.occupier);
      return {
        operate: 'success',
        occupier,
      };
    }
    return {
      occupier,
      operate: 'failed',
    };
  },

  async checkDelete(ctx) {
    const { id } = ctx.params;
    const { user } = ctx.session;
    let { occupier } = await strapi.services.block.findOne({ id });
    // 如果当前页面没人占用 或者是自己占用 可以删除该页面
    if (iCanDoIt(occupier, user)) {
      const res = await strapi.services.block.delete({ id });
      return sanitizeEntity(res, { model: strapi.models.block });
    }
    return throwErrors(
      `The current block is being edited by ${occupier.username}(${occupier.resetPasswordToken})`,
      ERROR_TYPE.forbidden
    );
  },

  async findBlocks(ctx) {
    return getNotInGroupBlocks(ctx.session.user, ctx.query, ctx.params);
  },

  async countNotInGroupBlocks(ctx) {
    const blocks = await getNotInGroupBlocks(ctx.session.user, ctx.query, ctx.params);
    return blocks.length;
  },

  async findblocks(ctx) {
    const { id: groupId } = ctx.params;
    const entities = await strapi.services.block.findBlockNotInGroup(groupId, ctx.query);
    return entities.map((entity) => {
      const block = sanitizeEntity(entity, { model: strapi.models.block });
      block.content = JSON.parse(block.content);
      block.assets = JSON.parse(block.assets);
      block.tags = JSON.parse(block.tags);
      return block;
    });
  },

  async allTags() {
    const entities = await strapi.services.block.allTags();
    return Array.from(new Set(entities.map(({ tags }) => JSON.parse(tags)).flat()));
  },

  async listNew(ctx) {
    const { categoryId, appId } = ctx.query;
    const { id: createdBy } = ctx.session.user;
    const blocks = await strapi.services.block.listNew({ categoryId, createdBy, appId });
    return sanitizeEntity(blocks, {
      model: strapi.models.block,
      includeFields: ['label', 'screenshot', 'occupier', 'name_cn', 'last_build_info'],
    }).map((b) => ({ ...b, is_published: Boolean(b.last_build_info?.buildResult) }));
  },

  // 区块精简列表
  async list(ctx) {
    // 筛选 public的模式， 默认自动筛选， 1 通过query模式筛选，其余待定
    const { public_scope_mode } = ctx.request.query;
    delete ctx.request.query.public_scope_mode;
    const { list } = await findAllMaterial(
      ctx.session.user,
      ctx.request.query,
      'block',
      'blocks',
      ['createdBy', 'occupier'],
      Number(public_scope_mode)
    );
    const result = list.map((item) =>
      // sanitizeEntity 函数的includeFields配置项遇到null值的字段也不会过滤
      sanitizeEntity(
        { ...item, createdBy: filterUserField(item.createdBy), occupier: filterUserField(item.occupier) },
        {
          model: strapi.models.block,
          includeFields: ['label', 'screenshot', 'occupier'],
        }
      )
    );
    return result;
  },

  // 分页列表
  async pagination(ctx) {
    const { list, total } = await findAllMaterial(ctx.session.user, ctx.request.query, 'block', 'blocks', [
      'createdBy',
      'occupier',
    ]);
    const formatList = list.map((item) =>
      sanitizeEntity(
        { ...item, createdBy: filterUserField(item.createdBy), occupier: filterUserField(item.occupier) },
        { model: strapi.models.block }
      )
    );
    return {
      total,
      list: formatList,
    };
  },

  // 完整列表
  async find(ctx) {
    return strapi.services.block.findBlocks(ctx.session.user, ctx.request.query);
  },

  async count(ctx) {
    const { list } = await findAllMaterial(ctx.session.user, ctx.request.query, 'block', 'blocks');
    return list.length;
  },

  async create(ctx) {
    const data = { ...ctx.request.body };

    handlePublicScope(data.public, data);
    handleTinyReserved(ctx.session.user, data, true);

    const block = await strapi.services.block.create(data);
    return sanitizeEntity(block, { model: strapi.models.block });
  },

  async countMaterials(ctx) {
    const { id } = ctx.params;
    // 通过直接写sql的方式查询关联关系
    const sql = `
      select 
        material_id 
      from 
        block_histories_materials__materials_user_blocks
      where 
        \`block-history_id\` in (select id from block_histories where block_id=?)
    `;
    const sqlRes = await strapi.connections.dbDefault.raw(sql, [id]);
    return { count: sqlRes?.[0].length || 0 };
  },

  // 查找区块列表关联的国际化语种
  async findI18nLangs(ctx) {
    const blocks = await strapi.services.block.find({ id_in: ctx.request.query.blocks?.split(',') });
    const res = blocks.map((item) =>
      sanitizeEntity(
        { ...item },
        {
          model: strapi.models.block,
          includeFields: ['id', 'i18n_langs'],
        }
      )
    );
    return res;
  },

  // 修改区块列表关联的国际化语种
  async updateI18n(ctx) {
    const res = await this.update(ctx);
    return sanitizeEntity(
      {
        ...res,
      },
      {
        model: strapi.models.block,
        includeFields: ['id', 'i18n_langs'],
      }
    );
  },

  // 查询当前区块全部子区块的 content_blocks
  async findAllContentBlocks(ctx) {
    const { id } = ctx.params;
    const blockInfo = await strapi.services.block.findOne({ id });
    const contentBlocks = await strapi.services['find-content-block'].findContentBlockHistories(
      blockInfo.content_blocks
    );
    return {
      content_blocks: contentBlocks,
    };
  },

  // 查询当前区块的全部子区块构建产物数据
  async findAllBlockHistories(ctx) {
    const { id } = ctx.params;
    const { fieldsRange = 'tiny' } = ctx.request.query;
    const blockInfo = await strapi.services.block.findOne({ id }, []);
    const blockHistories = await strapi.services['find-content-block'].findAllBlockHistories(blockInfo.content_blocks);
    if (fieldsRange === 'tiny') {
      return sanitizeEntity(blockHistories, {
        model: strapi.models['block-history'],
        includeFields: ['label', 'content', 'block_id', 'path', 'label', 'message', 'version', 'npm_name', 'i18n'],
      });
    }
    return blockHistories;
  },
};

const iCanDoIt = (occupier, user) => {
  if (user.resetPasswordToken === TINY_ACCOUNTS[0]) {
    return true;
  }
  return occupier ? occupier.id === user.id : true;
};

const trimUserData = (user) => {
  return sanitizeEntity(user, {
    model: strapi.plugins['users-permissions'].models.user,
  });
};

const getNotInGroupBlocks = async (user, query, params) => {
  const { id: groupId } = params;
  query.tenant && delete query.tenant;
  const { _limit, _start = '0', ...restQuery } = query;

  const entities = await strapi.services.block.find({ ...restQuery, _limit: -1 }, ['public_scope_tenants', 'groups']);
  const filtedEntities = entities
    .filter((item) => {
      // 过滤已发布的
      if (!item.last_build_info || !item.content || !item.assets) {
        return false;
      }
      // 组过滤
      if (item.groups && item.groups.map((row) => row.id).includes(parseInt(groupId, 10))) {
        return false;
      }
      // 公开范围过滤
      if (item.public === PUBLIC_SCOPE.FULL_PUBLIC) { 
        return true;
      }
      if (
        user &&
        item.public === PUBLIC_SCOPE.PUBLIC_IN_TENANTS &&
        item.public_scope_tenants.map((row) => row.id).includes(parseInt(user.tenant?.id, 10))
      ) {
        return true;
      }

      return false;
    })
    .map((entity) => {
      const block = sanitizeEntity(entity, { model: strapi.models.block });
      ['content', 'assets'].forEach((item) => block[item] && delete block[item]);
      return block;
    });

  if (_limit && _start) { 
    return filtedEntities.slice(parseInt(_start, 10), parseInt(_start, 10) + parseInt(_limit, 10));
  }
  return filtedEntities;
};
