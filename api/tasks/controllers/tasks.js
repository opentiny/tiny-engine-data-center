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

module.exports = {
  async status(ctx) {
    const { query } = ctx;
    const { uniqueIds, taskTypeId } = query;
    const ids = Array.isArray(uniqueIds) ? [...uniqueIds] : [uniqueIds];
    const queryPromises = ids.map((uniqueId) => {
      return strapi.services.tasks.find({
        taskTypeId,
        uniqueId,
        _sort: 'created_at:desc',
      });
    });
    const result = await Promise.all(queryPromises);
    return result.map((item) => item?.[0] && sanitizeEntity(item[0], { model: strapi.models.tasks }));
  },
};
