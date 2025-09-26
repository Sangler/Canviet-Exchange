import React from 'react';
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

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible: boolean) => {
        dispatch({ type: 'set', sidebarShow: visible });
      }}
    >
      <CSidebarHeader className="border-bottom">
        <Link href="/admin" passHref legacyBehavior>
          <CSidebarBrand as="a">
            <div className="sidebar-brand-full">
              <strong>SVN  Transfer</strong>
            </div>
            <div className="sidebar-brand-narrow">
              <strong>ST</strong>
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
