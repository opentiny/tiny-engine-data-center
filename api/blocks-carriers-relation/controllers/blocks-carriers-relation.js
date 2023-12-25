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
  async builkCreate(ctx) {
    const { body } = ctx.request;
    let values = '';
    body.forEach((carriersRelation, index) => {
      const { block, host, host_type, version } = carriersRelation;
      values += `${index === 0 ? '' : ','}(${block}, ${host}, '${host_type}','${version}')`;
    });
    const sql = `
    INSERT INTO 
      blocks_carriers_relations
      (block, host, \`host_type\`, version) 
    VALUES 
      ${values}
    ON DUPLICATE KEY UPDATE
      version=VALUES(version)
    `;
    const data = await strapi.connections.dbDefault.raw(sql);
    return data?.[0] || [];
  },
};
