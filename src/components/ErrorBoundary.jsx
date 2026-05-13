import { Component } from 'react'
import { logError } from '../lib/errorLogger'

/**
 * Minimal class-based ErrorBoundary that logs to Supabase and renders
 * a fallback UI when an uncaught render error bubbles up.
 *
 * Props:
 *   fallback  – render prop: ({ resetError }) => ReactNode
 *   children  – normal children
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
    this.resetError = this.resetError.bind(this)
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    logError(error, `ErrorBoundary ${info?.componentStack?.split('\n')[1]?.trim() ?? ''}`)
  }

  resetError() {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback({ resetError: this.resetError })
    }
    return this.props.children
  }
}
