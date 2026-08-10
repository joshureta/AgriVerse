import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, details) {
    console.error('AgriVerse page render failed', error, details)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="app-error-page">
        <section className="app-error-card" role="alert">
          <h1>This page could not be displayed</h1>
          <p>{this.state.error.message || 'An unexpected page error occurred.'}</p>
          <div>
            <button type="button" onClick={() => window.location.reload()}>Reload page</button>
            <a href="/admin">Return to dashboard</a>
          </div>
        </section>
      </main>
    )
  }
}
