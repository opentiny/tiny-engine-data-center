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
const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr';
const KEY_STRING = '177d403cef1d6dffcc9bb7921d360bb2482601439312cd08517cec970a935838';
const IV_STRING = '517b717cd53ab1ef0890dcfc527570a6';

module.exports = {
  encrypt(text) {
    const iv = Buffer.from(IV_STRING, 'hex');
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY_STRING, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  },

  decrypt(text) {
    try {
      const textParts = text.split(':');
      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = Buffer.from(textParts[1], 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY_STRING, 'hex'), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString();
    } catch (error) {
      strapi.log.error(`[egg-w3] login error message : ${error?.message}`);

      return '';
    }
  },
};
