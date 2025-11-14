import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TripPlanner from "./pages/TripPlanner";

function Applaout(){
    const location = useLocation();
   const hideNavbar = location.pathname === "/login";


  return (
    <>
        <div>
          {!hideNavbar && <Navbar/>}
        </div>
        <div>
          <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trip-planner" element={<TripPlanner />} />
          </Routes>
        </div>
      
    </>  
  );


}

function App() {
  return (
    <Router>
      <Applaout/>
    </Router>
  );
}

export default App;
