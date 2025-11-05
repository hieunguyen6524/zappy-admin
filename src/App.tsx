import AdminDashboard from "./pages/AdminDashboard";
import Login from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";

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
    </AuthProvider>
  );
}

export default App;
