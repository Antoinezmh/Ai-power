import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './providers/ThemeProvider';
import { QueryProvider } from './providers/QueryProvider';
import { PermissionProvider } from './context/PermissionContext';
import AppRouter from './routes';

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <PermissionProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </PermissionProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

export default App;