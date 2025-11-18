import AdminDashboard from "./pages/AdminDashboard";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

function Gate() {
  const { user, loading, reload } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Đang tải...</div>;
  if (!user) return <Login onSuccess={reload} />;
  return <AdminDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <Gate />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
