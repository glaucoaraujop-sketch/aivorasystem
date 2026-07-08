import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PDFDocument } from 'pdf-lib'
import { withObservability, timed } from '@/lib/observability/api'
import { deduplicarPedidos } from '@/lib/pedidos/matching'

// Arquivos grandes (PDFs de 100+ páginas) podem levar minutos para processar
export const maxDuration = 300

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Páginas por bloco ao dividir PDFs grandes. Cada bloco vira uma chamada
// independente para a AIVA, evitando estourar o limite de tokens de saída.
const PAGINAS_POR_BLOCO = 4
// Quantos blocos processar em paralelo (equilíbrio entre velocidade e rate limit)
const CONCORRENCIA = 3
// Limite de tokens de saída por chamada
const MAX_TOKENS = 16000

const EXTRACTION_PROMPT = `Você é um especialista em extração de dados de pedidos de móveis para representantes comerciais.

Analise o documento/arquivo fornecido e extraia os dados do(s) pedido(s) nele contido(s).

Retorne um JSON com a seguinte estrutura exata (sem markdown, apenas JSON puro):
{
  "pedidos": [
    {
      "numero": "NÚMERO PRINCIPAL do pedido exatamente como consta no documento, apenas o identificador (ex: 148179). NÃO invente e NÃO gere um código novo. null se não encontrar",
      "numero_pedido_fabrica": "número do pedido gerado pela fábrica/fornecedor (string) ou null se não encontrado",
      "numero_ordem_compra": "número da ordem de compra (OC / PO / purchase order) do cliente (string) ou null se não encontrado",
      "ped_consultor": "número/identificação do 'Pedido do Consultor' (Ped.Consul.) se houver, ou null",
      "showroom": "nome ou identificação do showroom do pedido (string) ou null se não encontrado",
      "data": "data de emissão do pedido no formato YYYY-MM-DD",
      "cliente_nome": "nome do cliente como aparece no pedido (pode ser nome fantasia OU razão social)",
      "cliente_empresa": "nome da empresa/loja do cliente (nome fantasia), se houver",
      "cliente_razao_social": "razão social do cliente (nome jurídico com LTDA/ME/EIRELI), se houver, ou null",
      "cliente_cnpj": "CPF ou CNPJ do cliente apenas com dígitos (ex: 68144229000133) ou null se não encontrado",
      "cliente_codigo": "código do cliente no sistema da fábrica (ex: 543) ou null",
      "cliente_ie": "Inscrição Estadual / RG (R.G/I.E) do cliente ou null",
      "cliente_endereco": "logradouro e número do cliente ou null",
      "cliente_bairro": "bairro do cliente ou null",
      "cliente_cidade": "cidade do cliente ou null",
      "cliente_uf": "UF/estado do cliente (2 letras) ou null",
      "cliente_cep": "CEP do cliente ou null",
      "fornecedor_nome": "nome do fornecedor/fábrica",
      "fornecedor_cnpj": "CNPJ do fornecedor apenas com dígitos ou null se não encontrado",
      "payment_terms": "condições de pagamento (Cond.Pag., ex: A VISTA)",
      "prazo_dias": "campo 'Prazos' em dias, como número inteiro, ou null",
      "situacao": "situação financeira/faturamento (ex: BOLETO GERADO) ou null",
      "tabela": "tabela de preço usada (ex: TABELA PADRAO) ou null",
      "frete_tipo": "tipo de frete (ex: Remetente-Contratado, CIF, FOB) ou null",
      "frete_valor": "valor previsto do frete como número (ex: 198.94) ou null",
      "frete_pct": "percentual do frete como número (ex: 14.00) ou null",
      "frete_embutido": "true se o frete estiver embutido no valor dos itens, false se não, null se não informado",
      "delivery_date": "data de entrega estimada/prevista no formato YYYY-MM-DD ou null",
      "notes": "observações gerais do pedido",
      "subtotal": 0.00,
      "discount_pct": 0.0,
      "total": 0.00,
      "itens": [
        {
          "codigo": "código do produto (ex: 248.116.0)",
          "nome": "nome/descrição do produto",
          "familia": "família/agrupamento do item conforme a fábrica (ex: FAMILIA A) ou null",
          "quantidade": 1,
          "unit_price": 0.00,
          "discount_pct": 0.0,
          "total": 0.00,
          "notas": "observações específicas do item, variações, medidas, cor, etc."
        }
      ]
    }
  ]
}

Regras:
- Se encontrar múltiplos pedidos, extraia TODOS no array "pedidos". Em uma mesma página/folha pode haver 2 ou 3 pedidos diferentes (identificados por números de referência distintos) — cada um é um pedido individual e deve entrar separadamente no array
- Cada número de pedido (referência) distinto = um pedido separado, mesmo que estejam na mesma folha
- Valores monetários como números (sem símbolo de moeda, sem ponto de milhar, use ponto decimal)
- Se um campo não existir no documento, use null ou 0 conforme o tipo
- Extraia TODOS os itens/produtos encontrados
- Os campos "numero_pedido_fabrica", "numero_ordem_compra" e "showroom" são importantes: procure por rótulos como "Pedido Fábrica", "Nº Fábrica", "Ordem de Compra", "OC", "PO", "Purchase Order", "Showroom". Se não houver, use null
- O NÚMERO PRINCIPAL do pedido (campo "numero") é rotulado de forma diferente conforme a fábrica/fornecedor. Identifique o fornecedor e use a regra correta:
  • Rafana: rótulo "Pedido" (ex: "Pedido 148179" → numero = "148179"). O número de ordem de compra / referência vai em "numero_ordem_compra"
  • Feroni: rótulo "Pedido de Venda" (ex: "Pedido de Venda 104065" → numero = "104065")
  • Fine Decor: rótulo "Pedido de Venda" (ex: "Pedido de Venda 8287" → numero = "8287")
  • Cyrne Decor: rótulo "Pedido de Venda" (ex: "Pedido de Venda 48657" → numero = "48657")
  • Outras fábricas: use o número de pedido mais proeminente do documento
  • Extraia apenas o identificador numérico, sem o rótulo (ex: "148179", não "Pedido 148179")
- Não invente dados — apenas extraia o que está explícito no documento
- Para datas, converta para YYYY-MM-DD. Se apenas mês/ano, use o dia 01.
- Campos do padrão "Pedido de Venda" das fábricas (ped_consultor, prazo_dias, situacao, tabela, e o bloco de frete): procure pelos rótulos "Ped.Consul.", "Prazos", "Situação", "Tabela", "Tipo Frete", "Previsão Frete", "Frete Embut.". Se não houver, use null
- Dados do cliente (cliente_codigo, cliente_ie, cliente_endereco, cliente_bairro, cliente_cidade, cliente_uf, cliente_cep): extraia do bloco de cabeçalho do cliente. O código costuma vir antes do nome (ex: "543 - ILHAM..."). Se não houver, use null
- familia do item: rótulo "Família" na tabela de itens (ex: FAMILIA A). Se não houver, use null
- Valores de frete/frete_pct como números com ponto decimal (ex: 198.94 e 14.00)`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pedido = Record<string, any>

// Chama a AIVA com um conteúdo (texto ou documento) e devolve o array de pedidos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extrairPedidos(content: any): Promise<Pedido[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []
  try {
    const data = JSON.parse(jsonMatch[0])
    return Array.isArray(data.pedidos) ? data.pedidos : []
  } catch {
    // JSON inválido/truncado neste bloco — ignora e segue com os demais
    return []
  }
}

// Bloco de PDF (base64) → mensagem com documento + prompt
function blocoPdf(base64: string) {
  return [
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
    { type: 'text', text: EXTRACTION_PROMPT },
  ]
}

// Divide um PDF em blocos de PAGINAS_POR_BLOCO páginas e retorna cada um em base64.
// Pedidos nunca cruzam o limite de uma página, então dividir por página é seguro.
async function dividirPdfEmBlocos(buffer: Buffer): Promise<string[]> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPaginas = src.getPageCount()

  if (totalPaginas <= PAGINAS_POR_BLOCO) {
    // Pequeno o bastante para uma única chamada — envia o original
    return [buffer.toString('base64')]
  }

  const blocos: string[] = []
  for (let inicio = 0; inicio < totalPaginas; inicio += PAGINAS_POR_BLOCO) {
    const fim = Math.min(inicio + PAGINAS_POR_BLOCO, totalPaginas)
    const indices = Array.from({ length: fim - inicio }, (_, i) => inicio + i)
    const sub = await PDFDocument.create()
    const paginas = await sub.copyPages(src, indices)
    paginas.forEach(p => sub.addPage(p))
    const bytes = await sub.save()
    blocos.push(Buffer.from(bytes).toString('base64'))
  }
  return blocos
}

export const POST = withObservability('import/pedidos', async (req, { logger }) => {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const texto = ((formData.get('text') as string | null) ?? '').trim()

    if (!file && !texto) {
      return NextResponse.json({ error: 'Nenhum arquivo ou texto enviado' }, { status: 400 })
    }

    let pedidos: Pedido[] = []

    // Texto colado: processa diretamente, sem arquivo
    if (texto) {
      logger.info('import.fonte', { tipo: 'texto', chars: texto.length })
      pedidos = await timed(logger, 'extrair.texto', () =>
        extrairPedidos(`${EXTRACTION_PROMPT}\n\nConteúdo do(s) pedido(s) colado(s):\n\n${texto}`))
      const resultado = deduplicarPedidos(pedidos)
      logger.info('import.concluido', { fonte: 'texto', pedidos: resultado.length })
      return NextResponse.json({ pedidos: resultado })
    }

    const buffer = Buffer.from(await file!.arrayBuffer())
    const ext = file!.name.split('.').pop()?.toLowerCase()
    logger.info('import.fonte', { tipo: ext, nome: file!.name, sizeKb: Math.round(buffer.length / 1024) })

    if (ext === 'pdf') {
      // PDF: divide em blocos de páginas e processa em paralelo (com limite)
      let blocos: string[]
      try {
        blocos = await dividirPdfEmBlocos(buffer)
      } catch {
        // Falha ao dividir (PDF atípico) — tenta como documento único
        blocos = [buffer.toString('base64')]
      }

      logger.info('import.pdf.blocos', { blocos: blocos.length, paginasPorBloco: PAGINAS_POR_BLOCO })

      for (let i = 0; i < blocos.length; i += CONCORRENCIA) {
        const lote = blocos.slice(i, i + CONCORRENCIA)
        const resultados = await Promise.all(lote.map((b64, j) =>
          timed(logger, 'extrair.pdf.bloco', () => extrairPedidos(blocoPdf(b64)), { bloco: i + j + 1 })))
        resultados.forEach(r => pedidos.push(...r))
      }
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      pedidos = await extrairPedidos(`${EXTRACTION_PROMPT}\n\nConteúdo do arquivo (${file!.name}):\n\n${result.value}`)
    } else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets: string[] = []
      workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name]
        sheets.push(`=== Planilha: ${name} ===\n${XLSX.utils.sheet_to_csv(ws)}`)
      })
      pedidos = await extrairPedidos(`${EXTRACTION_PROMPT}\n\nConteúdo do arquivo (${file!.name}):\n\n${sheets.join('\n\n')}`)
    } else if (ext === 'csv') {
      pedidos = await extrairPedidos(`${EXTRACTION_PROMPT}\n\nConteúdo do arquivo (${file!.name}):\n\n${buffer.toString('utf-8')}`)
    } else if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
      // Imagem (print do pedido): usa a visão do modelo, igual ao PDF
      const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      pedidos = await extrairPedidos([
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } },
        { type: 'text', text: EXTRACTION_PROMPT },
      ])
    } else {
      return NextResponse.json({ error: 'Formato não suportado. Use PDF, imagem (PNG/JPG), DOCX, XLSX ou CSV.' }, { status: 400 })
    }

    const resultado = deduplicarPedidos(pedidos)
    logger.info('import.concluido', { fonte: ext, pedidos: resultado.length })
    return NextResponse.json({ pedidos: resultado })
})
