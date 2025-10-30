import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSelector, useDispatch } from 'react-redux';
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  useColorModes,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilBell,
  cilContrast,
  cilEnvelopeOpen,
  cilList,
  cilMenu,
  cilMoon,
  cilSun,
  cilUser,
} from '@coreui/icons';

const AppHeader: React.FC = () => {
  const dispatch = useDispatch();
  const sidebarShow = useSelector((state: any) => state.sidebarShow);
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { user, logout } = useAuth();

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
    <CHeader position="sticky" className="p-0">
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
          <a href="?lang=en" style={{ textDecoration: 'none' }}>EN</a>
          <span aria-hidden>|</span>
          <a href="?lang=vi" style={{ textDecoration: 'none' }}>VI</a>
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
              <span className="me-3">{user?.email ?? 'user@canviet-exchange.com'}</span>
              <CDropdown variant="nav-item">
                <CDropdownToggle className="py-0 pe-0" caret={false}>
                  <div className="avatar avatar-md">👤</div>
                </CDropdownToggle>
                <CDropdownMenu className="pt-0 profile-dropdown">
                  <CDropdownItem href="/personal-info">
                    <CIcon icon={cilUser} className="me-2" />
                    Personal Details
                  </CDropdownItem>

                  <CDropdownItem>
                    <CIcon icon={cilBell} className="me-2" />
                    Messages
                  </CDropdownItem>

                  <CDropdownItem onClick={() => logout()}>
                    <CIcon icon={cilList} className="me-2" />
                    Logout
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </div>
          </CHeaderNav>
        )}
        
        {/* Guest login/signup buttons */}
        {!user && (
          <CHeaderNav className="ms-auto d-flex align-items-center gap-2">
            <a href="/login" className="btn btn-outline-primary">
              Login
            </a>
            <a href="/register" className="btn btn-primary">
              Sign Up
            </a>
          </CHeaderNav>
        )}
      </CContainer>
    </CHeader>
  );
};

export default AppHeader;
