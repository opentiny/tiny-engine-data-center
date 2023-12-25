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
const mysql = require('mysql');

module.exports = {
  // 批量操作传入条目由服务端把控，建议每次只传递单一 key 的词条数据
  async bulkUpdateEntries(ctx) {
    const body = _parseBody(ctx);
    if (body.version === 'v1') {
      return _bulkOperateEntriesV1(body, true);
    }
    const tasks = body.entries.map(async (entry) => {
      const { key, lang, host, host_type } = entry;
      return strapi.services['i18n-entries'].update({ key, lang, host, host_type }, entry);
    });
    return Promise.all(tasks);
  },

  async bulkCreateEntries(ctx) {
    const body = _parseBody(ctx);
    if (body.version === 'v1') {
      return _bulkOperateEntriesV1(body);
    }
    const tasks = body.entries.map(async (entry) => {
      return strapi.services['i18n-entries'].create(entry);
    });
    return Promise.all(tasks);
  },
  // 超大量数据更新，如上传国际化文件，不返回插入或更新的词条
  async bulkInsertOrUpdate(ctx) {
    const body = _parseBody(ctx);
    let values = '';
    body.entries.forEach((entry, index) => {
      const { key, lang, host, host_type, content } = entry;
      values += `${index === 0 ? '' : ','}(${mysql.escape(key)}, ${lang}, ${host}, '${host_type}',${mysql.escape(
        String(content)
      )})`;
    });
    const sql = `
    INSERT INTO 
      i18n_entries
      (\`key\`,lang, host, \`host_type\`, content) 
    VALUES 
      ${values}
    ON DUPLICATE KEY UPDATE
      content=VALUES(content)
    `;
    return strapi.connections.dbDefault.raw(sql);
  },

  async bulkDeleteEntries(ctx) {
    const body = _parseBody(ctx);
    return strapi.services['i18n-entries'].delete(body.params);
  },
};

const _parseBody = (ctx) => {
  let { body } = ctx.request;
  if (typeof body === 'string') {
    body = JSON.parse(body);
  }
  return body;
};

const _getEntriesSqlFragment = (entries) => {
  let values = '';
  entries.forEach((entry, index) => {
    const { key, lang, host, host_type, content } = entry;
    values += `${index === 0 ? '' : ','}(${mysql.escape(key)}, ${lang}, ${host}, '${host_type}',${mysql.escape(
      String(content)
    )})`;
  });
  return values;
};

const _bulkOperateEntriesV1 = async (body, isUpdate = false) => {
  const langs = Object.keys(body.entries);
  const langsData = await strapi.services['i18n-lang'].find({
    lang_in: langs,
  });
  // 序列化词条数据
  const entries = langsData
    .map(({ id, lang }) => {
      const unfromatedEntries = body.entries[lang];
      return unfromatedEntries.map((entry) => {
        entry.lang = id;
        return entry;
      });
    })
    .flat();

  const sql = `
    ${isUpdate ? 'REPLACE' : 'INSERT'} INTO 
      i18n_entries
      (\`key\`,lang, host, \`host_type\`, content) 
    VALUES 
      ${_getEntriesSqlFragment(entries)}
    `;

  const result = await strapi.connections.dbDefault.raw(sql);
  return result?.[0];
};
