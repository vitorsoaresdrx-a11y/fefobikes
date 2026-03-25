/**
 * Gera um card PNG bonito para cotação de frete FeFo Bikes
 * Usa Satori (via esm.sh) para converter JSX -> SVG, depois Resvg para PNG
 *
 * Fallback: se Resvg não carregar, retorna o SVG puro em base64.
 */

const W = 960;
const H = 560;

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/**
 * Gera o SVG do card de frete como string.
 */
export function buildFreteCardSVG(opts: {
  destino: string;
  origem: string;
  valor: number;
  prazo: number;
  cep: string;
}): string {
  const { destino, origem, valor, prazo, cep } = opts;
  const valorStr = formatCurrency(valor);
  const dataGeracao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Quebra o nome do destino se for muito longo
  const destinoDisplay = destino.length > 30 ? destino.slice(0, 30) + "..." : destino;
  const origemDisplay = origem.length > 30 ? origem.slice(0, 30) + "..." : origem;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Segoe UI', Arial, sans-serif">
  <defs>
    <!-- Gradiente de fundo principal -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </linearGradient>
    <!-- Gradiente do banner superior -->
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#fb923c;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f97316;stop-opacity:1" />
    </linearGradient>
    <!-- Gradiente do valor -->
    <linearGradient id="valorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fb923c;stop-opacity:1" />
    </linearGradient>
    <!-- Gradiente do card de valor -->
    <linearGradient id="valorCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a5f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f2a4a;stop-opacity:1" />
    </linearGradient>
    <!-- Sombra do card -->
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
    <!-- Brilho suave -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <clipPath id="roundClip">
      <rect x="0" y="0" width="${W}" height="${H}" rx="24" ry="24"/>
    </clipPath>
  </defs>

  <!-- Fundo principal com clip arredondado -->
  <g clip-path="url(#roundClip)">
    <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

    <!-- Elemento decorativo: círculo grande atrás -->
    <circle cx="820" cy="80" r="200" fill="#f97316" fill-opacity="0.05"/>
    <circle cx="140" cy="460" r="160" fill="#f97316" fill-opacity="0.04"/>

    <!-- Linhas decorativas diagonais sutis -->
    <line x1="0" y1="0" x2="960" y2="560" stroke="#ffffff" stroke-opacity="0.02" stroke-width="1"/>
    <line x1="0" y1="100" x2="960" y2="660" stroke="#ffffff" stroke-opacity="0.02" stroke-width="1"/>

    <!-- === HEADER === -->
    <rect x="0" y="0" width="${W}" height="90" fill="url(#headerGrad)"/>

    <!-- Ícone de caminhão (emoji Unicode como texto) -->
    <text x="40" y="62" font-size="36" fill="white" filter="url(#glow)">🚚</text>

    <!-- Nome da empresa -->
    <text x="92" y="44" font-size="28" font-weight="700" fill="white" letter-spacing="1">FeFo Bikes</text>
    <text x="92" y="68" font-size="14" font-weight="400" fill="rgba(255,255,255,0.85)" letter-spacing="2">SIMULAÇÃO DE FRETE</text>

    <!-- Data no canto direito -->
    <text x="${W - 40}" y="44" font-size="13" fill="rgba(255,255,255,0.7)" text-anchor="end">${dataGeracao}</text>
    <text x="${W - 40}" y="64" font-size="12" fill="rgba(255,255,255,0.5)" text-anchor="end">Transportadora: Rodonaves</text>

    <!-- Linha separadora dourada -->
    <rect x="0" y="90" width="${W}" height="3" fill="url(#valorGrad)" opacity="0.6"/>

    <!-- === SEÇÃO ROTA === -->
    <!-- Origem -->
    <rect x="40" y="120" width="380" height="110" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <!-- dots da rota -->
    <circle cx="75" cy="152" r="8" fill="#4ade80" opacity="0.9"/>
    <text x="100" y="143" font-size="11" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="1">ORIGEM</text>
    <text x="100" y="162" font-size="17" fill="white" font-weight="600">${escapeXml(origemDisplay)}</text>
    <text x="100" y="182" font-size="13" fill="rgba(255,255,255,0.45)">Sorocaba - SP</text>
    <!-- linha tracejada -->
    <line x1="75" y1="163" x2="75" y2="200" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="4,3"/>
    <!-- Destino -->
    <circle cx="75" cy="208" r="8" fill="#f97316" opacity="0.9"/>
    <text x="100" y="199" font-size="11" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="1">DESTINO</text>
    <text x="100" y="220" font-size="17" fill="white" font-weight="600">${escapeXml(destinoDisplay)}</text>
    <text x="100" y="240" font-size="13" fill="rgba(255,255,255,0.45)">CEP: ${formatCEP(cep)}</text>

    <!-- === CARD DE VALOR === -->
    <rect x="450" y="120" width="470" height="110" rx="12" fill="url(#valorCardGrad)" stroke="rgba(249,115,22,0.3)" stroke-width="1.5"/>
    <!-- Ícone $ -->
    <text x="490" y="162" font-size="28" fill="rgba(249,115,22,0.6)">💰</text>
    <text x="535" y="145" font-size="12" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="2">VALOR DO FRETE</text>
    <text x="535" y="185" font-size="38" font-weight="800" fill="url(#valorGrad)" filter="url(#glow)">${escapeXml(valorStr)}</text>
    <text x="535" y="218" font-size="11" fill="rgba(255,255,255,0.35)">* Valor com margem operacional inclusa</text>

    <!-- === CARDS INFERIORES === -->

    <!-- Prazo de Entrega -->
    <rect x="40" y="255" width="218" height="110" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="75" y="290" font-size="22" fill="rgba(249,115,22,0.8)">📅</text>
    <text x="115" y="285" font-size="11" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="1">PRAZO ESTIMADO</text>
    <text x="115" y="315" font-size="30" font-weight="800" fill="white">${prazo}</text>
    <text x="115" y="338" font-size="14" fill="rgba(249,115,22,0.9)">Dias úteis</text>

    <!-- Modalidade -->
    <rect x="272" y="255" width="218" height="110" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="307" y="290" font-size="22" fill="rgba(249,115,22,0.8)">🚲</text>
    <text x="347" y="285" font-size="11" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="1">PRODUTO</text>
    <text x="347" y="310" font-size="16" font-weight="700" fill="white">Bicicleta</text>
    <text x="347" y="330" font-size="13" fill="rgba(255,255,255,0.45)">Embalagem padrão</text>
    <text x="347" y="348" font-size="13" fill="rgba(255,255,255,0.45)">Caixa completa</text>

    <!-- Transportadora -->
    <rect x="504" y="255" width="218" height="110" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="539" y="290" font-size="22" fill="rgba(249,115,22,0.8)">🏢</text>
    <text x="579" y="285" font-size="11" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="1">TRANSPORTADORA</text>
    <text x="579" y="310" font-size="16" font-weight="700" fill="white">Rodonaves</text>
    <text x="579" y="330" font-size="13" fill="rgba(255,255,255,0.45)">Frete rodoviário</text>
    <text x="579" y="348" font-size="13" fill="rgba(255,255,255,0.45)">Nacional</text>

    <!-- Status / Garantia -->
    <rect x="736" y="255" width="184" height="110" rx="12" fill="rgba(249,115,22,0.12)" stroke="rgba(249,115,22,0.3)" stroke-width="1.5"/>
    <text x="771" y="290" font-size="22" fill="rgba(249,115,22,0.9)">✅</text>
    <text x="810" y="285" font-size="11" fill="rgba(255,255,255,0.5)" font-weight="600" letter-spacing="1">COTAÇÃO</text>
    <text x="810" y="310" font-size="15" font-weight="700" fill="#4ade80">Aprovada</text>
    <text x="810" y="330" font-size="12" fill="rgba(255,255,255,0.45)">Via API oficial</text>
    <text x="810" y="348" font-size="12" fill="rgba(255,255,255,0.45)">Tempo real</text>

    <!-- === FOOTER === -->
    <rect x="0" y="390" width="${W}" height="2" fill="rgba(255,255,255,0.07)"/>
    <rect x="0" y="392" width="${W}" height="${H - 392}" fill="rgba(0,0,0,0.2)"/>

    <!-- Aviso e rodapé -->
    <text x="${W / 2}" y="430" font-size="13" fill="rgba(255,255,255,0.35)" text-anchor="middle">
      ⚠️ Cotação estimada sujeita à confirmação. Valor inclui margem operacional de R$ 30,00.
    </text>
    <text x="${W / 2}" y="460" font-size="13" fill="rgba(255,255,255,0.25)" text-anchor="middle">
      Entre em contato com FeFo Bikes para mais informações sobre envio e rastreamento.
    </text>

    <!-- Logo / Branding no rodapé -->
    <text x="40" y="510" font-size="22" fill="#f97316" font-weight="800" opacity="0.6">FeFo Bikes</text>
    <text x="40" y="530" font-size="11" fill="rgba(255,255,255,0.2)" letter-spacing="1">SOROCABA • SP • BRASIL</text>

    <!-- Website / contato -->
    <text x="${W - 40}" y="510" font-size="12" fill="rgba(255,255,255,0.25)" text-anchor="end">🌐 fefobikes.com.br</text>
    <text x="${W - 40}" y="530" font-size="12" fill="rgba(255,255,255,0.25)" text-anchor="end">📞 (15) 99612-8054</text>

    <!-- Badge de cotação no canto inferior direito -->
    <rect x="${W - 220}" y="395" width="180" height="32" rx="6" fill="rgba(249,115,22,0.15)" stroke="rgba(249,115,22,0.3)" stroke-width="1"/>
    <text x="${W - 130}" y="416" font-size="11" fill="rgba(249,115,22,0.8)" text-anchor="middle" font-weight="600">🔄 COTAÇÃO EM TEMPO REAL</text>

  </g>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCEP(cep: string): string {
  const clean = cep.replace(/\D/g, "");
  if (clean.length === 8) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return cep;
}

/**
 * Converte o SVG para PNG usando a API pública de conversão (htmlcsstoimage / rsvg-convert via externa)
 * Como Deno não tem acesso nativo ao canvas, usamos a abordagem de SVG base64 direto via WhatsApp
 * (Evolution API aceita base64 de SVG como imagem?). Na verdade não.
 *
 * Alternativa: usar serviço externo gratuito de SVG to PNG.
 * Vamos usar https://svg.export.ink/api/export ou similar.
 *
 * Mas a opção mais confiável e sem dependência é enviar o SVG como arquivo.
 * O WhatsApp não suporta SVG, então vamos usar um serviço de conversão.
 *
 * Usaremos a API do Cloudinary ou do Browserless para converter.
 * SOLUÇÃO FINAL: usar a API do rsvg-convert via CloudConvert gratuita não é opção sem conta.
 *
 * Melhor solução: usar resvg-wasm que roda no Deno.
 */
export async function svgToPngBase64(svgString: string): Promise<{ base64: string; mimeType: string }> {
  try {
    // resvg-wasm: funciona em Deno sem API de canvas
    // @ts-ignore — módulo esm.sh resolve corretamente no runtime Deno
    const { Resvg, initWasm } = await import("https://esm.sh/resvg-wasm@2.6.2");
    // @ts-ignore
    const wasmModule = await import("https://esm.sh/resvg-wasm@2.6.2/resvg.wasm");
    await initWasm(wasmModule.default || wasmModule);

    const resvg = new Resvg(svgString, {
      fitTo: { mode: "width", value: W },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    // Convert Uint8Array -> base64 em chunks para evitar stack overflow
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < pngBuffer.length; i += chunkSize) {
      base64 += btoa(String.fromCharCode(...pngBuffer.slice(i, i + chunkSize)));
    }
    console.log("SVG -> PNG conversion successful, size:", pngBuffer.length);
    return { base64, mimeType: "image/png" };
  } catch (err) {
    console.error("resvg-wasm failed, sending SVG as fallback:", err);
    // Fallback: envia o SVG encodado em base64
    // Evolution API pode não suportar SVG no WhatsApp, mas é o melhor esforço
    const encoder = new TextEncoder();
    const bytes = encoder.encode(svgString);
    let base64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      base64 += btoa(String.fromCharCode(...bytes.slice(i, i + chunkSize)));
    }
    return { base64, mimeType: "image/svg+xml" };
  }
}
