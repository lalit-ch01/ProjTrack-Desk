import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Modal, Image, Spinner } from 'react-bootstrap';
import { FaEdit, FaSave, FaTimes, FaUser, FaEnvelope, FaIdCard, FaUserTag, FaBuilding, FaUserFriends, FaFileAlt } from 'react-icons/fa';
import Layout from '../../../components/Layout';
import axiosInstance from '../../../utils/axios';

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    username: '',
    description: '',
    profile_image: null
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/auth/user/');
      setUserProfile(response.data);
      setFormData({
        username: response.data.username,
        description: response.data.description || '',
        profile_image: null
      });
    } catch (error) {
      setError('Failed to fetch user profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        profile_image: file
      }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('description', formData.description);
      
      if (formData.profile_image) {
        formDataToSend.append('profile_image', formData.profile_image);
      }

      const response = await axiosInstance.put('/api/auth/user/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUserProfile(response.data.user);
      setSuccess('Profile updated successfully');
      setEditMode(false);
      setImagePreview(null);
    } catch (error) {
      if (error.response?.data) {
        const errorMessages = Object.values(error.response.data).flat().join(', ');
        setError(errorMessages);
      } else {
        setError('Failed to update profile: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setImagePreview(null);
    setFormData({
      username: userProfile.username,
      description: userProfile.description || '',
      profile_image: null
    });
    setError('');
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'admin': return 'danger';
      case 'coordinator': return 'primary';
      case 'guide': return 'success';
      case 'student': return 'info';
      default: return 'secondary';
    }
  };

  const getDefaultAvatar = () => {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f8f9fa'/%3E%3C/svg%3E";
  };

  if (loading) {
    return (
      <Layout>
        <Container className="py-4">
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3">Loading profile...</p>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="py-3 py-md-4">
        <Row className="justify-content-center">
          <Col lg={8} xl={6}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white border-bottom-0 py-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="mb-0 text-primary">
                    <FaUser className="me-2" />
                    User Profile
                  </h2>
                  {!editMode ? (
                    <Button 
                      variant="outline-primary" 
                      onClick={() => setEditMode(true)}
                      className="d-flex align-items-center"
                    >
                      <FaEdit className="me-1" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="d-flex gap-2">
                      <Button 
                        variant="outline-secondary" 
                        onClick={handleCancel}
                        disabled={saving}
                        className="d-flex align-items-center"
                      >
                        <FaTimes className="me-1" />
                        Cancel
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={handleSubmit}
                        disabled={saving}
                        className="d-flex align-items-center"
                      >
                        {saving ? (
                          <Spinner animation="border" size="sm" className="me-1" />
                        ) : (
                          <FaSave className="me-1" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card.Header>

              <Card.Body className="p-4">
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                    {success}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <div className="text-center mb-4">
                    <div className="position-relative d-inline-block">
                      <Image
                        src={imagePreview || userProfile?.profile_image_url || getDefaultAvatar()}
                        alt="Profile"
                        roundedCircle
                        width={120}
                        height={120}
                        className="border border-3 border-light shadow-sm"
                        style={{ objectFit: 'cover', cursor: userProfile?.profile_image_url ? 'pointer' : 'default' }}
                        onClick={() => userProfile?.profile_image_url && setShowImageModal(true)}
                      />
                      {editMode && (
                        <div className="mt-3">
                          <Form.Group>
                            <Form.Label className="btn btn-sm btn-outline-primary">
                              <FaEdit className="me-1" />
                              Change Photo
                              <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                hidden
                              />
                            </Form.Label>
                          </Form.Group>
                        </div>
                      )}
                    </div>
                  </div>

                  <Row>
                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold text-muted">
                          <FaEnvelope className="me-1" />
                          Email Address
                        </Form.Label>
                        <Form.Control
                          type="email"
                          value={userProfile?.email || ''}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={6} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold text-muted">
                          <FaIdCard className="me-1" />
                          Registration Number
                        </Form.Label>
                        <Form.Control
                          type="text"
                          value={userProfile?.registration_number || 'N/A'}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold text-muted">
                          <FaUser className="me-1" />
                          Username {editMode && <span className="text-danger">*</span>}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={editMode ? formData.username : userProfile?.username || ''}
                          onChange={handleInputChange}
                          readOnly={!editMode}
                          className={editMode ? '' : 'bg-light'}
                          required={editMode}
                          minLength={3}
                        />
                      </Form.Group>
                    </Col>

                    <Col md={12} className="mb-3">
                      <Form.Group>
                        <Form.Label className="fw-bold text-muted">
                          <FaFileAlt className="me-1" />
                          Description
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="description"
                          value={editMode ? formData.description : userProfile?.description || ''}
                          onChange={handleInputChange}
                          readOnly={!editMode}
                          className={editMode ? '' : 'bg-light'}
                          placeholder={editMode ? "Tell us about yourself..." : "No description provided"}
                          maxLength={500}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Profile Picture</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <Image
              src={userProfile?.profile_image_url}
              alt="Profile"
              fluid
              className="rounded"
            />
          </Modal.Body>
        </Modal>
      </Container>
    </Layout>
  );
};

export default UserProfile;
