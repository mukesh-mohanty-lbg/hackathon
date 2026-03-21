import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserLayout from "./components/UserLayout";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Family from "./pages/Family";
import Account from "./pages/Account";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEvents from "./pages/admin/AdminEvents";
import CreateEvent from "./pages/admin/CreateEvent";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminStaff from "./pages/admin/AdminStaff";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User (guardian) */}
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/family" element={<Family />} />
            <Route path="/account" element={<Account />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="events/create" element={<CreateEvent />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="staff" element={<AdminStaff />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
