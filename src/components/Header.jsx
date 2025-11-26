import React from 'react'

const Header = () => {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="logo-circle">S</div>
        <div className="brand-text">
          <h1>StenTech</h1>
          <span>AI Gerber Viewer (beta)</span>
        </div>
      </div>
      <nav className="nav-right">
        <span className="nav-tagline">
          Visualize • Analyze • Prepare for AI edits
        </span>
      </nav>
    </header>
  )
}

export default Header
