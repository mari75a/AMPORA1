import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
// import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TripPlanner from "./components/TripPlanner/TripPlanner.jsx";
import StationFinder from "./pages/StationFinder.jsx";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trip" element={<TripPlanner />} />
        <Route path="/stations" element={<StationFinder />} />
      </Routes>
    </Router>
  );
}

export default App;
