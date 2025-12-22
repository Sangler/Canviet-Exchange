import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { CNavLink, CSidebarNav } from '@coreui/react';
import { useAuth } from '../context/AuthContext';
import { hasRequiredRole, Role } from '../lib/roles';
import { useLanguage } from '../context/LanguageContext';

interface NavItem {
  component: React.ElementType;
  name?: string;
  badge?: { color: string; text: string };
  icon?: React.ReactNode;
  to?: string;
  href?: string;
  items?: NavItem[];
  roles?: Role | Role[]; // Optional: restrict visibility by role(s)
  [key: string]: any;
}

interface AppSidebarNavProps {
  items: NavItem[];
}

export const AppSidebarNav: React.FC<AppSidebarNavProps> = ({ items }) => {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role;
  const { t } = useLanguage();

  // Recursively filter items based on roles property
  const filterItemsByRole = (list?: NavItem[]): NavItem[] => {
    if (!list) return [];
    const result: NavItem[] = [];
    for (const item of list) {
      const allowed = hasRequiredRole(userRole, item.roles);
      if (!allowed) continue;
      if (item.items && item.items.length > 0) {
        const children = filterItemsByRole(item.items);
        if (children.length > 0) {
          result.push({ ...item, items: children });
        } else if (!item.items) {
          result.push(item);
        }
      } else {
        result.push(item);
      }
    }
    return result;
  };

  const filteredItems = filterItemsByRole(items);

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
        {name && (typeof name === 'string' ? t(name) : name)}
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
      {filteredItems &&
        filteredItems.map((item, index) => (item.items ? navGroup(item, index) : navItem(item, index)))}
    </CSidebarNav>
  );
};
