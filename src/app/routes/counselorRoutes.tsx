import React from 'react';
import { Navigate } from 'react-router-dom';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import type { AppRoute } from './studentRoutes';

const CounselorDashboard = lazyWithRetry(() => import('../../features/counselors/CounselorDashboard').then(module => ({ default: module.CounselorDashboard })));
const CounselorPortal = lazyWithRetry(() => import('../../features/counselor-portal/CounselorPortal').then(module => ({ default: module.CounselorPortal })));

export const counselorRoutes: AppRoute[] = [
  { path: '/counselor/dashboard', element: <CounselorDashboard />, sidebarSection: 'counselor' },
  { path: '/counselor/portal', element: <CounselorPortal />, sidebarSection: 'counselor' },
  { path: '/counselor', element: <Navigate to="/counselor/dashboard" replace /> },
  { path: '/', element: <Navigate to="/counselor/dashboard" replace /> },
  { path: '/counselordashboard', element: <Navigate to="/counselor/dashboard" replace /> },
  { path: '/counselor-portal', element: <Navigate to="/counselor/portal" replace /> },
  { path: '*', element: <Navigate to="/counselor/dashboard" replace /> }
];
