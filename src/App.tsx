import { AppProvider } from '@/store/AppContext'
import { AppRouter } from '@/AppRouter'
import { Toaster } from '@/components/ui/sonner'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import './App.css'

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AppProvider>
        <AppRouter />
        <Toaster richColors position="bottom-right" />
      </AppProvider>
    </DndProvider>
  )
}

export default App
