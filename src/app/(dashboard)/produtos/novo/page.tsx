import { ProdutoForm } from '@/components/forms/ProdutoForm'

export default function NovoProdutoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
        <p className="text-gray-500 text-sm mt-0.5">Preencha os dados do produto</p>
      </div>
      <ProdutoForm />
    </div>
  )
}
