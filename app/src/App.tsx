import { Routes, Route, Navigate } from "react-router"
import { AuthProvider } from "./contexts/AuthContext"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/accounts" 
          element={
            <ProtectedRoute>
              <Layout>
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Accounts</h1>
                  <p className="text-gray-600 mt-2">Accounts page coming soon...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <ProtectedRoute>
              <Layout>
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Transactions</h1>
                  <p className="text-gray-600 mt-2">Transactions page coming soon...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/budgets" 
          element={
            <ProtectedRoute>
              <Layout>
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Budgets</h1>
                  <p className="text-gray-600 mt-2">Budgets page coming soon...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <Layout>
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Reports</h1>
                  <p className="text-gray-600 mt-2">Reports page coming soon...</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
