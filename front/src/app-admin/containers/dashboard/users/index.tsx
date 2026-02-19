import React, {useState, useEffect} from 'react';
import {DashboardLayout} from "../../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../../api/request/request";
import {USER_LIST, USER_CREATE, USER_EDIT} from "../../../../api/routing/routes/backend.app";
import {DASHBOARD} from "../../../routes/frontend.routes";

export const Users = () => {
  const {t} = useTranslation();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    roles: ['ROLE_VENDEUR'],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await jsonRequest(USER_LIST);
      const json = await response.json();
      setUsers(json['hydra:member'] ?? json ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes('ROLE_ADMIN')) return <span className="badge bg-danger">{t('Admin')}</span>;
    if (roles.includes('ROLE_MANAGER')) return <span className="badge bg-success">{t('Manager')}</span>;
    return <span className="badge bg-primary">{t('Vendor')}</span>;
  };

  const openCreateModal = () => {
    setEditUser(null);
    setFormData({ displayName: '', username: '', email: '', password: '', roles: ['ROLE_VENDEUR'] });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setEditUser(user);
    setFormData({
      displayName: user.displayName ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
      password: '',
      roles: user.roles?.length > 0 ? [user.roles[0]] : ['ROLE_VENDEUR'],
    });
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditUser(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editUser) {
        // Edit existing user
        const payload: any = {
          displayName: formData.displayName,
          username: formData.username,
          email: formData.email,
          roles: formData.roles,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await jsonRequest(USER_EDIT.replace(':id', String(editUser.id)), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Create new user
        await jsonRequest(USER_CREATE, {
          method: 'POST',
          body: JSON.stringify({
            displayName: formData.displayName,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            roles: formData.roles,
          }),
        });
      }
      closeModal();
      fetchUsers();
    } catch (e: any) {
      setError(t('An error occurred. Please try again.'));
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: any) => {
    try {
      await jsonRequest(USER_EDIT.replace(':id', String(user.id)), {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout
      title={t('Users')}
      breadCrumbs={[
        {title: t('Dashboard'), link: DASHBOARD},
        {title: t('Users'), current: true}
      ]}
    >
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">{t('Users')}</h5>
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <i className="bi bi-plus-circle me-2"></i>{t('Create User')}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2">{t('Loading...')}</p>
                </div>
              ) : users.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t('Display Name')}</th>
                        <th>{t('Username')}</th>
                        <th>{t('Email')}</th>
                        <th>{t('Role')}</th>
                        <th>{t('Status')}</th>
                        <th>{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, i) => (
                        <tr key={user.id ?? i}>
                          <td>{i + 1}</td>
                          <td className="fw-bold">{user.displayName}</td>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{getRoleBadge(user.roles ?? [])}</td>
                          <td>
                            {user.isActive
                              ? <span className="badge bg-success">{t('Active')}</span>
                              : <span className="badge bg-secondary">{t('Inactive')}</span>
                            }
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => openEditModal(user)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              className={`btn btn-sm ${user.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => toggleActive(user)}
                              title={user.isActive ? t('Deactivate') : t('Activate')}
                            >
                              <i className={`bi ${user.isActive ? 'bi-toggle-on' : 'bi-toggle-off'}`}></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">{t('No data available')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editUser ? t('Edit User') : t('Create User')}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {error && (
                      <div className="alert alert-danger">{error}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">{t('Display Name')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">{t('Username')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">{t('Email')}</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        {t('Password')}
                        {editUser && <span className="text-muted ms-1">({t('Leave empty to keep current')})</span>}
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required={!editUser}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">{t('Role')}</label>
                      <select
                        className="form-select"
                        value={formData.roles[0]}
                        onChange={e => setFormData({...formData, roles: [e.target.value]})}
                      >
                        <option value="ROLE_VENDEUR">{t('Vendor')}</option>
                        <option value="ROLE_MANAGER">{t('Manager')}</option>
                        <option value="ROLE_ADMIN">{t('Admin')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      {t('Cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          {t('Saving...')}
                        </>
                      ) : (
                        editUser ? t('Save') : t('Create User')
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};
