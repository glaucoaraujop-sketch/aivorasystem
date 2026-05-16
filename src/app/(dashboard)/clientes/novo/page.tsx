import { ClienteForm } from '@/components/forms/ClienteForm'

export default function NovoClientePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Novo Cliente</h1>
        <p className="text-sm mt-0.5" style={{ color: '#A0AEC0' }}>Preencha os dados do cliente</p>
      </div>
      <ClienteForm />
    </div>
  )
}
