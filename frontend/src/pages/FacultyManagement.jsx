import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    registration_number: '',
    department: '',
    role: 'guide'  // This will always be guide for new faculty
  });
  const [adminEditFormData, setAdminEditFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    registration_number: '',
    department: '',
    description: ''
  });

  const userRole = localStorage.getItem('role');
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const response = await axiosInstance.get('/api/faculty/');
      console.log('Fetched faculties:', response.data);
      setFaculties(response.data);
    } catch (error) {
      console.error('Fetch error:', error.response?.data || error.message);
      setError('Failed to fetch faculty members: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (selectedFaculty) {
        // Update existing faculty
        const response = await axiosInstance.put(
          `/api/faculty/${selectedFaculty.id}/`, 
          formData
        );
        console.log('Update response:', response.data);
        setSuccess('Faculty updated successfully');
      } else {
        // Create new faculty
        const response = await axiosInstance.post(
          '/api/faculty/', 
          formData
        );
        console.log('Create response:', response.data);
        setSuccess('Faculty created successfully');
      }
      setShowModal(false);
      fetchFaculties();
      resetForm();
    } catch (error) {
      console.error('Error details:', error.response?.data);
      if (error.response?.data) {
        // Handle field-specific validation errors
        const errorMessages = [];
        if (typeof error.response.data === 'object') {
          Object.entries(error.response.data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorMessages.push(...messages);
            } else {
              errorMessages.push(messages);
            }
          });
          setError(errorMessages.join(', '));
        } else if (error.response.data.detail) {
          setError(error.response.data.detail);
        } else {
          setError(error.response.data);
        }
      } else {
        setError('An error occurred while saving the faculty member. Please try again.');
      }
    }
  };

  const handleEdit = (faculty) => {
    setSelectedFaculty(faculty);
    setAdminEditFormData({
      username: faculty.username,
      email: faculty.email,
      first_name: faculty.first_name || '',
      last_name: faculty.last_name || '',
      registration_number: faculty.registration_number || '',
      department: faculty.department || '',
      description: faculty.description || ''
    });
    setShowAdminEditModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this faculty member?')) {
      try {
        await axiosInstance.delete(`/api/faculty/${id}/`);
        setSuccess('Faculty deleted successfully');
        fetchFaculties();
      } catch (error) {
        setError('Failed to delete faculty member');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      registration_number: '',
      department: '',
      role: 'guide'
    });
    setSelectedFaculty(null);
  };

  const handlePromoteToCoordinator = async (faculty) => {
    try {
      await axiosInstance.put(`/api/faculty/${faculty.id}/promote_to_coordinator/`);
      setSuccess(`${faculty.username} has been promoted to coordinator`);
      fetchFaculties();
    } catch (error) {
      console.error('Promotion error:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to promote faculty member');
    }
  };

  const handleDemoteFromCoordinator = async (faculty) => {
    if (window.confirm('Are you sure you want to remove coordinator role from this faculty member?')) {
      try {
        await axiosInstance.put(`/api/faculty/${faculty.id}/demote_from_coordinator/`);
        setSuccess(`${faculty.username} has been demoted to guide`);
        fetchFaculties();
      } catch (error) {
        console.error('Demotion error:', error.response?.data || error.message);
        setError(error.response?.data?.error || 'Failed to demote faculty member');
      }
    }
  };

  const handleAdminEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axiosInstance.put(
        `/api/faculty/${selectedFaculty.id}/admin-edit/`,
        adminEditFormData
      );
      console.log('Admin edit response:', response.data);
      setSuccess('Faculty details updated successfully');
      setShowAdminEditModal(false);
      fetchFaculties();
    } catch (error) {
      console.error('Admin edit error:', error.response?.data);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat().join(', ');
        setError(errorMessages);
      } else {
        setError('Failed to update faculty details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminEditInputChange = (e) => {
    const { name, value } = e.target;
    setAdminEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Layout>
        <div className="p-2 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Faculty Management</h2>
            {userRole === 'admin' && (
              <Button variant="primary" onClick={() => { setShowModal(true); resetForm(); }}>
                Add New Faculty
              </Button>
            )}
          </div>

          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

          <Table responsive striped bordered hover>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((faculty) => (
                <tr key={faculty.id}>
                  <td>{faculty.username}</td>
                  <td>{`${faculty.first_name} ${faculty.last_name}`.trim()}</td>
                  <td>{faculty.email}</td>
                  <td>{faculty.role}</td>
                  <td style={{ minWidth: '300px' }}>
                    {userRole === 'admin' && (
                      <div className="d-flex flex-wrap gap-2">
                        <Button variant="info" size="sm" onClick={() => handleEdit(faculty)}>
                          Edit Details
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(faculty.id)}>
                          Delete
                        </Button>
                        {faculty.role === 'guide' ? (
                          <Button variant="success" size="sm" onClick={() => handlePromoteToCoordinator(faculty)}>
                            Make Coordinator
                          </Button>
                        ) : faculty.role === 'coordinator' && (
                          <Button variant="warning" size="sm" onClick={() => handleDemoteFromCoordinator(faculty)}>
                            Remove Coordinator
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>{selectedFaculty ? 'Edit Faculty' : 'Add New Faculty'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>

                {!selectedFaculty && (
                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!selectedFaculty}
                    />
                  </Form.Group>
                )}

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Registration Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    placeholder="e.g. FAC001"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="e.g. Computer Science"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Role</Form.Label>
                  <Form.Control
                    type="text"
                    value="guide"
                    disabled
                  />
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    {selectedFaculty ? 'Update' : 'Create'}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>

          {/* Admin Edit Modal */}
          <Modal show={showAdminEditModal} onHide={() => setShowAdminEditModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Edit Faculty Details (Admin Only)</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleAdminEditSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Username *</Form.Label>
                      <Form.Control
                        type="text"
                        name="username"
                        value={adminEditFormData.username}
                        onChange={handleAdminEditInputChange}
                        required
                        disabled={loading}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={adminEditFormData.email}
                        onChange={handleAdminEditInputChange}
                        required
                        disabled={loading}
                      />
                    </Form.Group>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>First Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={adminEditFormData.first_name}
                        onChange={handleAdminEditInputChange}
                        required
                        disabled={loading}
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={adminEditFormData.last_name}
                        onChange={handleAdminEditInputChange}
                        required
                        disabled={loading}
                      />
                    </Form.Group>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Registration Number</Form.Label>
                      <Form.Control
                        type="text"
                        name="registration_number"
                        value={adminEditFormData.registration_number}
                        onChange={handleAdminEditInputChange}
                        disabled={loading}
                        placeholder="e.g. FAC001"
                      />
                    </Form.Group>
                  </div>
                  <div className="col-md-6">
                    <Form.Group className="mb-3">
                      <Form.Label>Department</Form.Label>
                      <Form.Control
                        type="text"
                        name="department"
                        value={adminEditFormData.department}
                        onChange={handleAdminEditInputChange}
                        disabled={loading}
                        placeholder="e.g. Computer Science"
                      />
                    </Form.Group>
                  </div>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={adminEditFormData.description}
                    onChange={handleAdminEditInputChange}
                    disabled={loading}
                    placeholder="Faculty description or notes..."
                    maxLength={500}
                  />
                  <Form.Text className="text-muted">
                    {adminEditFormData.description.length}/500 characters
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowAdminEditModal(false)} 
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Faculty'}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>
        </div>
    </Layout>
  );
};

export default FacultyManagement;