import { Routes, Route } from "react-router-dom";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminHome from "@/pages/admin/AdminHome";
import AdminSuggestions from "@/pages/admin/AdminSuggestions";
import Analytics from "@/pages/admin/Analytics";
import Audit from "@/pages/admin/Audit";
import Settings from "@/pages/admin/Settings";

export default function Admin() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* /admin */}
        <Route index element={<AdminHome />} />

        {/* /admin/suggestions */}
        <Route path="suggestions" element={<AdminSuggestions />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
