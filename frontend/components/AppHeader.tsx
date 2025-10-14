import React from 'react';
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
} from '@coreui/icons';

const AppHeader: React.FC = () => {
  const dispatch = useDispatch();
  const sidebarShow = useSelector((state: any) => state.sidebarShow);
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { user, logout } = useAuth();

  return (
    <CHeader position="sticky" className="p-0">
      <CContainer className="border-bottom px-4 d-flex align-items-center" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <div className="d-flex align-items-center ms-3">
          <img
            className="flag"
            src="/flags/Flag_of_Vietnam.png"
            alt="Vietnam"
            title="Vietnam"
            style={{ width: 30, height: 'auto' }}
          />
        </div>
        <CHeaderNav className="d-none d-md-flex">
          <CNavItem>
            <CNavLink href="/">
              Dashboard
            </CNavLink>
          </CNavItem>
        </CHeaderNav>
        {/* TODO: load information user from auth context */}
  <CHeaderNav className="ms-auto ms-md-0 d-flex align-items-center">
          <div className="d-flex align-items-center">
            <span className="me-3">{user?.email ?? 'user@canviet-exchange.com'}</span>
            <CDropdown variant="nav-item">
              <CDropdownToggle className="py-0 pe-0" caret={false}>
                <div className="avatar avatar-md">👤</div>
              </CDropdownToggle>
              <CDropdownMenu className="pt-0 profile-dropdown">
                <CDropdownItem>
                  <CIcon icon={cilBell} className="me-2" />
                  Messages
                </CDropdownItem>
                <CDropdownItem>
                  <CIcon icon={cilEnvelopeOpen} className="me-2" />
                  Tasks
                </CDropdownItem>
                <CDropdownItem onClick={() => logout()}>
                  <CIcon icon={cilList} className="me-2" />
                  Logout
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </div>
        </CHeaderNav>
      </CContainer>
    </CHeader>
  );
};

export default AppHeader;
