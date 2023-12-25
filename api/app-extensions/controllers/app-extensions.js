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
function parseBody(ctx) {
  let { body } = ctx.request;
  if (typeof body === 'string') {
    body = JSON.parse(body);
  }
  return body;
}

module.exports = {
  async bulkDeleteExtension(ctx) {
    return strapi.services['app-extensions'].delete(ctx.request.query);
  },

  async updateByUK(ctx) {
    const body = parseBody(ctx);
    const { app, name, category, type } = body;
    const appName = !app || !name;
    const categoryType = !category || !type; 
    if (appName || categoryType) {
      throw new Error('Missing "app","name","type" or "category" parameter');
    }
    return strapi.services['app-extensions'].update({ app, name }, body);
  },
};
