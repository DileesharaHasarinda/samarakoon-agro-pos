interface ModulePlaceholderPageProps {
    title: string;
    description: string;
}

export default function ModulePlaceholderPage({
    title,
    description,
}: ModulePlaceholderPageProps) {
    return (
        <div className="page-stack">
            <section className="content-card module-placeholder">
                <div className="module-placeholder-icon">
                    {title
                        .charAt(0)
                        .toUpperCase()}
                </div>

                <span className="status-badge">
                    Module prepared
                </span>

                <h2>{title}</h2>

                <p>{description}</p>

                <div className="module-next-step">
                    <strong>
                        Current status
                    </strong>

                    <span>
                        Routing, access protection
                        and application layout are
                        working. The CRUD functions
                        will be implemented in the
                        next development phase.
                    </span>
                </div>
            </section>
        </div>
    );
}