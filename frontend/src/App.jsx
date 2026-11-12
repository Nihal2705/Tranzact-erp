// REFERENCE ONLY: Person 2's shared App.jsx is the real one. Merge these routes into it.
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";
import ProductionPage from "./pages/ProductionPage";
import ProductionDetailsPage from "./pages/ProductionDetailsPage";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/orders" element={<OrdersPage />} />
         <Route path="/orders/:id" element={<OrderDetailsPage />} />
          <Route path="/production" element={<ProductionPage />} />
          
          <Route path="/production/:id" element={<ProductionDetailsPage />} />
          <Route path="/dashboard" element={<p>Dashboard (Person 6)</p>} />
          <Route path="/inventory" element={<p>Inventory (Person 2)</p>} />
          <Route path="/reports" element={<p>Reports (Person 6)</p>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
