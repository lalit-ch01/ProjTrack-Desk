import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'guide'  // This will always be guide for new faculty
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
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else if (error.response?.data?.username) {
        setError(`Username error: ${error.response.data.username[0]}`);
      } else if (error.response?.data?.email) {
        setError(`Email error: ${error.response.data.email[0]}`);
      } else if (error.response?.data?.password) {
        setError(`Password error: ${error.response.data.password[0]}`);
      } else {
        setError('An error occurred while saving the faculty member. Please try again.');
      }
    }
  };

  const handleEdit = (faculty) => {
    setSelectedFaculty(faculty);
    setFormData({
      username: faculty.username,
      email: faculty.email,
      first_name: faculty.first_name || '',
      last_name: faculty.last_name || '',
      role: faculty.role
    });
    setShowModal(true);
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

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1" style={{ marginLeft: '250px', marginTop: '56px' }}>
        <Navbar />
        <div className="p-4">
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
                          Edit
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
        </div>
      </div>
    </div>
  );
};

export default FacultyManagement;