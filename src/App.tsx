import { AppProvider } from '@/store/AppContext'
import { AppRouter } from '@/AppRouter'
import { Toaster } from '@/components/ui/sonner'
import './App.css'

function App() {
  return (
    <AppProvider>
      <AppRouter />
      <Toaster richColors position="bottom-right" />
    </AppProvider>
  )
}

export default App
