import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (this.state.failed) return <main role="alert">
      <h1>Something went wrong</h1>
      <p>Please reload the marketplace to try again.</p>
      <button onClick={() => window.location.reload()}>Reload marketplace</button>
    </main>
    return this.props.children
  }
}
