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
  async tinyFind(ctx) {
    const { app, name, category_id } = ctx.request.query;
    return strapi.services['block-category'].find({
      app,
      _or: [{ name }, { category_id }],
    });
  },
  async delete(ctx) {
    const { id } = ctx.params;
    const category = await strapi.services['block-category'].findOne({ id });
    if (category.blocks.length > 0) {
      throwErrors('category is not empty.', ERROR_TYPE.badRequest);
    }
    return strapi.services['block-category'].delete({ id });
  },
};
