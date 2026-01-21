'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useProfiles } from '@/hooks/useProfiles';
import { Profile, UserRole } from '@/types/database';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/page-loader';

const translations = {
  en: {
    title: 'Team Management',
    subtitle: 'Manage users and their permissions',
    addUser: 'Add User',
    search: 'Search users...',
    roles: {
      admin: 'Administrator',
      manager: 'Manager',
      guard: 'Security Guard',
    },
    roleDesc: {
      admin: 'Full system access',
      manager: 'Manage guards & incidents',
      guard: 'View & respond to incidents',
    },
    stats: {
      total: 'Total Users',
      admins: 'Administrators',
      managers: 'Managers',
      guards: 'Security Guards',
    },
    table: {
      user: 'User',
      role: 'Role',
      contact: 'Contact',
      joined: 'Joined',
      actions: 'Actions',
    },
    modal: {
      addTitle: 'Add New User',
      editTitle: 'Edit User',
      email: 'Email Address',
      fullName: 'Full Name',
      fullNameAr: 'Full Name (Arabic)',
      phone: 'Phone Number',
      role: 'User Role',
      save: 'Save User',
      saving: 'Saving...',
      cancel: 'Cancel',
    },
    delete: {
      title: 'Delete User',
      confirm: 'Are you sure you want to delete this user? This action cannot be undone.',
      deleting: 'Deleting...',
      delete: 'Delete',
    },
    noUsers: 'No users found',
    accessDenied: 'Access Denied',
    adminOnly: 'Only administrators can access this page',
  },
  ar: {
    title: 'إدارة الفريق',
    subtitle: 'إدارة المستخدمين وصلاحياتهم',
    addUser: 'إضافة مستخدم',
    search: 'بحث عن مستخدم...',
    roles: {
      admin: 'مدير النظام',
      manager: 'مدير',
      guard: 'حارس أمن',
    },
    roleDesc: {
      admin: 'صلاحيات كاملة للنظام',
      manager: 'إدارة الحراس والحوادث',
      guard: 'عرض والاستجابة للحوادث',
    },
    stats: {
      total: 'إجمالي المستخدمين',
      admins: 'المدراء',
      managers: 'المشرفين',
      guards: 'حراس الأمن',
    },
    table: {
      user: 'المستخدم',
      role: 'الدور',
      contact: 'التواصل',
      joined: 'تاريخ الانضمام',
      actions: 'الإجراءات',
    },
    modal: {
      addTitle: 'إضافة مستخدم جديد',
      editTitle: 'تعديل المستخدم',
      email: 'البريد الإلكتروني',
      fullName: 'الاسم الكامل',
      fullNameAr: 'الاسم الكامل (عربي)',
      phone: 'رقم الهاتف',
      role: 'دور المستخدم',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      cancel: 'إلغاء',
    },
    delete: {
      title: 'حذف المستخدم',
      confirm: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.',
      deleting: 'جاري الحذف...',
      delete: 'حذف',
    },
    noUsers: 'لا يوجد مستخدمين',
    accessDenied: 'الوصول مرفوض',
    adminOnly: 'يمكن للمدراء فقط الوصول إلى هذه الصفحة',
  },
};

// Simple SVG icons
const Icons = {
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  userPlus: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  ),
  crown: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l3.5-6 4 4.5 4-4.5 3.5 6M4.5 12.75v5.25h15v-5.25" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  shieldCheck: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  loader: (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  shieldAlert: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  ),
};

const roleIcons: Record<UserRole, ReactNode> = {
  admin: Icons.crown,
  manager: Icons.shieldCheck,
  guard: Icons.shield,
};

const roleColors: Record<UserRole, string> = {
  admin: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  manager: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  guard: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const statColors: Record<string, string> = {
  total: 'text-slate-400',
  admins: 'text-purple-400',
  managers: 'text-blue-400',
  guards: 'text-emerald-400',
};

export default function UsersPage() {
  const { profile, isAdmin } = useAuth();
  const { locale, isRTL } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    full_name_ar: '',
    phone: '',
    role: 'guard' as UserRole,
  });

  const {
    profiles: users,
    loading,
    error: fetchError,
    stats,
    createProfile,
    updateProfile: updateProfileFn,
    deleteProfile: deleteProfileFn,
  } = useProfiles({ searchQuery });

  // Debug: log errors
  useEffect(() => {
    if (fetchError) {
      console.error('[UsersPage] Fetch error:', fetchError);
    }
  }, [fetchError]);

  const handleAddUser = async () => {
    setSaving(true);
    try {
      const { error } = await createProfile({
        id: crypto.randomUUID(),
        email: formData.email,
        full_name: formData.full_name,
        full_name_ar: formData.full_name_ar || null,
        phone: formData.phone || null,
        role: formData.role,
      });
      if (error) {
        console.error('[UsersPage] Create error:', error);
        alert('Error creating user: ' + (error.message || 'Unknown error'));
      } else {
        setShowAddModal(false);
        resetForm();
      }
    } catch (err) {
      console.error('[UsersPage] Create exception:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await updateProfileFn(selectedUser.id, {
      full_name: formData.full_name,
      full_name_ar: formData.full_name_ar || null,
      phone: formData.phone || null,
      role: formData.role,
    });
    if (!error) {
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
    }
    setSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await deleteProfileFn(selectedUser.id);
    if (!error) {
      setShowDeleteModal(false);
      setSelectedUser(null);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      full_name_ar: '',
      phone: '',
      role: 'guard',
    });
  };

  const openEditModal = (user: Profile) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      full_name_ar: user.full_name_ar || '',
      phone: user.phone || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Access denied for non-admins
  if (!loading && !isAdmin) {
    return (
      <div className={cn('min-h-screen bg-slate-950 p-6 flex items-center justify-center', isRTL && 'rtl')}>
        <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-8 max-w-md text-center">
          <div className="text-red-400 mx-auto mb-4">{Icons.shieldAlert}</div>
          <h1 className="text-2xl font-semibold text-white mb-2">{t.accessDenied}</h1>
          <p className="text-slate-400">{t.adminOnly}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-slate-950 p-6', isRTL && 'rtl')}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{t.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{t.subtitle}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            {Icons.userPlus}
            {t.addUser}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: 'total', icon: Icons.users, value: stats.total },
            { key: 'admins', icon: Icons.crown, value: stats.admins },
            { key: 'managers', icon: Icons.shieldCheck, value: stats.managers },
            { key: 'guards', icon: Icons.shield, value: stats.guards },
          ].map(({ key, icon, value }) => (
            <div key={key} className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-lg bg-slate-800/50', statColors[key])}>
                  {icon}
                </div>
                <div>
                  <div className="text-2xl font-semibold text-white">{value}</div>
                  <div className="text-sm text-slate-400">{t.stats[key as keyof typeof t.stats]}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {Icons.search}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/[0.06] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Error Display */}
        {fetchError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
            Error: {fetchError}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl overflow-hidden">
          {loading ? (
            <PageLoader />
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <div className="mx-auto mb-4 opacity-50">{Icons.users}</div>
              <p>{fetchError ? 'Error loading users' : t.noUsers}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left p-4 text-sm font-medium text-slate-400">{t.table.user}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">{t.table.role}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">{t.table.contact}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-400">{t.table.joined}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-400">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                            {user.full_name?.[0] || user.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {locale === 'ar' && user.full_name_ar ? user.full_name_ar : user.full_name || 'No Name'}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium', roleColors[user.role])}>
                          {roleIcons[user.role]}
                          {t.roles[user.role]}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <span className="text-slate-500">{Icons.mail}</span>
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span className="text-slate-500">{Icons.phone}</span>
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span className="text-slate-500">{Icons.clock}</span>
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                          >
                            {Icons.edit}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                            disabled={user.id === profile?.id}
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            <div
              className="bg-slate-900 border border-white/[0.08] rounded-xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-white font-medium">
                  <span className="text-blue-400">{Icons.userPlus}</span>
                  {showAddModal ? t.modal.addTitle : t.modal.editTitle}
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors"
                >
                  {Icons.x}
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {showAddModal && (
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">{t.modal.email}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/[0.06] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                      placeholder="user@example.com"
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">{t.modal.fullName}</label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/[0.06] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">{t.modal.fullNameAr}</label>
                    <input
                      type="text"
                      value={formData.full_name_ar}
                      onChange={(e) => setFormData({ ...formData, full_name_ar: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/[0.06] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                      placeholder="الاسم الكامل"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">{t.modal.phone}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/[0.06] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50"
                    placeholder="+966 50 000 0000"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">{t.modal.role}</label>
                  <div className="space-y-2">
                    {(['admin', 'manager', 'guard'] as UserRole[]).map((role) => (
                      <button
                        key={role}
                        onClick={() => setFormData({ ...formData, role })}
                        className={cn(
                          'w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left border',
                          formData.role === role
                            ? roleColors[role]
                            : 'bg-slate-800/30 border-white/[0.04] text-slate-400 hover:bg-slate-800/50'
                        )}
                      >
                        {roleIcons[role]}
                        <div className="flex-1">
                          <div className="font-medium">{t.roles[role]}</div>
                          <div className="text-xs opacity-70">{t.roleDesc[role]}</div>
                        </div>
                        {formData.role === role && (
                          <span className="text-current">{Icons.check}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-5 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  onClick={showAddModal ? handleAddUser : handleEditUser}
                  disabled={saving || !formData.full_name || (showAddModal && !formData.email)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      {Icons.loader}
                      {t.modal.saving}
                    </>
                  ) : (
                    <>
                      {Icons.check}
                      {t.modal.save}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedUser && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowDeleteModal(false);
              setSelectedUser(null);
            }}
          >
            <div
              className="bg-slate-900 border border-white/[0.08] rounded-xl w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-red-400 font-medium">
                  {Icons.trash}
                  {t.delete.title}
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                    {selectedUser.full_name?.[0] || selectedUser.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-medium">{selectedUser.full_name || 'No Name'}</div>
                    <div className="text-sm text-slate-400">{selectedUser.email}</div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm">{t.delete.confirm}</p>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-5 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      {Icons.loader}
                      {t.delete.deleting}
                    </>
                  ) : (
                    <>
                      {Icons.trash}
                      {t.delete.delete}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
