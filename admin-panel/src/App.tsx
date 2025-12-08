import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnalyticsPage } from './pages/AnalyticsPage';

// Placeholder components for other routes
const Dashboard = () => <div>Dashboard Page (Coming Soon)</div>;
const Sessions = () => <div>Sessions Page (Coming Soon)</div>;
const Users = () => <div>Users Page (Coming Soon)</div>;
const Reports = () => <div>Reports Page (Coming Soon)</div>;
const Sync = () => <div>Sync Page (Coming Soon)</div>;
const Settings = () => <div>Settings Page (Coming Soon)</div>;
const Login = () => <div>Login Page (Coming Soon)</div>;

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/sessions" element={<Sessions />} />
      <Route path="/users" element={<Users />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/sync" element={<Sync />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
