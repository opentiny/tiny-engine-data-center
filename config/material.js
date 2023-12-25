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
const { PUBLIC_SCOPE, OFFICIAL_TYPE, DEFAULT_TYPE, TINY_ACCOUNTS } = require('./constants');

const isTruthy = (data) => typeof data === 'number' || Boolean(data); // truthy except number, let num always return true

const handlePublicScope = (publicScope, data) => {
  if ([PUBLIC_SCOPE.PRIVATE, PUBLIC_SCOPE.FULL_PUBLIC].includes(publicScope)) {
    data.public_scope_tenants = [];
    return data;
  }
  return data;
};

const handleOfficialAndDefault = (user, data) => {
  if (user?.resetPasswordToken) {
    return data;
  }
  // 兼容布尔类型
  data.default = data.default ? DEFAULT_TYPE.DEFAULT : DEFAULT_TYPE.NONE_DEFAULT;
  if (data.default === DEFAULT_TYPE.DEFAULT && TINY_ACCOUNTS.includes(user.resetPasswordToken)) {
    data.default = DEFAULT_TYPE.TINY_DEFAULT;
  }
  if (data.default === DEFAULT_TYPE.TINY_DEFAULT && !TINY_ACCOUNTS.includes(user.resetPasswordToken)) {
    data.default = DEFAULT_TYPE.DEFAULT;
  }

  data.official = data.official ? OFFICIAL_TYPE.OFFICIAL : OFFICIAL_TYPE.NONE_OFFICIAL;
  if (data.official === OFFICIAL_TYPE.OFFICIAL && TINY_ACCOUNTS.includes(user.resetPasswordToken)) {
    data.official = DEFAULT_TYPE.TINY_OFFICIAL;
  }
  if (data.official === OFFICIAL_TYPE.TINY_OFFICIAL && !TINY_ACCOUNTS.includes(user.resetPasswordToken)) {
    data.official = OFFICIAL_TYPE.OFFICIAL;
  }

  return data;
};

const handleTinyReserved = (user, data, isOnCreate = false) => {
  // 创建添加 tiny_reserved 字段
  if (isOnCreate) {
    data.tiny_reserved = TINY_ACCOUNTS.includes(user?.resetPasswordToken);
    return data;
  }

  // 修改时校验 tiny_reserved 字段
  if (Object.prototype.hasOwnProperty.call(data, 'tiny_reserved')) {
    data.tiny_reserved = TINY_ACCOUNTS.includes(user?.resetPasswordToken);
  }

  return data;
};

/**
 * 查找物料：组件、区块、物料包
 * @param {*} user
 * @param {*} query
 * @param {*} serviceName  e.g. 'user-components'
 * @param {*} relationName 与租户表关联字段名 e.g. 'user_components'
 * @param {Number} publicScopeMode 物料相关公开域的筛选模式： 0 默认， 1 query参数控制，其余待定
 * @returns
 */
const findAllMaterial = async (user, query, serviceName, relationName, populate = [], publicScopeMode = 0) => {
  const { _limit, _start = '0', ...restQuery } = query;
  const allMaterials = await strapi.services[serviceName].find({ ...restQuery, _limit: -1 }, [
    'public_scope_tenants',
    ...populate,
  ]);
  let filtedMaterials = allMaterials;
  if (publicScopeMode !== 1) {
    filtedMaterials = allMaterials.filter(defaultPublicFilter(user));
  }

  const range = [0, filtedMaterials.length]; // 分页查询范围
  const start = getNumInRange(range, _start);
  const end =
    !isNaN(parseInt(_limit, 10)) && _limit !== '-1' ? getNumInRange(range, start + parseInt(_limit, 10)) : range[1];
  return {
    list: filtedMaterials.slice(start, end),
    total: filtedMaterials.length,
  };
};

const getNumInRange = ([min, max], _num, defaultMin = true) => {
  let num = typeof _num === 'number' ? _num : parseInt(_num, 10);
  if (isNaN(num)) {
    num = defaultMin ? min : max;
  }
  return Math.max(min, Math.min(max, num));
};

const filterUserField = (item) =>
  item && { id: item.id, username: item.username, resetPasswordToken: item.resetPasswordToken };

const filterHistoriesField = (histories) => {
  return histories.map(({ id, version }) => ({ id, version }));
};

const defaultPublicFilter = (user) => (item) => {
  // 全公开物料
  if (item.public === PUBLIC_SCOPE.FULL_PUBLIC) {
    return true;
  }
  // 自己创建的物料
  const creatorId = item.createdBy?.id || item.createdBy;
  if (user && creatorId === user.id) {
    return true;
  }
  // 对租户公开的物料
  if (
    user &&
    item.public === PUBLIC_SCOPE.PUBLIC_IN_TENANTS &&
    item.public_scope_tenants.map((row) => row.id).includes(parseInt(user.tenant?.id, 10))
  ) {
    return true;
  }

  return false;
};

module.exports = {
  isTruthy,
  handlePublicScope,
  handleOfficialAndDefault,
  handleTinyReserved,
  findAllMaterial,
  filterUserField,
  filterHistoriesField,
};
