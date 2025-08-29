import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-lg text-center shadow-2xl">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Oops! Something went wrong.</h1>
            <p className="mb-6">
              An unexpected error occurred. Please try reloading the page. If the problem persists, please check the console for more details.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;