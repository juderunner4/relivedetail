import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/dashboard/Home';
import Clients from './pages/dashboard/Clients';
import ClientDetail from './pages/dashboard/ClientDetail';
import Bookings from './pages/dashboard/Bookings';
import Invoices from './pages/dashboard/Invoices';
import Plans from './pages/dashboard/Plans';
import Revenue from './pages/dashboard/Revenue';
import Settings from './pages/dashboard/Settings';
import Expenses from './pages/dashboard/Expenses';
import Mileage from './pages/dashboard/Mileage';
import Ads from './pages/dashboard/Ads';

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="plans" element={<Plans />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="mileage" element={<Mileage />} />
            <Route path="ads" element={<Ads />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
