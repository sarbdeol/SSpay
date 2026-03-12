const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Returns a map of { merchantId -> settledINR } for confirmed settlements
 */
async function getMerchantSettledMap(merchantIds, rateConfig) {
  const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
  const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);
  const toInr = (amt, currency) => currency === 'USDT' ? amt * usdtRate : amt * aedRate;

  const settlements = await prisma.settlement.findMany({
    where: { merchantId: { in: merchantIds }, status: 'CONFIRMED' },
    select: { merchantId: true, amount: true, currency: true },
  });

  const map = {};
  settlements.forEach(s => {
    if (!map[s.merchantId]) map[s.merchantId] = 0;
    map[s.merchantId] += toInr(parseFloat(s.amount), s.currency);
  });
  return map;
}

/**
 * Returns a map of { agentId -> settledINR } for confirmed settlements
 */
async function getAgentSettledMap(agentIds, rateConfig) {
  const aedRate = parseFloat(rateConfig?.aedTodayRate || 1);
  const usdtRate = parseFloat(rateConfig?.usdtTodayRate || 1);
  const toInr = (amt, currency) => currency === 'USDT' ? amt * usdtRate : amt * aedRate;

  const settlements = await prisma.settlement.findMany({
    where: { agentId: { in: agentIds }, status: 'CONFIRMED' },
    select: { agentId: true, amount: true, currency: true },
  });

  const map = {};
  settlements.forEach(s => {
    if (!map[s.agentId]) map[s.agentId] = 0;
    map[s.agentId] += toInr(parseFloat(s.amount), s.currency);
  });
  return map;
}

module.exports = { getMerchantSettledMap, getAgentSettledMap };