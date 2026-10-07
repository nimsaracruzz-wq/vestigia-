import { Component, type ReactNode, type ErrorInfo } from 'react';
import './app-error.css';

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep private account data and exception details out of browser logs.
    console.error('[VESTIGIA] The application could not render. Reload to recover.');
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="app-recovery" role="alert">
      <span className="app-recovery-brand">VESTIGIA</span>
      <h1>A moment to reconnect.</h1>
      <p>We couldn’t display this page. Please reload to continue.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload page</button>
      <a href="/">Return to the store</a>
    </div>;
  }
}
