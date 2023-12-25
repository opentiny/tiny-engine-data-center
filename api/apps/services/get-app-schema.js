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
const { ERROR_TYPE } = require('../../../config/constants');
const { throwErrors } = require('../../../config/toolkits');

const base = { _limit: -1 };

/**
 * 获取应用国际化词条数据
 * @param { any } appInfo 应用详情
 * @return { Promise<any> }
 */
const _getI18n = (appInfo) => {
  return strapi.services['i18n-entries'].find({
    host: appInfo.id,
    host_type: 'app',
    ...base
  });
};

/**
 * 获取关联区块构建产物（有些包含区块的i18n）
 * @param {any} appInfo 应用信息
 * @param {any} materialHistoryMsg 物料资产包信息 {materialHistoryId:100, isUnpkg: false}
 * @returns {Promise<Array<any>>} 应用关联的区块产物数据
 */
const _getBlockHistories = async (appInfo, materialHistoryMsg = null) => {
  const historiesId = await strapi.services['get-app-blockhistories'].getAppBlockHistoriesId(
    appInfo,
    materialHistoryMsg
  );
  return strapi.services['block-history'].find(
    {
      id_in: historiesId,
      ...base,
    },
    []
  );
};

/**
 * 应用数据源
 * @param { any } appInfo 应用详情
 * @return { Promise<any> }
 */
const _getSource = (appInfo) => {
  return strapi.services.sources.find({ app: appInfo.id, ...base });
};

/**
 * 获取应用下的页面
 * @param { any } appInfo 应用详情
 * @return { Promise<any> }
 */
const _getPages = async (appInfo) => {
  return strapi.services.pages.find({ app: appInfo.id, ...base }, ['occupier']);
};

/**
 * 获取桥接源和工具类
 * @param { any } appInfo 应用详情
 * @return { Promise<any> }
 */
const _getExtensions = async (appInfo) => {
  return strapi.services['app-extensions'].find({ app: appInfo.id, ...base });
};

/**
 * 获取应用关联的物料资产包详情
 * @param {any} appInfo 应用信息
 * @param {any} materialHistoryMsg 物料资产包信息 {materialHistoryId:100, isUnpkg: false}
 * @returns {Promise<Array<any>>} 应用关联的组件数据
 */
const _getMaterialHistory = async (appInfo, materialHistoryMsg = null) => {
  const mMsg = materialHistoryMsg || (await strapi.services['get-app-blockhistories'].getMaterialHistoryId(appInfo));
  const { materialHistoryId } = mMsg;
  return strapi.services['material-histories'].findOne(
    {
      id: materialHistoryId,
    },
    ['components']
  );
};

const _execMap = (map, ...params) => {
  const mapKeys = map.keys();
  const tasks = [];
  for (let key of mapKeys) {
    tasks.push(map.get(key)(...params));
  }
  return Promise.all(tasks)
    .then((res) => {
      const keys = map.keys();
      const obj = {};
      let i = 0;
      for (let key of keys) {
        obj[key] = res[i];
        i++;
      }
      return obj;
    })
    .catch((e) => {
      throw e;
    });
};


/**
 * 获取组成应用schema的所有必要数据
 * @param { string } appId 应用id
 * @param { Array<string> | null } part 获取的部分数据
 * @return { Promise<any> }
 */
const getAppSchemaMeta = async (appId, part) => {
  const appInfo = await strapi.services.apps.findOne({ id: appId });
  if (!appInfo) {
    throwErrors(`No app with id ${appId} found`, ERROR_TYPE.notFound);
  }
  const materialhistoryMsg = await strapi.services['get-app-blockhistories'].getMaterialHistoryId(appInfo);
  let utils = [
    ['i18n', _getI18n],
    ['source', _getSource],
    ['extension', _getExtensions],
    ['pages', _getPages],
    ['blockHistories', _getBlockHistories],
    ['materialHistory', _getMaterialHistory],
  ];

  if (part) {
    const partSet = new Set(part);
    utils = utils.filter(([key]) => partSet.has(key));
  }

  const map = new Map(utils);
  const meta = await _execMap(map, appInfo, materialhistoryMsg);
  meta.app = appInfo;
  return meta;
};

module.exports = {
  getAppSchemaMeta,
};

