import React, { useState } from 'react';
import { Alert, Button, Form, Card, Container, Row, Col, Modal } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    usernameOrEmail: ''
  });
  const [resetData, setResetData] = useState({
    username: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFound, setUserFound] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.usernameOrEmail.trim()) {
      setError('Please enter your username or email');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/forgot-password/', {
        username_or_email: formData.usernameOrEmail
      });

      setUserFound(response.data.user_info);
      setResetData({ ...resetData, username: response.data.user_info.username });
      setSuccess('User found! You can now reset your password.');
      setShowResetModal(true);

    } catch (error) {
      console.error('Forgot password error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to find user. Please check your username or email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetData.newPassword || !resetData.confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/reset-password/', {
        username: resetData.username,
        new_password: resetData.newPassword,
        confirm_password: resetData.confirmPassword
      });

      setSuccess('Password reset successfully! You can now login with your new password.');
      setShowResetModal(false);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Reset password error:', error);
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100">
        <Col xs={12} md={6} lg={4} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary">ProjTrack Desk</h2>
                <p className="text-muted">Reset your password</p>
              </div>

              {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success">
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleForgotSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username or Email</Form.Label>
                  <Form.Control
                    type="text"
                    name="usernameOrEmail"
                    value={formData.usernameOrEmail}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    placeholder="Enter your username or email"
                  />
                  <Form.Text className="text-muted">
                    We'll help you reset your password.
                  </Form.Text>
                </Form.Group>

                <Button 
                  variant="primary" 
                  type="submit" 
                  className="w-100 mb-3"
                  disabled={loading}
                >
                  {loading ? 'Finding User...' : 'Find My Account'}
                </Button>

                <div className="text-center">
                  <Link to="/login" className="text-decoration-none">
                    Back to Login
                  </Link>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Reset Password Modal */}
      <Modal show={showResetModal} onHide={() => setShowResetModal(false)} backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userFound && (
            <div className="mb-3">
              <Alert variant="info">
                <strong>Account Found:</strong><br />
                Username: {userFound.username}<br />
                Email: {userFound.email}<br />
                Name: {userFound.full_name}
              </Alert>
            </div>
          )}

          <Form onSubmit={handleResetSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={resetData.newPassword}
                onChange={handleResetChange}
                required
                disabled={loading}
                placeholder="Enter new password"
                minLength={6}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={resetData.confirmPassword}
                onChange={handleResetChange}
                required
                disabled={loading}
                placeholder="Confirm new password"
                minLength={6}
              />
              <Form.Text className="text-muted">
                Password must be at least 6 characters long.
              </Form.Text>
            </Form.Group>

            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowResetModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ForgotPassword;
