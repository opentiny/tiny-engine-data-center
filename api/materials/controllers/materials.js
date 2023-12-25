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
const { findAllMaterial, filterUserField, filterHistoriesField } = require('../../../config/material');

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const material = await strapi.services.materials.findOne({ id }, [
      'component_library',
      'user_components',
      'user_blocks',
      'latest',
      'createdBy',
      'material_histories',
      'public_scope_tenants',
    ]);
    const res = sanitizeEntity(
      {
        ...material,
        createdBy: filterUserField(material.createdBy),
        material_histories: filterHistoriesField(material.material_histories),
      },
      { model: strapi.models.materials }
    );
    let blocks = [];
    if (material?.latest?.id) {
      blocks = await _getUnpkgMaterialBlocks(material.latest.id);
    }
    return { ...res, blocks };
  },

  async find(ctx) {
    const { list } = await findAllMaterial(ctx.session.user, ctx.request.query, 'materials', 'materials', [
      'createdBy',
      'material_category_relations',
    ]);
    return list.map((item) =>
      sanitizeEntity(
        { ...item, createdBy: filterUserField(item.createdBy) },
        {
          model: strapi.models.materials,
          includeFields: [
            'id',
            'name',
            'framework',
            'version',
            'image_url',
            'description',
            'isDefault',
            'isOfficial',
            'createdBy',
            'tiny_reserved',
            'latest',
            'name_cn',
            'public',
            'public_scope_tenants',
            'material_category_relations',
          ],
        }
      )
    );
  },

  async count(ctx) {
    const { list } = await findAllMaterial(ctx.session.user, ctx.request.query, 'materials');
    return list.length;
  },
};

const _getUnpkgMaterialBlocks = async (materialHistoryId) => {
  const sql = `
    SELECT A.id, A.label, A.framework, A.created_at, A.name_cn, B.version, A.description, A.assets
    FROM blocks A
    INNER JOIN \`blocks_carriers_relations\` B ON A.id=B.block
    WHERE B.host_type='materialHistory' AND B.host=?
  `;

  const data = await strapi.connections.dbDefault.raw(sql, [materialHistoryId]);
  return data?.[0] || [];
};
