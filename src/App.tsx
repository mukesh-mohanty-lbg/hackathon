import { AppProvider } from '@/store/AppContext'
import { AppRouter } from '@/AppRouter'
import './App.css'

function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  )
}

export default App
