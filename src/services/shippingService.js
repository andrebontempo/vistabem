/**
 * Frete por tabela regional (MVP). A região é obtida pela faixa do CEP,
 * sem depender de API externa.
 */
const UF_REGION = {
  AC: 'N', AP: 'N', AM: 'N', PA: 'N', RO: 'N', RR: 'N', TO: 'N',
  AL: 'NE', BA: 'NE', CE: 'NE', MA: 'NE', PB: 'NE', PE: 'NE', PI: 'NE', RN: 'NE', SE: 'NE',
  DF: 'CO', GO: 'CO', MT: 'CO', MS: 'CO',
  ES: 'SE', MG: 'SE', RJ: 'SE', SP: 'SE',
  PR: 'S', RS: 'S', SC: 'S',
};

const REGION_NAMES = { N: 'Norte', NE: 'Nordeste', CO: 'Centro-Oeste', SE: 'Sudeste', S: 'Sul' };

// Faixas oficiais (3 primeiros dígitos) → UF
const CEP_RANGES = [
  [10, 199, 'SP'], [200, 289, 'RJ'], [290, 299, 'ES'], [300, 399, 'MG'],
  [400, 489, 'BA'], [490, 499, 'SE'], [500, 569, 'PE'], [570, 579, 'AL'],
  [580, 589, 'PB'], [590, 599, 'RN'], [600, 639, 'CE'], [640, 649, 'PI'],
  [650, 659, 'MA'], [660, 688, 'PA'], [689, 689, 'AP'], [690, 692, 'AM'],
  [693, 693, 'RR'], [694, 698, 'AM'], [699, 699, 'AC'], [700, 727, 'DF'],
  [728, 767, 'GO'], [768, 769, 'RO'], [770, 779, 'TO'], [780, 788, 'MT'],
  [790, 799, 'MS'], [800, 879, 'PR'], [880, 899, 'SC'], [900, 999, 'RS'],
];

function ufFromCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const prefix = parseInt(digits.slice(0, 3), 10);
  if (prefix < 10) return 'SP';
  const range = CEP_RANGES.find(([a, b]) => prefix >= a && prefix <= b);
  return range ? range[2] : null;
}

/**
 * Calcula frete. Retorna null para CEP inválido.
 */
function calculate(cep, subtotal, settings) {
  const uf = ufFromCep(cep);
  if (!uf) return null;
  const region = UF_REGION[uf];
  const rule = settings.shipping?.[region] || { fee: 29.9, days: '5 a 10 dias úteis' };
  const free = settings.freeShippingThreshold > 0 && subtotal >= settings.freeShippingThreshold;
  return {
    uf,
    region,
    regionName: REGION_NAMES[region],
    fee: free ? 0 : rule.fee,
    days: rule.days,
    free,
    method: free ? 'Frete Grátis' : 'Entrega Padrão',
  };
}

module.exports = { calculate, ufFromCep, UF_REGION, REGION_NAMES };
