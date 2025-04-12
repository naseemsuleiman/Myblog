
import { AuthProvider } from "./Context/AuthContext";

import AppRoutes from "./AppRoutes";

function App() {
 

  return (
    <>
      <AuthProvider>
     <AppRoutes/>
      </AuthProvider>
    </>
  );
}

export default App;
