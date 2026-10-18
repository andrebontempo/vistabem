const Setting = require('../models/Setting');

let cache = null;
let cacheAt = 0;
const TTL = 60 * 1000;

async function getSettings() {
  if (cache && Date.now() - cacheAt < TTL) return cache;
  let s = await Setting.findOne();
  if (!s) s = await Setting.create({});
  const obj = s.toObject ? s.toObject() : s;
  if (typeof obj.isMaintenanceMode === 'undefined') obj.isMaintenanceMode = false;
  if (!obj.maintenanceTitle) obj.maintenanceTitle = 'Estamos em Manutenção Programada';
  if (!obj.maintenanceMessage) {
    obj.maintenanceMessage =
      'Estamos aprimorando nossa loja com novas coleções exclusivas de moda. Em instantes estaremos de volta para você!';
  }
  if (typeof obj.maintenanceEstimatedReturn === 'undefined') obj.maintenanceEstimatedReturn = '';

  cache = obj;
  cacheAt = Date.now();
  return cache;
}

function clearCache() {
  cache = null;
}

module.exports = { getSettings, clearCache };
