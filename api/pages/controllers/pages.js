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
const { throwErrors, formatQueryResult } = require('../../../config/toolkits');
const { ERROR_TYPE, CANVAS_STATE, TINY_ACCOUNTS } = require('../../../config/constants');

module.exports = {
  async checkUpdate(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;
    const { user } = ctx.session;
    let { occupier } = await strapi.services.pages.findOne({ id });
    // 当前页面没有被锁定就请求更新页面接口，提示无权限
    if (occupier === null) {
      throwErrors('Please unlock the page before editing the page', ERROR_TYPE.forbidden);
    }
    // 当页面被人锁定时，如果提交update请求的人不是当前用户，提示无权限
    if (user.id !== occupier.id) {
      throwErrors(
        `The current page is being edited by ${occupier.username}(${occupier.resetPasswordToken})`,
        ERROR_TYPE.forbidden
      );
    }
    // 删除更新请求中的占用者数据属性，防止有人瞎改
    delete body.occupier;
    const result = await strapi.services.pages.update({ id }, body);
    return sanitizeEntity(result, { model: strapi.models.pages });
  },

  async updateOccupier(ctx) {
    const { id } = ctx.params;
    const { state } = ctx.request.query;
    const { user } = ctx.session;
    let { occupier } = await strapi.services.pages.findOne({ id });
    occupier = occupier && trimUserData(occupier);
    const isICanDoIt = iCanDoIt(occupier, user);
    if (isICanDoIt) {
      const arg = state === CANVAS_STATE.occupy ? user.id : null;
      const result = await strapi.services.pages.update(
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
    let { occupier } = await strapi.services.pages.findOne({ id });
    // 如果当前页面没人占用 或者是自己占用 可以删除该页面
    if (iCanDoIt(occupier, user)) {
      const res = await strapi.services.pages.delete({ id });
      return sanitizeEntity(res, { model: strapi.models.pages });
    }
    return throwErrors(
      `The current page is being edited by ${occupier.username}(${occupier.resetPasswordToken})`,
      ERROR_TYPE.forbidden
    );
  },

  async deleteByProjectId(ctx) {
    const { pid } = ctx.params;
    const entity = await strapi.services.pages.delete({ project: pid });
    return sanitizeEntity(entity, { model: strapi.models.pages });
  },

  async list(ctx) {
    const { aid } = ctx.params;
    const sql = `
    SELECT A.id,
           A.name, 
           A.route,
           A.app,
           A.created_at,
           A.updated_at,
           A.parent_id AS parentId,
           A.group,
           A.is_page AS isPage,
           A.is_default AS isDefault,
           A.id=B.home_page AS isHome,
           A.occupier,
           C.id AS occupier_id,
           C.username AS occupier_username,
           C.email AS occupier_email,
           C.resetPasswordToken AS occupier_resetPasswordToken,
           C.blocked AS occupier_blocked,
           C.is_admin AS occupier_is_admin,
           C.is_public AS occupier_is_public
    from pages A
    LEFT JOIN apps B ON A.app = B.id
    LEFT JOIN \`users-permissions_user\` C ON C.id = A.occupier
    where A.app=?
    `;
    const data = await strapi.connections.dbDefault.raw(sql, [aid]);
    return formatQueryResult(data?.[0] ?? [], ['occupier']) || [];
  },

  // 重写find方法，精简页面列表接口
  async find(ctx) {
    const result = await strapi.services.pages.find(ctx.request.query);
    // 通过sanitizeEntity includeFields 属性过滤列表字段，对列表瘦身
    return result.map((item) =>
      sanitizeEntity(item, {
        model: strapi.models.pages,
        includeFields: ['app', 'name', 'occupier', 'parent_id', 'is_home', 'is_page', 'group', 'route', 'is_default'],
      })
    );
  },

  // 将运行sql方法迁移至页面数据表
  // 注意 (页面表数据量级增加，需考虑批量更新对数据库带来的性能影响)
  async rawOneSql(ctx) {
    let { body } = ctx.request;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const { res } = body;
    const whenThen = res.data.map(([id, depth]) => `WHEN ${id} THEN ${depth}`);
    const sql = `UPDATE folders SET depth = CASE id ${whenThen.join(' ')} END WHERE id IN (${res.range.join(',')})`;
    const result = await strapi.connections.dbDefault.raw(sql);
    if (result.length) {
      return result[0];
    }
    return result;
  },
  async create(ctx) {
    const { user } = ctx.session;
    let { body } = ctx.request;
    const result = await strapi.services.pages.create({ ...body, occupier: user.id });
    return sanitizeEntity(result, { model: strapi.models.pages });
  },

  // 获取页面content_blocks 中全部的子区块（包括显示引入和子区块隐式引入）构建产物数据
  async findAllBlockHistories(ctx) {
    const { id } = ctx.params;
    const { fieldsRange = 'tiny' } = ctx.request.query;
    const pageInfo = await strapi.services.pages.findOne({ id }, []);
    const blockHistories = await strapi.services['find-content-block'].findAllBlockHistories(pageInfo.content_blocks);
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
