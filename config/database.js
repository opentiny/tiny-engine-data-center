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
module.exports = ({ env }) => ({
  defaultConnection: "dbDefault",
  connections: {
    // 数据库配置，需替换自己的服务配置
    dbDefault: {
      connector: "bookshelf",
      settings: {
        client: "mysql",
        host: env("DB_IP", "localhost"), // 数据库ip
        port: env.int("DB_PORT", process.env.MYSQL_PORT || 3306), // 数据库端口
        database: env(
          "DB_NAME",
          process.env.MYSQL_DBNAME || "tiny_engine-data"
        ), // 数据库name
        username: env("DB_USER", "root"), // 数据库用户账号
        password: env("DB_PASSWORD", "111111"), // 数据库密码
        ssl: env.bool("DATABASE_SSL", false), // true 通过证书或令牌链接, false 通过用户账号密码链接
      },
      options: {},
    },
    // redis相关配置，需替换自己服务配置
    // redis: {
    //   connector: 'redis',
    //   settings: {
    //     host: env('REDIS_HOST', process.env.REDIS_HOST),// redis的ip
    //     port: env.int('REDIS_PORT', process.env.REDIS_PORT || 6380),
    //     db: env('REDIS_DB', process.env.REDIS_DB || '2'),
    //     password: env('REDIS_PASSWORD', process.env.RADIS_PASSWORD),// redis的密码
    //   },
    //   options: {},
    // },
  },
});
