import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSelector, useDispatch } from 'react-redux';
import { getAuthToken } from '../lib/auth';
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavItem,
  useColorModes,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilList,
  cilMenu,
  cilMoon,
  cilSun,
  cilUser,
  cilTrash,
} from '@coreui/icons';

const AppHeader: React.FC = () => {
  const dispatch = useDispatch();
  const sidebarShow = useSelector((state: any) => state.sidebarShow);
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  // Safe display name: some user objects may include `preferredName` not declared on the AuthUser type.
  const displayName = ((user as any)?.preferredName) || user?.firstName || 'Nguyen';

  // Workaround: some versions of the CoreUI types cause TS to treat `CHeader` as a type.
  // Create an `any` alias and use it in JSX to avoid the "refers to a value, but is being used as a type" build error.
  const CHeaderAny: any = CHeader;

  // Persist color mode in localStorage and restore on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme.mode');
      if (saved === 'dark' || saved === 'light') setColorMode(saved as 'dark' | 'light');
      else setColorMode('light');
    } catch {
      setColorMode('light');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem('theme.mode', colorMode || 'light'); } catch {}
  }, [colorMode]);

  return (
    <CHeaderAny position="sticky" className="p-0">
      <CContainer className="border-bottom px-4 d-flex align-items-center" fluid>
        
        {user && (
          <CHeaderToggler
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            style={{ marginInlineStart: '-14px' }}
          >
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>
        )}
        
        {!user && (
          <a href="/home" className="text-decoration-none">
            <h4 className="mb-0 ms-2">CanViet Exchange</h4>
          </a>
        )}
        
        <span className="ms-3" style={{ display: 'inline-flex', gap: 8 }}>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setLanguage('en'); }} 
            style={{ 
              textDecoration: 'none', 
              fontWeight: language === 'en' ? 'bold' : 'normal' 
            }}
          >
            EN
          </a>
          <span aria-hidden>|</span>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setLanguage('vi'); }} 
            style={{ 
              textDecoration: 'none', 
              fontWeight: language === 'vi' ? 'bold' : 'normal' 
            }}
          >
            VI
          </a>
        </span>
        <CHeaderNav className="d-flex">
          <CNavItem>
            <div className="d-flex align-items-center ms-3">
              <button
                type="button"
                className="btn p-0"
                onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
                aria-label={`Toggle ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
                title="Change to Dark/Light Mode"
                style={{ background: 'transparent', border: 0 }}
              >
                <CIcon icon={colorMode === 'dark' ? cilSun : cilMoon} size="lg" />
              </button>
            </div>
          </CNavItem>
        </CHeaderNav>
        
        {/* Logged-in user dropdown */}
        {user && (
          <CHeaderNav className="ms-auto ms-md-0 d-flex align-items-center">
            <div className="d-flex align-items-center">
              <span className="me-3">Hi, {displayName}</span>
              <CDropdown variant="nav-item">
                <CDropdownToggle className="py-0 pe-0" caret={false}>
                  <div className="avatar avatar-md">👤</div>
                </CDropdownToggle>
                <CDropdownMenu className="pt-0 profile-dropdown">
                  <CDropdownItem href="/personal-info">
                    <CIcon icon={cilUser} className="me-2" />
                    Personal Details
                  </CDropdownItem>

                  <CDropdownItem onClick={() => logout()}>
                    <CIcon icon={cilList} className="me-2" />
                    Logout
                  </CDropdownItem>
                  
                  <CDropdownItem 
                    onClick={async () => {
                      if (window.confirm('⚠️ WARNING: This will permanently delete your account and all associated data including transfers, KYC information, and personal details. This action CANNOT be undone.\n\nAre you absolutely sure you want to close your account?')) {
                        try {
                          const token = getAuthToken();
                          if (!token) {
                            alert('You are not logged in.');
                            return;
                          }
                          
                          const response = await fetch('/api/users/close-account', {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          if (response.ok) {
                            alert('Your account has been permanently closed. You will now be logged out.');
                            logout();
                          } else {
                            const data = await response.json();
                            alert(`Failed to close account: ${data.message || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Error closing account:', error);
                          alert('Failed to close account. Please try again.');
                        }
                      }
                    }}
                    className="text-danger"
                  >
                    <CIcon icon={cilTrash} className="me-2" />
                    Close Account
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </div>
          </CHeaderNav>
        )}
        
        {/* Guest login/signup buttons */}
        {!user && (
          <CHeaderNav className="ms-auto">
            <div className="d-flex align-items-center justify-content-center gap-2">
              <a href="/login" className="btn btn-outline-primary">
                Login
              </a>
              <a href="/register" className="btn btn-primary">
                Sign Up
              </a>
            </div>
          </CHeaderNav>
        )}
      </CContainer>
    </CHeaderAny>
  );
};

export default AppHeader;
