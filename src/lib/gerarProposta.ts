import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ItemProposta {
  nome: string
  codigo?: string | null
  quantidade: number
  unidade?: string | null
  precoUnit: number
  desconto: number
  total: number
}

interface DadosProposta {
  numero: string | null
  clienteNome: string
  clienteEmpresa?: string | null
  clienteWhatsapp?: string | null
  tabelaPreco?: string | null
  validoAte?: string | null
  itens: ItemProposta[]
  subtotal: number
  descontoPct: number
  total: number
  notas?: string | null
  criadoEm: string
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function gerarPropostaPDF(dados: DadosProposta) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = doc.internal.pageSize.getWidth()
  const azul  = [0, 117, 255] as [number, number, number]
  const escuro = [9, 13, 46] as [number, number, number]
  const cinza  = [100, 110, 130] as [number, number, number]
  const branco = [255, 255, 255] as [number, number, number]

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...escuro)
  doc.rect(0, 0, W, 38, 'F')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...branco)
  doc.text('AIVORA TECNOLOGIA', 14, 16)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 174, 192)
  doc.text('Representação Comercial de Móveis', 14, 22)
  doc.text('aivoratecnologia.com.br', 14, 27)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...branco)
  doc.text('PROPOSTA COMERCIAL', W - 14, 16, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 174, 192)
  if (dados.numero) doc.text(`Nº ${dados.numero}`, W - 14, 22, { align: 'right' })
  doc.text(`Emitida em: ${fmtDate(dados.criadoEm)}`, W - 14, 27, { align: 'right' })
  if (dados.validoAte) doc.text(`Válida até: ${fmtDate(dados.validoAte)}`, W - 14, 32, { align: 'right' })

  // ── Barra divisória ────────────────────────────────────────────────────────
  doc.setFillColor(...azul)
  doc.rect(0, 38, W, 1.5, 'F')

  // ── Cliente ───────────────────────────────────────────────────────────────
  let y = 50
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...cinza)
  doc.text('CLIENTE', 14, y)

  y += 5
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...escuro)
  doc.text(dados.clienteNome, 14, y)

  if (dados.clienteEmpresa) {
    y += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...cinza)
    doc.text(dados.clienteEmpresa, 14, y)
  }

  if (dados.tabelaPreco) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...cinza)
    doc.text(`Tabela de preço: ${dados.tabelaPreco}`, W - 14, 55, { align: 'right' })
  }

  // ── Itens ─────────────────────────────────────────────────────────────────
  y += 12

  autoTable(doc, {
    startY: y,
    head: [['Produto / SKU', 'Qtd', 'Unit.', 'Desc.', 'Total']],
    body: dados.itens.map(item => [
      `${item.nome}${item.codigo ? `\n${item.codigo}` : ''}`,
      `${item.quantidade}${item.unidade ? ` ${item.unidade}` : ''}`,
      fmt(item.precoUnit),
      item.desconto > 0 ? `${item.desconto}%` : '—',
      fmt(item.total),
    ]),
    headStyles: {
      fillColor: escuro,
      textColor: branco,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: escuro,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 255],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'right',  cellWidth: 28 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right',  cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
    theme: 'striped',
  })

  // ── Totais ────────────────────────────────────────────────────────────────
  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  const totY = afterTable
  const colR = W - 14
  const colL = W - 80

  doc.setDrawColor(220, 224, 235)
  doc.setLineWidth(0.3)
  doc.line(colL, totY, colR, totY)

  let ty = totY + 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...cinza)
  doc.text('Subtotal', colL, ty)
  doc.text(fmt(dados.subtotal), colR, ty, { align: 'right' })

  if (dados.descontoPct > 0) {
    ty += 5
    doc.setTextColor(220, 53, 69)
    doc.text(`Desconto (${dados.descontoPct}%)`, colL, ty)
    doc.text(`− ${fmt(dados.subtotal - dados.total)}`, colR, ty, { align: 'right' })
  }

  ty += 6
  doc.setFillColor(...azul)
  doc.roundedRect(colL - 4, ty - 5, colR - colL + 8, 10, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...branco)
  doc.text('TOTAL', colL, ty + 1.5)
  doc.text(fmt(dados.total), colR, ty + 1.5, { align: 'right' })

  // ── Notas ─────────────────────────────────────────────────────────────────
  if (dados.notas) {
    ty += 16
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...cinza)
    doc.text('OBSERVAÇÕES', 14, ty)
    ty += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...escuro)
    const lines = doc.splitTextToSize(dados.notas, W - 28)
    doc.text(lines, 14, ty)
  }

  // ── Rodapé ────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(...escuro)
  doc.rect(0, pageH - 14, W, 14, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 174, 192)
  doc.text('Esta proposta é válida pelo prazo indicado. Sujeita a disponibilidade de estoque.', W / 2, pageH - 7, { align: 'center' })
  doc.text('Aivora Tecnologia · aivoratecnologia.com.br', W / 2, pageH - 3, { align: 'center' })

  const nomeArquivo = `proposta-${dados.clienteNome.toLowerCase().replace(/\s+/g, '-')}-${dados.numero ?? 'sem-numero'}.pdf`
  doc.save(nomeArquivo)
}
