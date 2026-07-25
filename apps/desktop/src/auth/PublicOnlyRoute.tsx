import {
    Navigate,
    Outlet,
} from 'react-router';

import LoadingScreen
    from '../components/LoadingScreen';

import { useAuth }
    from './AuthContext';

import { getRoleHome }
    from './roleHome';

export default function PublicOnlyRoute() {
    const {
        user,
        isLoading,
        isAuthenticated,
    } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (
        isAuthenticated &&
        user
    ) {
        return (
            <Navigate
                to={getRoleHome(user.role)}
                replace
            />
        );
    }

    return <Outlet />;
}