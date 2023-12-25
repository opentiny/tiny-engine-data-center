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
const knex = require('strapi-connector-bookshelf/lib/knex');

module.exports = {
  async initialize() {
    const count = await strapi.query('tenant').count();

    if (count === 0) {
      await strapi.query('tenant').create({
        tenant_id: 'public',
        name_cn: '公共租户',
        name_en: 'Public Tenant',
        description: 'Default tenant for new user to explore.',
      });
    }
  },
  findBlockFilterConditions() {
    return knex('tenants').whereIn('id', function () {
      this.select('tenant').from('blocks').distinct();
    });
  },
};
