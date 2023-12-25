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
const formatQueryResult = async (sql, injects) => {
  const data = await strapi.connections.dbDefault.raw(sql, injects);
  const result = (data && data[0]) || [];
  if (result && result.length) {
    return true;
  } else {
    return false;
  }
};

module.exports = {
  // 查询物料名下的物料资产包是否关联了设计器
  queryAssociation(materialId) {
    const sql = `
      select 
        id 
      from 
        platforms 
      where 
        material_history in (select id from material_histories where material=?)
    `;
    return formatQueryResult(sql, [materialId]);
  },

  // 根据物料id 清理所属全部物料资产包关联的组件
  cleanUpComponentRelByMid(materialId) {
    const sql = `
      DELETE 
      from material_histories_components__user_components_mhs 
      where \`material-history_id\` in (
        select id from material_histories where material=?
      ) 
    `;
    return formatQueryResult(sql, [materialId]);
  },
};


