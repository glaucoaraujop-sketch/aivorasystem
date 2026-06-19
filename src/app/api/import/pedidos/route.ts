import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACTION_PROMPT = `Você é um especialista em extração de dados de pedidos de móveis para representantes comerciais.

Analise o documento/arquivo fornecido e extraia os dados do(s) pedido(s) nele contido(s).

Retorne um JSON com a seguinte estrutura exata (sem markdown, apenas JSON puro):
{
  "pedidos": [
    {
      "numero": "número do pedido (string, ex: PED-001)",
      "numero_pedido_fabrica": "número do pedido gerado pela fábrica/fornecedor (string) ou null se não encontrado",
      "numero_ordem_compra": "número da ordem de compra (OC / PO / purchase order) do cliente (string) ou null se não encontrado",
      "showroom": "nome ou identificação do showroom do pedido (string) ou null se não encontrado",
      "data": "data no formato YYYY-MM-DD",
      "cliente_nome": "nome do cliente",
      "cliente_empresa": "nome da empresa/loja do cliente",
      "cliente_cnpj": "CNPJ do cliente apenas com dígitos (ex: 68144229000133) ou null se não encontrado",
      "fornecedor_nome": "nome do fornecedor/fábrica",
      "fornecedor_cnpj": "CNPJ do fornecedor apenas com dígitos ou null se não encontrado",
      "payment_terms": "condições de pagamento",
      "delivery_date": "data de entrega estimada no formato YYYY-MM-DD ou null",
      "notes": "observações gerais do pedido",
      "subtotal": 0.00,
      "discount_pct": 0.0,
      "total": 0.00,
      "itens": [
        {
          "codigo": "código do produto",
          "nome": "nome/descrição do produto",
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
- Se encontrar múltiplos pedidos, extraia todos no array "pedidos"
- Valores monetários como números (sem símbolo de moeda, sem ponto de milhar, use ponto decimal)
- Se um campo não existir no documento, use null ou 0 conforme o tipo
- Extraia TODOS os itens/produtos encontrados
- Os campos "numero_pedido_fabrica", "numero_ordem_compra" e "showroom" são importantes: procure por rótulos como "Pedido Fábrica", "Nº Fábrica", "Ordem de Compra", "OC", "PO", "Purchase Order", "Showroom". Se não houver, use null
- Não invente dados — apenas extraia o que está explícito no documento
- Para datas, converta para YYYY-MM-DD. Se apenas mês/ano, use o dia 01.`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop()?.toLowerCase()

    let extractedText = ''
    let useVision = false
    let base64Data = ''
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf' = 'application/pdf'

    if (ext === 'pdf') {
      base64Data = buffer.toString('base64')
      mediaType = 'application/pdf'
      useVision = true
    } else if (ext === 'docx' || ext === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    } else if (ext === 'xlsx' || ext === 'xls') {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets: string[] = []
      workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name]
        sheets.push(`=== Planilha: ${name} ===\n${XLSX.utils.sheet_to_csv(ws)}`)
      })
      extractedText = sheets.join('\n\n')
    } else if (ext === 'csv') {
      extractedText = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Formato de arquivo não suportado. Use PDF, DOCX, XLSX ou CSV.' }, { status: 400 })
    }

    let response
    if (useVision) {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      })
    } else {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\nConteúdo do arquivo (${file.name}):\n\n${extractedText}`,
        }],
      })
    }

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Não foi possível extrair dados do arquivo' }, { status: 422 })
    }

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (err) {
    console.error('[import/pedidos]', err)
    return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 })
  }
}
