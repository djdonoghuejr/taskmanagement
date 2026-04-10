import { useEffect } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import TodoList from "./pages/TodoList";
import HabitsPage from "./pages/Habits";
import CalendarPage from "./pages/Calendar";
import ProjectDetail from "./pages/ProjectDetail";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import AccountPage from "./pages/Account";
import { isNativeShell } from "./platform/runtime";

function AppShell() {
  const location = useLocation();
  const nativeShell = isNativeShell();
  const routeTitle = (() => {
    if (location.pathname === "/") return "Home";
    if (location.pathname.startsWith("/tasks")) return "Tasks";
    if (location.pathname.startsWith("/habits")) return "Habits";
    if (location.pathname.startsWith("/calendar")) return "Calendar";
    if (location.pathname.startsWith("/projects")) return "Projects";
    if (location.pathname.startsWith("/account")) return "Account";
    return "SecreTerry";
  })();

  useEffect(() => {
    if (!nativeShell) return;

    const root = document.documentElement;
    const body = document.body;
    body.classList.add("st-native-shell");

    const updateViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--st-app-height", `${height}px`);
    };

    const keepFocusedFieldVisible = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches("input, textarea, select")) return;
      window.setTimeout(() => {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 160);
    };

    void StatusBar.setStyle({ style: Style.Dark });
    void StatusBar.setBackgroundColor({ color: "#f6f1e8" });
    void Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    window.visualViewport?.addEventListener("resize", updateViewportHeight);
    window.addEventListener("focusin", keepFocusedFieldVisible);

    const listener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      const modalOpen = document.querySelector(".st-modal-shell");
      if (modalOpen) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        return;
      }

      const currentHash = window.location.hash.replace(/^#/, "") || "/";
      if (canGoBack || currentHash !== "/") {
        window.history.back();
        return;
      }

      void CapacitorApp.minimizeApp();
    });

    return () => {
      body.classList.remove("st-native-shell");
      root.style.removeProperty("--st-app-height");
      window.removeEventListener("resize", updateViewportHeight);
      window.visualViewport?.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("focusin", keepFocusedFieldVisible);
      void listener.then((handle) => handle.remove());
    };
  }, [nativeShell]);

  return (
    <div className={`app-shell flex min-h-screen flex-col md:flex-row${nativeShell ? " st-native-app-shell" : ""}`}>
      <div className="st-mobile-topbar md:hidden">
        <div>
          <p className="st-kicker text-[color:var(--st-brand)]">SecreTerry</p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[color:var(--st-ink)]">{routeTitle}</h1>
        </div>
        <div className="rounded-2xl border border-[color:var(--st-border)] bg-white/80 px-3 py-2 text-right shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--st-ink-muted)]">Today</p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--st-ink)]">
            {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </p>
        </div>
      </div>
      <Sidebar />
      <div className="flex-1 px-3 pb-24 pt-2 md:p-6">
        <main className="page-panel st-main-panel">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tasks" element={<TodoList />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/account" element={<AccountPage />} />
          </Routes>
        </main>
      </div>
      <nav className="st-mobile-nav md:hidden" aria-label="Primary">
        <NavLink to="/" end className={({ isActive }) => `st-mobile-nav-link ${isActive ? "st-mobile-nav-link-active" : ""}`}>
          <span className="st-mobile-nav-label">Home</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `st-mobile-nav-link ${isActive ? "st-mobile-nav-link-active" : ""}`}>
          <span className="st-mobile-nav-label">Tasks</span>
        </NavLink>
        <NavLink to="/habits" className={({ isActive }) => `st-mobile-nav-link ${isActive ? "st-mobile-nav-link-active" : ""}`}>
          <span className="st-mobile-nav-label">Habits</span>
        </NavLink>
        <NavLink to="/projects/overview" className={({ isActive }) => `st-mobile-nav-link ${isActive ? "st-mobile-nav-link-active" : ""}`}>
          <span className="st-mobile-nav-label">Projects</span>
        </NavLink>
        <NavLink to="/account" className={({ isActive }) => `st-mobile-nav-link ${isActive ? "st-mobile-nav-link-active" : ""}`}>
          <span className="st-mobile-nav-label">Account</span>
        </NavLink>
      </nav>
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
