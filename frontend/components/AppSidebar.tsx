import React, { useState } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { AppSidebarNav } from './AppSidebarNav';
import navigation from '../_nav';

const AppSidebar: React.FC = () => {
  const dispatch = useDispatch();
  const unfoldable = useSelector((state: any) => state.sidebarUnfoldable);
  const sidebarShow = useSelector((state: any) => state.sidebarShow);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible: boolean) => {
        dispatch({ type: 'set', sidebarShow: visible });
      }}
    >
      <CSidebarHeader className="border-bottom">
  <Link href="/" passHref legacyBehavior>
          <CSidebarBrand as="a" style={{ textDecoration: 'none' }}>
            <div className="sidebar-brand-full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={'/logo2.png'}  alt="CanViet Exchange logo"
                  onError={(e: any) => {
                    try { (e.currentTarget as HTMLImageElement).style.display = 'none'; } catch {}
                  }}
                />
              {sidebarShow && (!unfoldable || isHovered) ? (
                <strong style={{ textDecoration: 'none' }}>CanViet<br/>Exchange</strong>
              ) : null}
            </div>

          </CSidebarBrand>
        </Link>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  );
};

export default React.memo(AppSidebar);
