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
const {
  throwErrors,
  getAdminRole,
  getTenantInfo,
  setGuestAuth,
  getMasterRole,
  getTenantDemoApps,
  getDefaultRole,
} = require('../../../config/toolkits');

const {
  WORDS,
  ERROR_TYPE,
  CUSTOM_HEADER: { xTenant },
  MASTER_UUID,
  NOT_VERIFY_ORG_CTRL,
  GUEST_ORG,
  UNIT_TYPE,
} = require('../../../config/constants');

const permissionPlugin = 'users-permissions';

// 设置demo应用的游客权限
const setDemoAppGuestAuth = async (user, tenantId, ninAppIds) => {
  // 查询组织内的demo应用，并附加到权限列表中, 并设置为系统默认权限
  const demoApps = await getTenantDemoApps(tenantId, ninAppIds);
  const tasks = demoApps.map((app) =>
    setGuestAuth(
      user,
      tenantId,
      {
        unit_type: UNIT_TYPE.apps,
        unit_id: app.id,
      },
      2,
    )
  );

  return Promise.all(tasks);
};

// 更新用户组织信息
const updateTenant = async (ctx, user) => {
  const {
    request: { header },
  } = ctx;
  const tenantId = header[xTenant];
  user.tenant = {
    id: tenantId,
  };
};

// 更新用户权限信息: 对游客进行权限更新, 确保数据逻辑的一致性
const updateAuths = async (user) => {
  const { tenant = {}, id: userId } = user;
  // 对于没有选择组织的情况，auths数组返回空数组
  if (!tenant.id) {
    user.auths = [];
    return;
  }

  // 获取组织信息,防止组织被删除时信息失效
  const tenantInfo = await getTenantInfo(tenant.id);
  if (!tenantInfo || !tenantInfo.tenant_id) {
    throwErrors(WORDS.noOrgInfo, ERROR_TYPE.badRequest);
  }

  // 获取组织内权限数据
  let auths = await strapi.services['auth-users-units-role'].findTenantAuths({
    tenant: tenantInfo.id,
    user: userId,
  });

  // 设置组织内的demo应用
  const ninAppids = auths.filter((auth) => auth.unit.type === UNIT_TYPE.apps).map((auth) => auth.unit.id);
  const demoAppAuths = await setDemoAppGuestAuth(user, tenant.id, ninAppids);
  if (demoAppAuths.length) {
    // 存在demo应用，更新权限列表
    auths = await strapi.services['auth-users-units-role'].findTenantAuths({
      tenant: tenantInfo.id,
      user: userId,
    });
  }

  if ((!auths || !auths.length) && tenantInfo.tenant_id === GUEST_ORG) {
    // 对于系统默认的游客组织，每个用户都应该有游客的权限
    const auth = await setGuestAuth(user, tenantInfo.id);
    auth.unit = {
      id: auth.unit_id,
      type: auth.unit_type,
      name: GUEST_ORG,
    };
    // 这条权限数据会比正常通过findTenantAuths查询的标准数据臃肿，但是标准数据有的内容，这条数据都有
    auths = [auth];
  }

  // 对于其他组织 用户没有申请加入，auths数组为空正常
  user.auths = auths;
};

// 校验session内容
const checkSession = (user) => {
  if (!user) {
    throwErrors(WORDS.noUserInfo, ERROR_TYPE.unauthorized);
  }
};

// 校验组织id
const checkTenant = (ctx, user) => {
  const { tenant } = user;
  const { controller } = ctx.request.route;
  if (NOT_VERIFY_ORG_CTRL.includes(controller)) {
    return;
  }
  if (!tenant || !tenant.id) {
    const tenantId = ctx.request.header[xTenant];
    if (!tenantId) {
      throwErrors(WORDS.noOrgInfo, ERROR_TYPE.badRequest);
    }
    ctx.session.user.tenant = {
      id: tenantId,
    };
  }
};

// 校验用户信息
const checkUserInfo = (user) => {
  const { id, blocked } = user;
  if (!id) {
    throwErrors(WORDS.notExist, ERROR_TYPE.unauthorized);
  }
  // 如果用户是系统拉黑用户（理论上不会有）
  if (blocked) {
    throwErrors(WORDS.forbidden, ERROR_TYPE.forbidden);
  }
};

// 校验权限中的角色信息
const checkRole = async (ctx, user) => {
  const { auths, is_admin, confirmationToken } = user;
  const isMaster = confirmationToken === MASTER_UUID;
  const roleIds = auths.map((auth) => auth.role.id);

  // 全局开发者放入特定的角色
  if (isMaster) {
    const masterRole = await getMasterRole();
    roleIds.push(masterRole.id);
  }
  // 超级管理员 放入特定角色
  if (is_admin) {
    const adminRole = await getAdminRole();
    roleIds.push(adminRole.id);
  }
  // 对于在这个组织中没有任何角色的用户，提示无权限访问
  if (!roleIds.length) {
    const { controller } = ctx.request.route;
    // 对于无需传入组织id的接口，用户身份无法确定，授予默认身份权限
    if (NOT_VERIFY_ORG_CTRL.includes(controller)) {
      const defaultRole = await getDefaultRole();
      roleIds.push(defaultRole.id);
    } else {
      throwErrors(WORDS.forbidden, ERROR_TYPE.forbidden);
    }
  }

  ctx.tinybuilderRoleIds = roleIds;
};

// 校验用户权限信息
const checkRolePermission = async (ctx) => {
  // 首先把session中的role去掉，换成auths
  const { plugin, controller, action } = ctx.request.route;
  const roleIds = ctx.tinybuilderRoleIds;
  const permission = await strapi.query('permission', permissionPlugin).findOne(
    {
      role: roleIds,
      type: plugin || 'application',
      controller,
      action,
      enabled: true,
    },
    []
  );
  // 对该用户角色的请求进行鉴权，若无权限，则返回 403
  if (!permission) {
    throwErrors(WORDS.forbidden, ERROR_TYPE.forbidden);
  }
  return permission;
};

// 校验权限是否有效
const checkPermission = async (ctx, next) => {
  const permission = await checkRolePermission(ctx);
  if (permission.policy) {
    return strapi.plugins[permissionPlugin].config.policies[permission.policy](ctx, next);
  }
  return next();
};

const checkUser = async (ctx) => {
  const { user } = ctx.session;
  checkSession(user);
  // 每次调用ctx.session.user 都会连接redis进行一次get操作，能省则省
  updateTenant(ctx, user);
  checkTenant(ctx, user);
  await updateAuths(user);
  checkUserInfo(user);
  await checkRole(ctx, user);
};

const updateUser = async (ctx) => {
  const { user } = ctx.session;
  checkSession(user);
  updateTenant(ctx, user);
  await updateAuths(user);
};

module.exports = {
  updateUser,
  checkUser,
  checkPermission,
};
