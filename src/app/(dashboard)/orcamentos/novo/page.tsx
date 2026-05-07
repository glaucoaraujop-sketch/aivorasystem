import { OrcamentoForm } from '@/components/forms/OrcamentoForm'

export default function NovoOrcamentoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Novo Orçamento</h1>
        <p className="text-gray-500 text-sm mt-0.5">Selecione o cliente e adicione os produtos</p>
      </div>
      <OrcamentoForm />
    </div>
  )
}
