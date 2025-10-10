import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Card, Table, Badge, ButtonGroup, Dropdown } from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import axiosInstance from '../utils/axios';
import moment from 'moment';

const NotificationManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [currentView, setCurrentView] = useState('inbox'); // inbox, sent, unread
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = localStorage.getItem('role');
  const canSendNotifications = ['admin', 'coordinator', 'guide'].includes(userRole);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    sent_to_ids: [],
    related_event: ''
  });

  useEffect(() => {
    fetchNotifications();
    if (canSendNotifications) {
      fetchEvents();
      fetchUsers();
    }
  }, [canSendNotifications]);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/api/notifications/my_notifications/');
      setNotifications(response.data);
    } catch (error) {
      setError('Failed to fetch notifications: ' + error.message);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get('/api/calendar/');
      setEvents(response.data);
    } catch (error) {
      setError('Failed to fetch events: ' + error.message);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching all users...');
      const response = await axiosInstance.get('/api/all-users/');
      console.log('Users response:', response);
      
      const users = response?.data || [];
      console.log('All users:', users);
      
      setUsers(users);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      setError('Failed to fetch users: ' + (error?.message || error?.toString() || 'Unknown error'));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, options } = e.target;
    if (name === 'sent_to_ids' && options) {
      const selectedUsers = Array.from(options)
        .filter(option => option.selected)
        .map(option => parseInt(option.value));
      setFormData({ ...formData, [name]: selectedUsers });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/notifications/', formData);
      setSuccess('Notification sent successfully');
      setShowModal(false);
      fetchNotifications();
      resetForm();
    } catch (error) {
      setError('Failed to send notification: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      sent_to_ids: [],
      related_event: ''
    });
  };

  const markAsRead = async (notificationId) => {
    try {
      await axiosInstance.post(`/api/notifications/${notificationId}/mark_as_read/`);
      fetchNotifications();
    } catch (error) {
      setError('Failed to mark notification as read: ' + error.message);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="d-flex">
        <Sidebar />
        <div className="flex-grow-1" style={{ marginLeft: '250px', marginTop: '56px' }}>
          <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Notifications</h2>
              {canSendNotifications && (
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  Send Notification
                </Button>
              )}
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            <div className="notifications-container">
              {notifications.map((notification) => (
                <Card key={notification.id} className="mb-3">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <Card.Title>{notification.title}</Card.Title>
                        <Card.Text>{notification.message}</Card.Text>
                        <small className="text-muted">
                          From: {notification.sent_by_name} • 
                          {moment(notification.created_at).fromNow()}
                        </small>
                      </div>
                      {!notification.read && (
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
              {notifications.length === 0 && (
                <p className="text-center text-muted">No notifications to display</p>
              )}
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Send Notification</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Control
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={3}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Recipients</Form.Label>
                    <Form.Select
                      multiple
                      name="sent_to"
                      value={formData.sent_to}
                      onChange={handleInputChange}
                      style={{ height: '200px' }}
                      required
                    >
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.role})
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Hold Ctrl (Windows) or Command (Mac) to select multiple recipients
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Related Event (Optional)</Form.Label>
                    <Form.Select
                      name="related_event"
                      value={formData.related_event}
                      onChange={handleInputChange}
                    >
                      <option value="">None</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>
                          {event.title} ({moment(event.start_date).format('MMMM D, YYYY')})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                      Send Notification
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManagement;