const Setting = require('../models/Setting');

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000;

async function getSettings() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  let s = await Setting.findOne();
  if (!s) s = await Setting.create({});
  cache = s.toObject();
  cacheAt = Date.now();
  return cache;
}

function clearCache() {
  cache = null;
}

module.exports = { getSettings, clearCache };
