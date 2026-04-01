import { Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import TodoList from "./pages/TodoList";
import RecurringChecklist from "./pages/RecurringChecklist";
import CalendarPage from "./pages/Calendar";
import ProjectDetail from "./pages/ProjectDetail";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50 p-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tasks" element={<TodoList />} />
          <Route path="/recurring" element={<RecurringChecklist />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        </Routes>
      </main>
    </div>
  );
}
