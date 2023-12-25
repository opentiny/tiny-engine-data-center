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
const semver = require('semver');

module.exports = {
  /**
   * 根据 [{block:100, version:'x'}] 参数查询区块全部子区块的构建产物数据
   * 此方法主要为dsl出码提供blockHistories参数
   * @param { Array<any> } contentBlocks 区块对应的构建产物版本信息
   * @return { Array<any> } 区块构建产物数据
   */
  async findAllBlockHistories(contentBlocks) {
    // 先查出该区块的全部子区块content_blocks 数据
    const allContentBlocks = await this.findContentBlockHistories(contentBlocks);
    // 根据content_blocks 获取区块的全部子区块的构建产物数据
    const blockHistories = await _findBlockHistories(allContentBlocks);
    return blockHistories ?? [];
  },

  /**
   * 根据 [{block:100, version:'x'}] 参数查询区块的全部 content_blocks格式的子区块数据
   * 此方法主要为区块构建时提供创建block_history时content_blocks的填充
   * @param { Array<any> } contentBlocks 区块对应的构建产物版本信息
   * @return { Array<any> } 区块构建产物content_blocks数据
   */
  async findContentBlockHistories(contentBlocks) {
    const blockHistories = await _findBlockHistories(contentBlocks);
    if (!blockHistories) {
      return null;
    }
    // 提炼content_blocks
    const subContentBlocks = blockHistories
      .map(({ content_blocks }) => content_blocks)
      .filter((item) => Boolean(item))
      .flat();
    if (subContentBlocks.length) {
      return _deduplicateContentBlocks(subContentBlocks.concat(contentBlocks));
    }
    // 对全部的content_blocks 进行去重合并
    return contentBlocks;
  },
};

// 根据content_blocks 查询区块构建产物数据
const _findBlockHistories = async (contentBlocks) => {
  if (!Array.isArray(contentBlocks) || contentBlocks.length < 1) {
    return null;
  }
  // 获取contentBlocks 对应的 区块构建产物id
  const blockHistoriesId = await strapi.services['get-app-blockhistories'].getBlockHistoryIdBySemver(contentBlocks);
  return strapi.services['block-history'].find(
    {
      id_in: blockHistoriesId,
    },
    []
  );
};

// 对全部子区块的content_blocks 去重，暂时先用高版本优先
const _deduplicateContentBlocks = (contentBlocks) => {
  const resMap = new Map();
  contentBlocks.forEach(({ block, version }) => {
    const item = resMap.get(block);
    if (item && item.version !== 'x') {
      if (_versionAGteVersionB(version, item.version)) {
        // 用最大范围 或 最高版本的信息 覆盖旧有的
        resMap.set(block, { block, version });
      }
    } else {
      resMap.set(block, { block, version });
    }
  });

  return Array.from(resMap.values());
};

// 判断两个版本号或范围，谁更高、更广
const _versionAGteVersionB = (a, b) => {
  // 判断 b 是否为 a版本的子集
  if (semver.subset(b, a)) {
    return true;
  }
  // 再判断 a 是否为 b 的子集
  if (semver.subset(a, b)) {
    return false;
  }
  // 二者没有版本子集关系，看谁的minVersion 大
  const minVersionA = semver.minVersion(a);
  const minVersionB = semver.minVersion(b);
  return semver.gte(minVersionA.version, minVersionB.version);
};
