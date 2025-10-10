import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, InputGroup, FormControl } from 'react-bootstrap';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showChangeGuideModal, setShowChangeGuideModal] = useState(false);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'assigned', 'unassigned'
  const [searchTerm, setSearchTerm] = useState('');
  const [adminEditFormData, setAdminEditFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    registration_number: '',
    department: '',
    description: ''
  });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    registration_number: '',
    department: '',
    role: 'student'
  });

  const userRole = localStorage.getItem('role');

  useEffect(() => {
    fetchStudents();
    if (userRole === 'coordinator') {
      fetchFaculties();
    }
  }, [userRole]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/students/');
      console.log('Fetched students:', response.data);
      setStudents(response.data);
    } catch (error) {
      console.error('Fetch error:', error.response?.data || error.message);
      setError('Failed to fetch students: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await axiosInstance.get('/api/faculty/');
      const guideFaculties = response.data.filter(faculty => faculty.role === 'guide');
      setFaculties(guideFaculties);
    } catch (error) {
      console.error('Fetch error:', error.response?.data || error.message);
      setError('Failed to fetch faculties: ' + (error.response?.data?.detail || error.message));
    }
  };

  const isStudentAssigned = (student) => {
    if (!student) return false;
    return Boolean(student.guide) || Boolean(student.guide_name);
  };

  const filteredStudents = students.filter(student => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'assigned' && isStudentAssigned(student)) || 
      (filter === 'unassigned' && !isStudentAssigned(student));

    const matchesSearch = 
      student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Create new student
      const response = await axiosInstance.post(
        '/api/students/', 
        formData
      );
      console.log('Create response:', response.data);
      setSuccess('Student created successfully');
      setShowModal(false);
      fetchStudents();
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
        setError('An error occurred while saving the student. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      username: student.username,
      email: student.email,
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      registration_number: student.registration_number || '',
      department: student.department || '',
      role: 'student'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      setLoading(true);
      try {
        await axiosInstance.delete(`/api/students/${id}/`);
        setSuccess('Student deleted successfully');
        fetchStudents();
      } catch (error) {
        setError('Failed to delete student');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAdminEdit = (student) => {
    setSelectedStudent(student);
    setAdminEditFormData({
      username: student.username,
      email: student.email,
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      registration_number: student.registration_number || '',
      department: student.department || '',
      description: student.description || ''
    });
    setShowAdminEditModal(true);
  };

  const handleAdminEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axiosInstance.put(
        `/api/students/${selectedStudent.id}/admin-edit/`,
        adminEditFormData
      );
      console.log('Admin edit response:', response.data);
      setSuccess('Student details updated successfully');
      setShowAdminEditModal(false);
      fetchStudents();
    } catch (error) {
      console.error('Admin edit error:', error.response?.data);
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat().join(', ');
        setError(errorMessages);
      } else {
        setError('Failed to update student details');
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

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      registration_number: '',
      department: '',
      role: 'student'
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]); // Deselect all
    } else {
      setSelectedStudents(students.map(s => s.id)); // Select all
    }
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleChangeGuide = async () => {
    if (selectedStudents.length === 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const studentPromises = selectedStudents.map(studentId =>
        axiosInstance.post(
          `/api/students/${studentId}/change_guide/`,
          selectedGuide ? { guide_id: selectedGuide } : {}
        )
      );

      const responses = await Promise.all(studentPromises);
      
      // Update the students in the local state immediately
      setStudents(prevStudents => {
        const updatedStudents = [...prevStudents];
        responses.forEach(response => {
          const index = updatedStudents.findIndex(s => s.id === response.data.student.id);
          if (index !== -1) {
            updatedStudents[index] = response.data.student;
          }
        });
        return updatedStudents;
      });
      
      const successMessage = selectedGuide 
        ? `Guide assigned to ${selectedStudents.length} student(s)` 
        : `Guide removed from ${selectedStudents.length} student(s)`;
      
      setSuccess(successMessage);
      setShowChangeGuideModal(false);
      setSelectedStudents([]);
      setSelectedGuide('');
    } catch (error) {
      console.error('Change guide error:', error.response?.data || error.message);
      setError('Failed to change guide: ' + (error.response?.data?.error || error.message));
      // Refresh the students list to ensure we have the correct state
      fetchStudents();
    } finally {
      setLoading(false);
    }
  };

  const handleGuideAllocation = async () => {
    if (!selectedGuide || selectedStudents.length === 0) {
      setError('Please select a guide and at least one student');
      return;
    }

    // Get the selected students details for confirmation
    const studentsToAssign = students
      .filter(s => selectedStudents.includes(s.id))
      .map(s => `${s.first_name} ${s.last_name} (${s.registration_number})`);

    const guide = faculties.find(f => f.id === parseInt(selectedGuide));
    const guideName = guide ? `${guide.first_name} ${guide.last_name}` : 'Selected guide';

    // Confirm the assignment
    if (!window.confirm(
      `Are you sure you want to assign the following ${studentsToAssign.length} students to ${guideName}?\n\n` +
      studentsToAssign.join('\n')
    )) {
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/students/assign_guide/', {
        guide_id: selectedGuide,
        student_ids: selectedStudents
      });
      
      // Update the students in the local state immediately
      setStudents(prevStudents => {
        const updatedStudents = [...prevStudents];
        response.data.updated_students.forEach(updatedStudent => {
          const index = updatedStudents.findIndex(s => s.id === updatedStudent.id);
          if (index !== -1) {
            updatedStudents[index] = updatedStudent;
          }
        });
        return updatedStudents;
      });

      setSuccess(response.data.message);
      setShowAllocationModal(false);
      setSelectedStudents([]);
      setSelectedGuide('');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error('Guide allocation error:', errorMessage);
      setError('Failed to allocate guide: ' + errorMessage);
      // Refresh the list in case of error to ensure we have the correct state
      fetchStudents();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
        <div className="p-2 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Student Management</h2>
            <div className="d-flex gap-2">
              {userRole === 'coordinator' && selectedStudents.length > 0 && (
                <Button 
                  variant="warning"
                  onClick={() => setShowChangeGuideModal(true)}
                  disabled={loading}
                >
                  Change Guide for Selected ({selectedStudents.length})
                </Button>
              )}
              <Button 
                variant="primary" 
                onClick={() => { setShowModal(true); resetForm(); }}
                disabled={loading}
              >
                Add New Student
              </Button>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex gap-2">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('all')}
              >
                All Students
              </Button>
              <Button
                variant={filter === 'assigned' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('assigned')}
              >
                With Guide
              </Button>
              <Button
                variant={filter === 'unassigned' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('unassigned')}
              >
                Without Guide
              </Button>
            </div>
            <div style={{ width: '300px' }}>
              <InputGroup>
                <FormControl
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear
                  </Button>
                )}
              </InputGroup>
            </div>
          </div>

          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  {userRole === 'coordinator' && (
                    <th className="text-center" style={{ width: '50px' }}>
                      <Form.Check
                        type="checkbox"
                        onChange={() => handleSelectAll()}
                        checked={students.length > 0 && selectedStudents.length === students.length}
                        indeterminate={selectedStudents.length > 0 && selectedStudents.length < students.length}
                      />
                    </th>
                  )}
                  <th>Username</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registration Number</th>
                  <th>Department</th>
                  <th>Guide</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    {userRole === 'coordinator' && (
                      <td className="text-center">
                        <Form.Check
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelection(student.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    <td>{student.username}</td>
                  <td>{`${student.first_name} ${student.last_name}`.trim()}</td>
                  <td>{student.email}</td>
                  <td>
                    {student.registration_number || (
                      <span className="text-muted">Not Set</span>
                    )}
                  </td>
                  <td>
                    {student.department || (
                      <span className="text-muted">Not Set</span>
                    )}
                  </td>
                  <td>
                    {student.guide_name ? (
                      <Badge bg="success">{student.guide_name}</Badge>
                    ) : (
                      <Badge bg="warning">Not Assigned</Badge>
                    )}
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      {userRole === 'admin' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAdminEdit(student)}
                          disabled={loading}
                        >
                          Edit Details
                        </Button>
                      )}
                      {userRole === 'coordinator' && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => {
                            setSelectedStudents([student.id]);
                            setSelectedGuide('');
                            setShowChangeGuideModal(true);
                          }}
                          disabled={loading}
                        >
                          {isStudentAssigned(student) ? 'Change Guide' : 'Assign Guide'}
                        </Button>
                      )}
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDelete(student.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          </div>

          {/* Student Add/Edit Modal */}
          <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Add New Student</Modal.Title>
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
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Registration Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Department</Form.Label>
                  <Form.Control
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (selectedStudents.length === 1 ? 'Update' : 'Create')}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>

          {/* Change Guide Modal */}
          <Modal show={showChangeGuideModal} onHide={() => setShowChangeGuideModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>
                Change Guide for Selected Students
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-2">
                You're changing guide for {selectedStudents.length} student(s).
              </p>
              <div className="mb-3 max-height-200 overflow-auto">
                <ul className="list-unstyled">
                  {selectedStudents.map(id => {
                    const student = students.find(s => s.id === id);
                    return (
                      <li key={id} className="mb-1">
                        • {student?.first_name} {student?.last_name}
                        {student?.registration_number && ` (${student.registration_number})`}
                        {student?.guide_name && (
                          <span className="text-muted ms-1">
                            - Current Guide: {student.guide_name}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Select Guide</Form.Label>
                <Form.Select
                  value={selectedGuide}
                  onChange={(e) => setSelectedGuide(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Choose a guide...</option>
                  <option value="">-- Remove Current Guide --</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.first_name} {faculty.last_name} ({faculty.email})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowChangeGuideModal(false)} disabled={loading}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleChangeGuide} 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Confirm'}
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Admin Edit Modal */}
          <Modal show={showAdminEditModal} onHide={() => setShowAdminEditModal(false)} size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Edit Student Details (Admin Only)</Modal.Title>
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
                        placeholder="e.g. 2024001"
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
                    placeholder="Student description or notes..."
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
                    {loading ? 'Updating...' : 'Update Student'}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>
        </div>
    </Layout>
  );
};

export default StudentManagement;