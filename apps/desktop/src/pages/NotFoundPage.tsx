import { Link }
    from 'react-router';

export default function NotFoundPage() {
    return (
        <main className="not-found-page">
            <div>
                <span>404</span>

                <h1>Page not found</h1>

                <p>
                    The page you requested does
                    not exist or is unavailable.
                </p>

                <Link
                    to="/"
                    className="primary-button"
                >
                    Return to Dashboard
                </Link>
            </div>
        </main>
    );
}