import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, FileText, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
  },
  {
    name: 'Customers CRM',
    path: '/customers',
    icon: Users,
    roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
  },
  {
    name: 'Products & Inventory',
    path: '/products',
    icon: Package,
    roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
  },
  {
    name: 'Sales Challans',
    path: '/challans',
    icon: FileText,
    roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
  },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(user.role));

  const roleColors: Record<Role, string> = {
    ADMIN: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    SALES: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WAREHOUSE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ACCOUNTS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-base leading-tight">Mini ERP + CRM</h1>
          <p className="text-xs text-slate-400 font-medium">Ops Portal v1.0</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Current Role:</span>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleColors[user.role]}`}>
            {user.role}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
