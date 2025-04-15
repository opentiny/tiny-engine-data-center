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
const { sanitizeEntity } = require('strapi-utils');
const { ERROR_TYPE, UNIT_TYPE, AUTH_TYPE } = require('../../../config/constants');
const { throwErrors, getPublicSuperAdmin, isTenantAdmin } = require('../../../config/toolkits');

const { isTruthy,
        findAllMaterial,
        handlePublicScope
} = require('../../../config/material');

module.exports = {
  async delete(ctx) {
    const { id } = ctx.params;
    const entity = await strapi.services['component-library'].delete({ id });
    try{
      await strapi.services['user-components'].delete({ library: id });
    } catch (error) {
      strapi.log.error('user-component delete failed', error);
      return res;
    }
    return res;
  }
};
