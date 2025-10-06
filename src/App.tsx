//Prueba
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import RoleBasedRedirect from "@/components/auth/RoleBasedRedirect";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ExamAccess from "./pages/ExamAccess";
import ExamSession from "./pages/ExamSession";
import Profile from "./pages/Profile";
import Security from "./pages/Security";
import PsychometricTests from "./pages/PsychometricTests";
import TestDataManagement from "./pages/TestDataManagement";
import HTPExam from "./pages/HTPExam";
import StudentPortal from "./pages/StudentPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleBasedRedirect>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/exam-access" element={<ExamAccess />} />
            <Route path="/exam-access/:examId" element={<ExamAccess />} />
            <Route path="/examen/:sessionId" element={<ExamSession />} />
            <Route path="/exam-session/:sessionId" element={<ExamSession />} />
            <Route path="/htp-exam/:accessLink" element={<HTPExam />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/security" element={<Security />} />
            <Route path="/psychometric-tests" element={<PsychometricTests />} />
            <Route path="/test-data-management" element={<TestDataManagement />} />
            <Route path="/estudiante" element={<StudentPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleBasedRedirect>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
