import { PedidoForm } from '@/components/forms/PedidoForm'

export default function NovoPedidoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Novo Pedido</h1>
        <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Selecione cliente, fornecedor e configure os produtos</p>
      </div>
      <PedidoForm />
    </div>
  )
}
