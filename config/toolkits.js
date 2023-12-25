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
const _ = require('lodash');
const { ROLES, GUEST_ORG } = require('./constants');

const authService = 'user-tenants-role';
const plugin = 'users-permissions';
// 获取全局开发者角色
const getMasterRole = () => {
  return strapi.query('role', plugin).findOne(
    {
      name: ROLES.master,
    },
    []
  );
};

// 获取超级管理员角色
const getAdminRole = () =>
  strapi.query('role', plugin).findOne(
    {
      name: ROLES.admin,
    },
    []
  );

// 获取默认身份id
const getDefaultRole = () =>
  strapi.query('role', plugin).findOne(
    {
      name: ROLES.acquiescence,
    },
    []
  );

// 获取组织信息
const getTenantInfo = (tenantId) => {
  return strapi.services.tenant.findOne(
    {
      id: tenantId,
    },
    []
  );
};

// 获取权限角色
const getAuthRole = async (tenantId, userId) => {
  if (!tenantId || !userId) {
    return {};
  }
  const tenantInfo = await getTenantInfo(tenantId);
  if (tenantInfo && tenantInfo.tenant_id === GUEST_ORG) {
    return getGuestRole();
  }
  const auth = await strapi.services[authService].findOne({
    user: userId,
    tenant: tenantId,
  });
  // 查看是否有权限或者 当前权限是否过期
  return !auth || isExpiredAuth(auth) ? {} : auth.role;
};

// 获取游客角色
const getGuestRole = () => {
  /**
   * 游客权限
   * 1. 可查看任何团队公开的数据 （设想未实现）
   * 2. 当前可查看各中心数据，无构建、CUD数据权限
   * 3. 不可查看我的相关页面
   */
  return strapi.query('role', plugin).findOne(
    {
      name: ROLES.guest,
    },
    []
  );
};

// 判断是否为组织管理员
const isTenantAdmin = ({ auths = [] }) => auths.some(({ role = {} }) => role.name === ROLES.tenantAdmin);

// 判断是否为游客
const isGuest = async (user) => {
  const { id, is_admin } = user;
  if (!id) {
    return true;
  }
  if (is_admin) {
    return false;
  }
  let authList = await strapi.services[authService].find({
    user: id,
    _limit: -1,
  });

  // 排查权限列表是否过期
  authList = authList.filter((auth) => !isExpiredAuth(auth));
  // 对于游客来说，他没有任何权限
  return !authList.length;
};

// 判断单元权限是否过期
const isExpiredUnitAuth = (auth = {}) => {
  const { unit, role } = auth;
  // 附着权限的单元\角色不存在
  return !unit || !unit.name || !role || !role.name;
};

// 判断权限是否失效
const isExpiredAuth = (auth = {}) => {
  const { tenant = {}, user = {}, role = {} } = auth;
  // 租户被删除了 或者 用户 角色被删了
  return !tenant.id || !user.id || !role.name;
};

const isExpired = (expired_time) => {
  // 没有配过期时间
  if (!expired_time) {
    return false;
  }
  const expiredTime = Date.parse(expired_time);
  if (isNaN(expiredTime)) {
    return false;
  }
  return expiredTime < Date.now();
};

// 判断当前执行环境
const allowDev = () => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  if (['alpha', 'ut'].includes(process.env.RUN_MODE)) {
    return true;
  }
  return false;
};

// 是否为me接口
const isMe = (ctx) => {
  const { controller, action } = ctx.request.route;
  return ['user-tenants-role', 'auth-users-units-role'].includes(controller) && action === 'me';
};

// 抛出错误
const throwErrors = (err, type) => {
  throw strapi.errors[type](err);
};

// 校验白名单
const isWhitelist = (ctx, whitelist) => {
  return pathFilter(ctx, whitelist);
};

// 校验黑名单
const isBlackList = (ctx, blacklist) => {
  return pathFilter(ctx, blacklist, true);
};

const pathFilter = (ctx, list, isBlack = false) => {
  return list.find((item) => {
    if (typeof item === 'function') {
      const flag = item(ctx);
      return isBlack ? !flag : flag;
    }
    const reg = new RegExp(item);
    const flag = reg.test(ctx.request.path);
    return isBlack ? !flag : flag;
  });
};

/**
 * 生成游客权限
 * @param {Object} userInfo 用户信息对象
 * @param {number} tenantId 组织id
 * @param {Object} unit 单元信息
 * @param {number} auth_type 权限类型： 1 人工授予  2 系统默认授予
 */
const setGuestAuth = async (userInfo, tenantId, unitParam, auth_type = 1) => {
  const guestRole = await getGuestRole();
  const unit = unitParam || {
    unit_id: tenantId,
    unit_type: 'tenant',
  };

  const param = {
    user: userInfo.id,
    unit_id: unit.unit_id,
    unit_type: unit.unit_type,
    role: guestRole.id,
    tenant: tenantId,
    auth_type,
  };
  const auth = await strapi.services['auth-users-units-role'].create(param).catch((e) => {
    strapi.log.error('toolkits.setGuestAuth error:', e.message || '');
  });
  return auth;
};

// 查询组织中的demo应用
const getTenantDemoApps = (tenantId, ninAppIds = []) => {
  return strapi.services.apps.find(
    {
      tenant: tenantId,
      is_demo: true,
      id_nin: ninAppIds,
    },
    []
  );
};

// 获取单个角色信息
const getRoleById = (id) => {
  return strapi.query('role', plugin).findOne(
    {
      id,
    },
    []
  );
};

// 根据输入name 筛选角色信息
const getRoleByName = (roleNames) => {
  return strapi.query('role', plugin).find(
    {
      name: roleNames,
    },
    []
  );
};

// 获取单一角色名称的单条角色数据
const getUniqueRoleByName = (name) => {
  return strapi.query('role', plugin).findOne(
    {
      name,
    },
    []
  );
};

// 获取系统内 公共账号 且为 超级管理员的用户
const getPublicSuperAdmin = () => {
  return strapi.query('user', plugin).find(
    {
      is_public: true,
      is_admin: true,
    },
    []
  );
};

// 删除对象上的属性
const deleteProps = (target, props) => {
  const attrs = typeof props === 'string' ? [props] : props;
  if (Array.isArray(attrs)) {
    for (const prop of attrs) {
      delete target[prop];
    }
  }
  return target;
};

// 按特定的查询名称对字段进行分组
const formatQueryResult = (queryResult, fields) => {
  if (!Array.isArray(queryResult)) {
    return queryResult;
  }
  return queryResult.map((res) => {
    const formatedRes = {};

    Object.keys(res).forEach((key) => {
      const { group, field } = _getFieldGroup(key, fields);
      // res[group] 为null，其关联子查询也必定为null
      if (field && res[group]) {
        if (!_.isObject(formatedRes[group])) {
          formatedRes[group] = {};
        }
        formatedRes[group][field] = res[key];
      } else {
        formatedRes[group] = res[key];
      }
    });
    return formatedRes;
  });
};

module.exports = {
  allowDev,
  throwErrors,
  isWhitelist,
  isBlackList,
  isMe,
  isExpired,
  isExpiredAuth,
  isExpiredUnitAuth,
  isGuest,
  isTenantAdmin,
  getAdminRole,
  getDefaultRole,
  getAuthRole,
  getGuestRole,
  getMasterRole,
  getTenantInfo,
  setGuestAuth,
  getTenantDemoApps,
  getRoleById,
  getRoleByName,
  getUniqueRoleByName,
  getPublicSuperAdmin,
  deleteProps,
  formatQueryResult,
};

const _getFieldGroup = (key, fields) => {
  let [keyword, ...attr] = key.split('_');
  attr = attr.join('_');
  if (fields.includes(keyword)) {
    return {
      group: keyword,
      field: attr,
    };
  }
  return {
    group: key,
  };
};
