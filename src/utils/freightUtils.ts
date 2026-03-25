/**
 * Classificador de Localidade e Motor de Multiplicadores FeFo Bikes
 */

export type LocalityBucket = 'capital' | 'interior' | 'remoto';

export const MULTIPLIERS: Record<LocalityBucket, number> = {
  capital: 1.25,   // Cidades principais (ICMS + Margem base)
  interior: 1.65,  // Cidades de interior padrão
  remoto: 2.90,    // Interior profundo (AC, AM, PA ou cidades como Garruchos/RS)
};

const BRAZIL_CAPITALS = [
  "ARACAJU", "BELEM", "BELO HORIZONTE", "BOA VISTA", "CAMPO GRANDE", "CUIABA", 
  "CURITIBA", "FLORIANOPOLIS", "FORTALEZA", "GOIANIA", "JOAO PESSOA", "MACEIO", 
  "MANAUS", "NATAL", "PALMAS", "PORTO ALEGRE", "PORTO VELHO", "RECIFE", 
  "RIO BRANCO", "RIO DE JANEIRO", "SALVADOR", "SAO LUIS", "SAO PAULO", 
  "TERESINA", "VITORIA", "BRASILIA"
];

const REMOTE_STATES = ["AC", "AM", "RO", "RR", "AP", "PA", "TO"];

/**
 * Classifica uma cidade baseada em heurísticas de logística
 */
export function classifyLocality(cidade: string, uf: string): LocalityBucket {
  const normalizedCity = cidade.toUpperCase().trim();
  const normalizedUF = uf.toUpperCase().trim();

  // 1. Check if it is a capital
  if (BRAZIL_CAPITALS.includes(normalizedCity)) {
    return 'capital';
  }

  // 2. Check if it is North Region (non-capital) -> Deep remote
  if (REMOTE_STATES.includes(normalizedUF)) {
    return 'remoto';
  }

  // 3. Known remote cities in other states (Manual additions)
  const manualRemoteCities = ["GARRUCHOS"]; 
  if (manualRemoteCities.some(name => normalizedCity.includes(name))) {
    return 'remoto';
  }

  // 4. Default to interior
  return 'interior';
}

/**
 * Script de Calibração (Utilizado via Console ou Unit Test)
 */
export function calibrateFreight(cases: Array<{ cep: string, cidadeUF: string, subtotalCSV: number, valorRodonaves: number }>) {
  const results = cases.map(c => ({
    ...c,
    factor: c.valorRodonaves / c.subtotalCSV
  }));

  const report = results.reduce((acc, curr) => {
    // Dummy classifier for report logic based on UF/City parsing if needed
    // but here we just show the factors
    return acc;
  }, {});

  console.log("--- RELATÓRIO DE CALIBRAÇÃO DE FRETE ---");
  console.table(results);
}
