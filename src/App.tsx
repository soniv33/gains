import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from '@/store/app'
import { TodayScreen } from '@/screens/Today'
import { SessionScreen } from '@/screens/Session'
import { RoutinesScreen } from '@/screens/Routines'
import { RoutineBuilderScreen } from '@/screens/RoutineBuilder'
import { LibraryScreen } from '@/screens/Library'
import { ProgressScreen } from '@/screens/Progress'
import { SettingsScreen } from '@/screens/Settings'

export default function App() {
  const ready = useApp((s) => s.ready)
  const hydrate = useApp((s) => s.hydrate)
  const theme = useApp((s) => s.settings.theme)
  const location = useLocation()

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  if (!ready) return <div className="boot" />

  // The tab bar disappears during a workout. Nothing competes with logging.
  const inSession = location.pathname.startsWith('/session')

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/session" element={<SessionScreen />} />
        <Route path="/routines" element={<RoutinesScreen />} />
        <Route path="/routines/new" element={<RoutineBuilderScreen />} />
        <Route path="/routines/:id" element={<RoutineBuilderScreen />} />
        <Route path="/library" element={<LibraryScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!inSession && <TabBar />}
    </div>
  )
}

function TabBar() {
  return (
    <nav className="tabs" aria-label="Main">
      <Tab to="/" label="Today" d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm9 0h7V11h-7v9Zm0-16v5h7V4h-7Z" />
      <Tab
        to="/routines"
        label="Routines"
        d="M4 6h16M4 12h16M4 18h10"
        stroke
      />
      <Tab
        to="/library"
        label="Library"
        d="M3 10h3v4H3v-4Zm15 0h3v4h-3v-4ZM7 7h3v10H7V7Zm7 0h3v10h-3V7Zm-4 4h4v2h-4v-2Z"
      />
      <Tab
        to="/progress"
        label="Progress"
        d="M4 19h16M6 16V9m5 7V5m5 11v-5"
        stroke
      />
      <Tab to="/settings" label="Settings" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v3M12 19v3M2 12h3M19 12h3" stroke />
    </nav>
  )
}

function Tab({ to, label, d, stroke }: { to: string; label: string; d: string; stroke?: boolean }) {
  return (
    <NavLink to={to} className="tab" end={to === '/'}>
      <svg viewBox="0 0 24 24" aria-hidden>
        {stroke ? (
          <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d={d} fill="currentColor" />
        )}
      </svg>
      {label}
    </NavLink>
  )
}
