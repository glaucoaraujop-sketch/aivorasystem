import { ProdutoForm } from '@/components/forms/ProdutoForm'

export default function NovoProdutoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Novo Produto</h1>
        <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Preencha os dados do produto</p>
      </div>
      <ProdutoForm />
    </div>
  )
}
