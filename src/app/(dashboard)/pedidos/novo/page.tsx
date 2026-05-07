import { PedidoForm } from '@/components/forms/PedidoForm'

export default function NovoPedidoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Novo Pedido</h1>
        <p className="text-gray-500 text-sm mt-0.5">Selecione cliente, fornecedor e configure os produtos</p>
      </div>
      <PedidoForm />
    </div>
  )
}
