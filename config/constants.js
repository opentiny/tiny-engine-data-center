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
module.exports = {
  MASTER_UUID: 'dfb2c162-351f-4f44-ad5f-899831311129',
  WORDS: {
    noOrgInfo: 'Unable to get organization information',
    noUserInfo: 'Unable to get user information.',
    notExist: 'This user does not exist',
    forbidden: 'User operation without permission or data does not exist',
    isGuest: 'Guest user has no access rights',
    notFound: 'No data found',
    noPermission: 'User does not have this permission',
  },
  ERROR_TYPE: {
    unauthorized: 'unauthorized',
    forbidden: 'forbidden',
    badRequest: 'badRequest',
    notFound: 'notFound',
  },
  METHODS: {
    POST: 'POST',
    GET: 'GET',
    PUT: 'PUT',
    DELETE: 'DELETE',
    CONNECT: 'CONNECT',
    OPTIONS: 'OPTIONS',
    TRACE: 'TRACE',
    PATCH: 'PATCH',
  },
  TINY_BUILDER_USER: {
    whitelist: 'whitelist',
    develop: 'develop',
    backend: 'backend',
  },
  CUSTOM_HEADER: {
    xTenant: 'x-tinybuilder-tenant',
    xUser: 'x-tinybuilder-user',
    xRole: 'x-tinybuilder-role',
  },
  ROLES: {
    master: 'Master',
    guest: 'Guest',
    admin: 'Tinybuilder_Admin',
    tenantAdmin: 'Tinybuilder_Tenant_Admin',
    platformAdmin: 'Tinybuilder_Platform_Admin',
    appAdmin: 'Tinybuilder_App_Admin',
    appDev: 'Tinybuilder_App_Developer',
    acquiescence: 'Tinybuilder_Default',
  },
  CANVAS_STATE: {
    release: 'release',
    occupy: 'occupy',
  },
  SYS_USER_UUID: {
    master: 'dfb2c162-351f-4f44-ad5f-899831311129',
    admin: '9e23f6c9-b318-447d-98a5-783740c6865c',
    tenantAdmin: '36848bf0-5ee0-4849-87b5-1f2f3dd042ed',
    platformAdmin: '8d9ea117-5ae5-4b62-8584-0090343f095f',
    appAdmin: '4e66721c-ae51-4351-83f0-195383b08ef6',
    appDev: '1ff2ec9d-f68d-465a-938b-9f455d97ba0e',
    guest: '4377d957-36cb-4603-a989-1f01abeb917b',
  },
  NOT_VERIFY_ORG_CTRL: ['tenant', 'materials', 'block', 'user-components', 'tasks', 'ecology-extensions'],
  PUBLIC_SCOPE: {
    PRIVATE: 0,
    FULL_PUBLIC: 1,
    PUBLIC_IN_TENANTS: 2,
  },
  OFFICIAL_TYPE: {
    NONE_OFFICIAL: 0,
    OFFICIAL: 1,
    TINY_OFFICIAL: 2,
  },
  DEFAULT_TYPE: {
    NONE_DEFAULT: 0,
    DEFAULT: 1,
    TINY_DEFAULT: 2,
  },
  TINY_ACCOUNTS: ['p_webcenter'],
  GUEST_ORG: 'guestGroup',
  // 单元类型取值应该和 表的controller相同
  UNIT_TYPE: {
    tenant: 'tenant',
    platforms: 'platforms',
    apps: 'apps',
  },
  // 权限类型
  AUTH_TYPE: {
    grant: 1,
    acquiescence: 2,
  },
  // 禁止拷贝的应用属性
  UNCOPYABLE_APP_PROPS: [
    'id',
    'app_website',
    'obs_url',
    'home_page',
    'state',
    'published',
    'git_group',
    'project_name',
    'branch',
    'tenant',
    'createdBy',
    'updatedBy',
    'latest',
    'platform_history',
    'editor_url',
    'visit_url',
    'is_demo',
    'is_default',
    'set_default_by',
    'set_template_by',
    'set_template_time',
    'template_type',
    'data_hash',
  ],
  // inhuawei 地址
  INHUAWEI_REGISTRY: {
    unpkg: '',
  },
  TEMPLATE_PUBLISH_STATE: {
    PUBLISHED: 1,
    UN_PUBLISHED: 0,
  },
  VERSION_REG: /\d+(\.\d+){2}/,
};
