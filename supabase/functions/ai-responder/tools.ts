export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "calcular_frete",
      description:
        "Calcula o frete via transportadora Rodonaves para envio de bikes ou quadros a partir de Sorocaba-SP. Use somente após ter o CEP e o tipo de carga confirmados pelo cliente.",
      parameters: {
        type: "object",
        properties: {
          cep_destino: {
            type: "string",
            description: "CEP de destino no formato 00000-000 ou 00000000",
          },
          tipo_carga: {
            type: "string",
            enum: ["bike_completa", "quadro"],
            description: "Tipo de carga: bike_completa (15.5kg) ou quadro (6kg)",
          },
          valor_nf: {
            type: "number",
            description: "Valor declarado da mercadoria em reais (R$)",
          },
        },
        required: ["cep_destino", "tipo_carga", "valor_nf"],
      },
    },
  },
];

interface FreteResult {
  valor: string;
  prazo: string;
  cidade: string;
  estado: string;
}

export async function executeCalcularFrete(args: {
  cep_destino: string;
  tipo_carga: "bike_completa" | "quadro";
  valor_nf: number;
}): Promise<FreteResult> {
  const { cep_destino, tipo_carga, valor_nf } = args;
  const cep = cep_destino.replace(/\D/g, "");
  const peso = tipo_carga === "bike_completa" ? 15.5 : 6;

  // 1. Lookup CEP via ViaCEP
  const viacepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const viacepData = await viacepRes.json();

  if (viacepData.erro) {
    throw new Error("CEP não encontrado. Verifique se o CEP está correto.");
  }

  const cidade = viacepData.localidade;
  const estado = viacepData.uf;

  if (!cidade || !estado) {
    throw new Error("Não foi possível identificar cidade/estado para o CEP informado.");
  }

  // 2. Authenticate with Rodonaves
  const RODONAVES_USER = Deno.env.get("RODONAVES_USER")!;
  const RODONAVES_PASS = Deno.env.get("RODONAVES_PASS")!;

  const tokenRes = await fetch(
    "https://quotation-apigateway.rte.com.br/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        username: RODONAVES_USER,
        password: RODONAVES_PASS,
        companyId: "1",
        auth_type: "dev",
      }).toString(),
    }
  );

  if (!tokenRes.ok) {
    throw new Error("Erro ao autenticar na transportadora Rodonaves.");
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // 3. Get quotation
  const cotacaoRes = await fetch(
    "https://quotation-apigateway.rte.com.br/api/v1/gera-cotacao",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        CidadeOrigem: "Sorocaba",
        EstadoOrigem: "SP",
        CidadeDestino: cidade,
        EstadoDestino: estado,
        TipoEmbalagem: "CAIXA",
        TipoDocumento: "NF-E",
        QtdVolumes: 1,
        Altura: 78,
        Largura: 20,
        Comprimento: 148,
        PesoPorVolume: peso,
      }),
    }
  );

  if (!cotacaoRes.ok) {
    const errText = await cotacaoRes.text();
    console.error("Rodonaves quotation error:", errText);
    throw new Error("Erro ao calcular cotação de frete.");
  }

  const cotacao = await cotacaoRes.json();

  const valor = cotacao.Valor ?? cotacao.valor ?? cotacao.value ?? "N/A";
  const prazo = cotacao.Prazo ?? cotacao.prazo ?? cotacao.deadline ?? "N/A";

  return {
    valor: typeof valor === "number" ? `R$ ${valor.toFixed(2)}` : String(valor),
    prazo: String(prazo),
    cidade,
    estado,
  };
}
