import { Navigate }
    from 'react-router';

import LoadingScreen
    from '../components/LoadingScreen';

import { useAuth }
    from './AuthContext';

import { getRoleHome }
    from './roleHome';

export default function RoleHomeRedirect() {
    const {
        user,
        isLoading,
        isAuthenticated,
    } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (
        !isAuthenticated ||
        !user
    ) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return (
        <Navigate
            to={getRoleHome(user.role)}
            replace
        />
    );
}