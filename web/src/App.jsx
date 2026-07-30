import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

function App() {
  if (window.location.pathname === '/login') {
    return <Login />
  }

  return <Register />
}

export default App
