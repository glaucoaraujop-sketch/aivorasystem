import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen"
      style={{
        background: 'linear-gradient(159.02deg, #0f123b 14.25%, #090d2e 56.45%, #020515 86.14%)',
      }}
    >
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 p-5 md:p-10 flex flex-col items-center">
        <div className="w-full max-w-5xl md:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
