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
const https = require('https');
const { default: axios } = require('axios');
const semver = require('semver');
const _ = require('lodash');
const { ERROR_TYPE, INHUAWEI_REGISTRY } = require('../../../config/constants');
const { throwErrors } = require('../../../config/toolkits');

const WORDS = {
  MATERIAL_HISTORY_NOT_FOUND: 'The material asset bundle associated with the app was not found',
  BUILD_INFO_NOT_FOUND: 'This platform was not built or failed to build',
  REQUEST_PKGJSON_FAILED: 'Failed to obtain inhuawei material asset package information:',
};
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * 获取物料资产包id
 * @param {any} appInfo 应用详情
 * @return {any}  { isUnpkg: true, materialHistoryId: 145 } isUnpkg 是否为浮动版本的appSchema, materialHistoryId: 物料资产包id
 */
const getMaterialHistoryId = async (appInfo) => {
  /*const { last_build_info: lastBuildInfo, material_history } = appInfo.platform;
  if (!lastBuildInfo) {
    throwErrors(WORDS.BUILD_INFO_NOT_FOUND, ERROR_TYPE.badRequest);
  }
  const { materialPkgName, materialVersion, materialId } = lastBuildInfo;
  if (!materialVersion) {
    return {
      isUnpkg: false,
      materialHistoryId: material_history,
    };
  }
  const pkgJson = await _getUnpkgPackageJson(materialPkgName, materialVersion);
  const filter = { material: materialId, version: pkgJson.version };
  const res = await strapi.services['material-histories'].findOne(filter, []);
  if (!res || _.isEmpty(res) || !res.id) {
    throwErrors(WORDS.MATERIAL_HISTORY_NOT_FOUND, ERROR_TYPE.notFound);
  }*/
  // 当前使用固定物料历史数据
  return {
    isUnpkg: true,
    materialHistoryId: 639,
  };
};

/**
 * 获取应用关联的区块及版本信息
 * @param {any} appInfo 应用信息
 * @returns {Promise<any>} 应用关联的区块版本控制信息
 */
const getAppBlocksVersionCtl = async (appInfo, materialHistoryId = 0) => {
  const blockGroupsId = await _getBlockGroupsId(appInfo);
  return _getUnpkgAppBlocksVersionCtl(materialHistoryId, blockGroupsId);
};

/**
 * 获取应用所使用的区块构建产物id
 * @param {any} appInfo 应用信息
 * @param {any} materialHistoryMsg 物料资产包信息 {materialHistoryId:100, isUnpkg: false}
 * @returns {Promise<Array<number>>} 应用关联的区块产物id数组
 */
const getAppBlockHistoriesId = async (appInfo, materialHistoryMsg = null) => {
  // 查询应用关联设计器的物料资产包id信息
  const mMsg = materialHistoryMsg || (await getMaterialHistoryId(appInfo));
  const { materialHistoryId, isUnpkg } = mMsg;
  let materialBlockHistoriesId = [];
  let blocksVersionCtl;
  if (!isUnpkg) {
    // 不是unpkg的旧版本，部分区块构建产物id直接从关联关系取
    materialBlockHistoriesId = await _getMaterialHistoryBlockHistoriesId(materialHistoryId);
    /**
     * 其余区块构建产物信息根据 区块分组的关联信息 取
     * 这里需要注意，区块分组中关联的区块， 有的是版本控制的区块，有的是旧的存量数据
     * 对于存量数据默认返回最新一次的区块发布记录
     */
    blocksVersionCtl = await getAppBlocksVersionCtl(appInfo);
  } else {
    blocksVersionCtl = await getAppBlocksVersionCtl(appInfo, materialHistoryId);
  }
  // 通过版本比较库获取合适的区块构建产物数据。注意：当区块版本数据比较多时存在性能瓶颈
  const blockHistoriesId = await _getBlockHistoryIdBySemver(blocksVersionCtl);
  return [...blockHistoriesId, ...materialBlockHistoriesId];
};

/**
 * 获取物料资产包vesion
 * @param {string} pkgName 二方包名称
 * @param {string} version 二方包版本
 * @return {any}
 */
const _getUnpkgPackageJson = async (pkgName, version) => {
  if (!pkgName || !version) {
    return {};
  }
  const url = `${INHUAWEI_REGISTRY.unpkg}/${pkgName}@${version}/package.json`;
  const { data } = await axios.get(url, { httpsAgent }).catch((err) => {
    throwErrors(`${WORDS.REQUEST_PKGJSON_FAILED}${err.message ?? ''}`, ERROR_TYPE.badRequest);
  });
  return data;
};

/**
 * 获取应用关联区块分组
 * @param {any} appInfo 应用详情
 * @returns {Promise<Array<number>>} 区块分组id
 */
const _getBlockGroupsId = async (appInfo) => {
  const appId = appInfo.id;
  const sql = 'select id from block_groups where app=?';
  const data = await strapi.connections.dbDefault.raw(sql, [appId]);
  const res = data?.[0] || [];
  return res.map((item) => item.id);
};

/**
 * 查询关联表信息
 * @param {number} materialHistoryId 应用详情
 * @param {Array<number>} blockGroupsId 区块分组id集合
 * @returns {Promise<any>} 区块对应版本控制信息
 */
const _getUnpkgAppBlocksVersionCtl = async (materialHistoryId, blockGroupsId) => {
  const ids = blockGroupsId.length ? blockGroupsId : [0];
  const materialHistory = isNaN(materialHistoryId) ? 0 : materialHistoryId;
  const idsStr = ids.filter((id) => !isNaN(id)).join(',');
  const sql = `
    SELECT A.block,A.version
    FROM  \`blocks_carriers_relations\` A 
    LEFT JOIN material_histories C on A.host=C.id
    where A.host_type = 'materialHistory' AND C.id=?
    UNION ALL
    SELECT A.block,A.version
    FROM  \`blocks_carriers_relations\` A
    LEFT JOIN block_groups C on A.host=C.id
    where A.host_type = 'blockGroup' AND C.id in (${idsStr})
  `;

  const data = await strapi.connections.dbDefault.raw(sql, [materialHistory]);
  return data?.[0] || [];
};

/**
 * 查询区块id 下的全部区块历史记录
 * @param {Array<number>} blocksId 区块id数组
 * @returns {Promise<any>} 区块对应的区块历史版本
 */
const _getUnpkgBlockHistoriesByBlocksId = async (blocksId) => {
  const ids = blocksId.length ? blocksId : [0];
  const sql = `
    SELECT A.block_id as blockId, A.id as historyId, A.version
    FROM block_histories A
    WHERE A.version IS NOT NULL AND A.version != 'N/A' AND block_id in (${ids.join(',')})
  `;
  const data = await strapi.connections.dbDefault.raw(sql);
  return data?.[0] || [];
};

/**
 * 序列化区块历史版本查询数据
 * @param { Array<any> } blocksVersion 区块历史记录版本数据
 * @return {Map<number, any>} 返回用于计算版本的map
 */
const _formatBlocksVersionMap = (blocksVersion) => {
  const blocksVersionMap = new Map();
  
  for (const { blockId, historyId, version } of blocksVersion) {
    const item = blocksVersionMap.get(blockId) ?? {
      historyMap: new Map(),
      versions: [],
    };
    item.historyMap.set(version, historyId);
    item.versions.push(version);
    blocksVersionMap.set(blockId, item);
  }
  return blocksVersionMap;
};

/**
 * 有版本控制的利用 semver 比较版本信息， 得到 historyId 数组。 没有版本控制的返回最新的历史记录id。
 * @param {Array<any>} blocksVersionCtl 区块id-区块版本控制的数据集合 [ {block：995,version：'~1.0.1'}, ....]
 * @param {Array<number>} 区块历史记录id数组
 */
const _getBlockHistoryIdBySemver = async (blocksVersionCtl) => {
  // 根据 区块id - 区块版本控制 制作map 映射
  const blockVersionCtlMap = new Map();
  for (const { block, version } of blocksVersionCtl) {
    blockVersionCtlMap.set(block, version);
  }
  // 获取 区块id-区块历史记录id-区块历史记录版本 集合  [{blockId:995,historyId:1145,version: '1.0.4'}]
  const blockHistories = await _getUnpkgBlockHistoriesByBlocksId(blocksVersionCtl.map((item) => item.block));
  // 将 集合序列化为 综合信息映射(区块id 为key 的map, map 中保存了 k-v 为 区块版本-区块历史id的map 和 版本数组)
  const blockHistoriesMap = _formatBlocksVersionMap(blockHistories);
  // 要返回的历史记录集合
  const historiesId = [];

  // 遍历区块历史记录 综合信息映射关系
  for (const [blockId, { historyMap, versions }] of blockHistoriesMap) {
    const versionCtl = blockVersionCtlMap.get(blockId);
    // 默认先取最新的
    let targetVersion = versions[versions.length - 1];
    if (versionCtl) {
      targetVersion = semver.maxSatisfying(versions, versionCtl);
    }
    const historyId = historyMap.get(targetVersion);
    if (historyId) {
      historiesId.push(historyId);
    }
  }
  // 返回历史记录集合
  return historiesId;
};

/**
 * 在非unpkg模式下，按照旧方法根据物料资产包关联关系获取区块构建产物id
 * @param {number} materialHistoryId 物料资产包id
 * @param {Array<number>} 区块历史记录id数组
 */
const _getMaterialHistoryBlockHistoriesId = async (materialHistoryId) => {
  const sql = `
    SELECT \`block-history_id\` as blockHistoryId
    FROM  \`block_histories_material_histories__material_histories_blocks\` A
    WHERE A.\`material-history_id\`=?
  `;
  const data = await strapi.connections.dbDefault.raw(sql, [materialHistoryId]);
  const res = data?.[0] || [];
  return res.map((item) => item.blockHistoryId);
};

module.exports = {
  getMaterialHistoryId,
  getAppBlocksVersionCtl,
  getAppBlockHistoriesId,
  // block api service 复用该函数
  getBlockHistoryIdBySemver: _getBlockHistoryIdBySemver,
};
