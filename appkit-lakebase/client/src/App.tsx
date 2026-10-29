import { createBrowserRouter, RouterProvider } from 'react-router';
import { CurrentUserProvider } from '@/context/CurrentUserContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProjectListPage } from '@/pages/projects/ProjectListPage';
import { ProjectGanttPage } from '@/pages/projects/ProjectGanttPage';

const router = createBrowserRouter([
  { path: '/', element: <ProjectListPage /> },
  { path: '/projects/:id', element: <ProjectGanttPage /> },
]);

export default function App() {
  return (
    <CurrentUserProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </CurrentUserProvider>
  );
}
