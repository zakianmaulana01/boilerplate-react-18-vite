import { AnimatePresence } from 'framer-motion'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import CatalogPage from '@/pages/CatalogPage'
import DemoDetailPage from '@/pages/DemoDetailPage'
import { ThemeProvider } from '@/hooks/useTheme'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route index element={<CatalogPage />} />
          <Route path="demo/:demoId" element={<DemoDetailPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
