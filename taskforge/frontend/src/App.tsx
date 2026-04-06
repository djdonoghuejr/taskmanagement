import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import TodoList from "./pages/TodoList";
import HabitsPage from "./pages/Habits";
import CalendarPage from "./pages/Calendar";
import ProjectDetail from "./pages/ProjectDetail";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";

function AppShell() {
  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-3 md:p-6">
        <main className="page-panel min-h-[calc(100vh-1.5rem)] md:min-h-[calc(100vh-3rem)]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tasks" element={<TodoList />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="p-8 text-sm text-slate-600">Loading SecreTerry…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
