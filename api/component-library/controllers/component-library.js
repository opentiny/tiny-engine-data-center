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

const { sanitizeEntity } = require("strapi-utils");
const { throwErrors } = require('../../../config/toolkits');
const { ERROR_TYPE } = require('../../../config/constants');

module.exports = {
  async delete(ctx) {
    const { id } = ctx.params;
    try{
      const res = await strapi.services['component-library'].delete({ id });
      try{
        await strapi.services['user-components'].delete({ library: id });
      } catch (error) {
        strapi.log.error('user-component delete failed', error);
        throwErrors('user-component delete failed.', ERROR_TYPE.badRequest);
      }
      return sanitizeEntity(res, {model: strapi.models['component-library']});

    }catch(error) {
      strapi.log.error('component-library delete failed', error);
      throwErrors('component-library delete failed.', ERROR_TYPE.badRequest);
    }
    
    return sanitizeEntity(res, {model: strapi.models['component-library']});;
  }
};
