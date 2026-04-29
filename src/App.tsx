import { useState } from 'react'
import { Library } from './pages/Library'
import { Constructor } from './pages/Constructor'
import { Reader } from './pages/Reader'

export type Route =
  | { name: 'library' }
  | { name: 'constructor'; bookId: string }
  | { name: 'reader'; bookId: string }

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'library' })

  return (
    <>
      {route.name === 'library' && <Library navigate={setRoute} />}
      {route.name === 'constructor' && (
        <Constructor bookId={route.bookId} navigate={setRoute} />
      )}
      {route.name === 'reader' && (
        <Reader bookId={route.bookId} navigate={setRoute} />
      )}
    </>
  )
}
