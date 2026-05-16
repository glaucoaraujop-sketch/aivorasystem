import { OrcamentoForm } from '@/components/forms/OrcamentoForm'

export default function NovoOrcamentoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Novo Orçamento</h1>
        <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Selecione o cliente e adicione os produtos</p>
      </div>
      <OrcamentoForm />
    </div>
  )
}
