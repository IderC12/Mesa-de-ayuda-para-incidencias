import { Component } from 'react';
export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <main className="fatal-error">
          <h1>No se pudo abrir Helpdesk</h1>
          <p>{this.state.error.message}</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Volver a cargar
          </button>
          <p>Si acabas de configurar el proyecto, revisa el archivo README.md.</p>
        </main>
      );
    return this.props.children;
  }
}
