import {
    useEffect,
    useState,
} from 'react';

interface HealthResponse {
    status: string;
    application: string;
    shop: string;
    database: string;
    version: string;
}

type ConnectionStatus =
    | 'checking'
    | 'connected'
    | 'disconnected';

const API_URL =
    'http://127.0.0.1:8000/api/health';

export default function App() {
    const [
        connectionStatus,
        setConnectionStatus,
    ] = useState<ConnectionStatus>('checking');

    const [
        health,
        setHealth,
    ] = useState<HealthResponse | null>(null);

    useEffect(() => {
        let isMounted = true;

        const checkApiConnection = async () => {
            try {
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error(
                        `API returned ${response.status}`,
                    );
                }

                const data =
                    (await response.json()) as HealthResponse;

                if (isMounted) {
                    setHealth(data);
                    setConnectionStatus('connected');
                }
            } catch (error) {
                console.error(
                    'API connection failed:',
                    error,
                );

                if (isMounted) {
                    setHealth(null);
                    setConnectionStatus('disconnected');
                }
            }
        };

        void checkApiConnection();

        const intervalId = window.setInterval(
            () => {
                void checkApiConnection();
            },
            3000,
        );

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
        };
    }, []);

    return (
        <main className="app-shell">
            <section className="welcome-card">
                <div className="brand-mark">
                    S
                </div>

                <p className="eyebrow">
                    Agricultural Item Selling System
                </p>

                <h1>Samarakoon POS</h1>

                <p className="description">
                    The project foundation has been
                    configured successfully.
                </p>

                <div
                    className={`status-box status-${connectionStatus}`}
                >
                    <span className="status-dot" />

                    <div>
                        <strong>
                            {connectionStatus ===
                                'checking' &&
                                'Checking backend...'}

                            {connectionStatus ===
                                'connected' &&
                                'Backend connected'}

                            {connectionStatus ===
                                'disconnected' &&
                                'Backend disconnected'}
                        </strong>

                        <p>
                            {connectionStatus ===
                                'connected'
                                ? `MySQL: ${health?.database ??
                                'unknown'
                                }`
                                : 'Start the Laravel API on port 8000.'}
                        </p>
                    </div>
                </div>

                <div className="project-details">
                    <div>
                        <span>Shop</span>
                        <strong>
                            {health?.shop ??
                                'Samarakoon'}
                        </strong>
                    </div>

                    <div>
                        <span>API Version</span>
                        <strong>
                            {health?.version ??
                                '0.1.0'}
                        </strong>
                    </div>

                    <div>
                        <span>Environment</span>
                        <strong>
                            Local Development
                        </strong>
                    </div>
                </div>
            </section>
        </main>
    );
}