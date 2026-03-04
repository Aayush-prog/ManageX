import { AuthProvider } from './store/AuthContext.jsx';
import AppRouter from './routes/AppRouter.jsx';

const App = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;
