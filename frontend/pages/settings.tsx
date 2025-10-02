import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import AppSidebar from '../components/AppSidebar';
import RequireAuth from '../components/RequireAuth';

export default function SettingsPage() {
  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1">
              <div>
              <h1>Settings</h1>
              <p>Application settings.</p>
            </div>
          </div>
          <AppFooter />
        </div>
      </div>
    </RequireAuth>
  );

}
