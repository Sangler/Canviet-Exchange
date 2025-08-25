import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { CBadge, CNavLink, CSidebarNav } from '@coreui/react';

interface NavItem {
  component: React.ElementType;
  name?: string;
  badge?: { color: string; text: string };
  icon?: React.ReactNode;
  to?: string;
  href?: string;
  items?: NavItem[];
  [key: string]: any;
}

interface AppSidebarNavProps {
  items: NavItem[];
}

export const AppSidebarNav: React.FC<AppSidebarNavProps> = ({ items }) => {
  const router = useRouter();

  const navLink = (name?: string, icon?: React.ReactNode, badge?: { color: string; text: string }, indent = false) => {
    return (
      <>
        {icon
          ? icon
          : indent && (
              <span className="nav-icon">
                <span className="nav-icon-bullet"></span>
              </span>
            )}
        {name && name}
        {badge && (
          <CBadge color={badge.color} className="ms-auto" size="sm">
            {badge.text}
          </CBadge>
        )}
      </>
    );
  };

  const navItem = (item: NavItem, index: number, indent = false) => {
    const { component, name, badge, icon, ...rest } = item;
    const Component = component;
    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          rest.to ? (
            <Link href={rest.to} passHref legacyBehavior>
              <CNavLink active={router.pathname === rest.to}>
                {navLink(name, icon, badge, indent)}
              </CNavLink>
            </Link>
          ) : (
            <CNavLink
              href={rest.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {navLink(name, icon, badge, indent)}
            </CNavLink>
          )
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    );
  };

  const navGroup = (item: NavItem, index: number) => {
    const { component, name, icon, items, to, ...rest } = item;
    const Component = component;
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {items?.map((item, index) =>
          item.items ? navGroup(item, index) : navItem(item, index, true),
        )}
      </Component>
    );
  };

  return (
    <CSidebarNav as={SimpleBar}>
      {items &&
        items.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  );
};
