import React from "react";
import { Link } from "react-router";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/">
        <p className="text-2xl font-bold text-gradient">RESUMIND</p>
      </Link>
      <div className="flex flex-row gap-4">
        <Link to="/upload" className="primary-button w-fit">
          Upload Resume
        </Link>
        <Link to="/wipe" className="primary-button w-fit flex flex-col">
          Wipe
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
