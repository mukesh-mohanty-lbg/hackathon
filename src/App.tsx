import { useEffect, useState } from 'react'
import './App.css'
import { Button } from "@/components/ui/button"
import { Schedule } from './components/custom/Schedule'

function App() {
  const [count, setCount] = useState(0)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [dark, setDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <>
     <Button onClick={() => setDark(d => !d)}>
        {dark ? 'Light mode' : 'Dark mode'}
      </Button>
      <Schedule></Schedule>
      count is {count}
      <Button onClick={() => setCount(count - 1)}>Decrement</Button>
      <Button onClick={() => setCount(count + 1)}>Increment</Button>
    </>
  )
}

export default App
