import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { dataDaLinha, type LinhaRelatorio, type FiltroRelatorio } from './relatorioPedidos'

const STATUS_LABEL: Record<string, string> = {
  processado: 'Processado',
  em_carga: 'Em Carga',
  em_producao: 'Em Produção',
  faturado: 'Faturado',
  cancelado: 'Cancelado',
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function gerarRelatorioPedidosPDF(
  linhas: LinhaRelatorio[],
  f: FiltroRelatorio,
  fabricaNome: string,
  lojaNome = 'Todas',
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const azul = [0, 117, 255] as [number, number, number]
  const escuro = [9, 13, 46] as [number, number, number]
  const branco = [255, 255, 255] as [number, number, number]

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(...escuro)
  doc.rect(0, 0, W, 30, 'F')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...branco)
  doc.text('AIVORA TECNOLOGIA', 14, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 174, 192)
  doc.text('Representação Comercial de Móveis', 14, 20)

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...branco)
  doc.text('RELATÓRIO DE PEDIDOS', W - 14, 14, { align: 'right' })

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 174, 192)
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, W - 14, 20, { align: 'right' })

  // ── Filtros aplicados ───────────────────────────────────────────────────
  const baseLabel = f.base === 'faturamento' ? 'Faturamento' : 'Emissão'
  const statusLabel = f.status ? STATUS_LABEL[f.status] : 'Todos'
  const partes = [
    `Período (${baseLabel}): ${fmtDate(f.de)} a ${fmtDate(f.ate)}`,
    `Status: ${statusLabel}`,
    `Fábrica: ${fabricaNome}`,
  ]
  if (lojaNome && lojaNome !== 'Todas') partes.push(`Loja: ${lojaNome}`)
  if (f.finalidade) partes.push(`Finalidade: ${f.finalidade === 'mostruario' ? 'Mostruário' : 'Venda'}`)
  if (f.clienteBusca && f.clienteBusca.trim()) partes.push(`Cliente: ${f.clienteBusca.trim()}`)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 70, 90)
  const filtrosLines = doc.splitTextToSize(partes.join('     •     '), W - 28) as string[]
  doc.text(filtrosLines, 14, 39)
  const tableStart = 39 + filtrosLines.length * 4 + 3

  // ── Tabela ──────────────────────────────────────────────────────────────
  const soma = linhas.reduce((s, l) => s + l.total, 0)
  const body = linhas.map((l) => [
    l.number || '—',
    fmtDate(dataDaLinha(l, f.base)),
    l.cliente,
    l.loja || '—',
    l.fabrica,
    STATUS_LABEL[l.status] || l.status,
    fmt(l.total),
  ])

  autoTable(doc, {
    startY: tableStart,
    head: [['Nº', 'Data', 'Cliente', 'Loja', 'Fábrica', 'Status', 'Valor']],
    body,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2, textColor: [40, 45, 60] },
    headStyles: { fillColor: azul, textColor: branco, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [244, 247, 254] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      3: { cellWidth: 28 },
      5: { cellWidth: 24 },
      6: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    // Rodapé com paginação
    didDrawPage: () => {
      const str = `Página ${doc.getNumberOfPages()}`
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(str, W - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  // ── Totais ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endY = ((doc as any).lastAutoTable?.finalY ?? 44) + 8
  doc.setFillColor(...escuro)
  doc.roundedRect(14, endY, W - 28, 14, 2, 2, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...branco)
  doc.text(`${linhas.length} pedido(s)`, 20, endY + 9)
  doc.text(`Total: ${fmt(soma)}`, W - 20, endY + 9, { align: 'right' })

  const nome = `relatorio-pedidos-${f.de}-a-${f.ate}.pdf`
  doc.save(nome)
}
