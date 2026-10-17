import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-rose-200 rounded-card p-6 shadow-xs space-y-4 my-4 animate-fade-in">
          <div className="flex items-center gap-3 text-rose-700">
            <span className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-rose-600" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {this.props.fallbackTitle || 'Unable to display this section'}
              </h3>
              <p className="text-xs text-rose-600 mt-0.5">
                {this.state.error?.message || 'A transient rendering error occurred.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
            >
              <RefreshCw size={13} />
              Reload Section
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
