interface LoadingScreenProps {
    message?: string;
}

export default function LoadingScreen({
    message = 'Loading Samarakoon POS...',
}: LoadingScreenProps) {
    return (
        <main className="loading-screen">
            <div className="loading-spinner" />

            <p>{message}</p>
        </main>
    );
}