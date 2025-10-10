import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Card, Table, Badge, ButtonGroup, Dropdown } from 'react-bootstrap';
import Layout from '../components/Layout';
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
  const [expandedRecipients, setExpandedRecipients] = useState({});
  const [currentView, setCurrentView] = useState('inbox'); // inbox, sent, unread
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const userRole = localStorage.getItem('role');
  const currentUserId = parseInt(localStorage.getItem('userId'));
  const canSendNotifications = ['admin', 'coordinator', 'guide'].includes(userRole);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    sent_to_ids: [],
    related_event: ''
  });

  useEffect(() => {
    fetchNotifications();
    fetchUnreadNotifications();
    if (canSendNotifications) {
      fetchSentNotifications();
      fetchEvents();
      fetchUsers();
    }
  }, [canSendNotifications]);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/api/notifications/');
      setNotifications(response.data);
    } catch (error) {
      setError('Failed to fetch notifications: ' + error.message);
    }
  };

  const fetchSentNotifications = async () => {
    try {
      const response = await axiosInstance.get('/api/notifications/sent/');
      setSentNotifications(response.data);
    } catch (error) {
      setError('Failed to fetch sent notifications: ' + error.message);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const response = await axiosInstance.get('/api/notifications/unread/');
      setUnreadNotifications(response.data);
    } catch (error) {
      setError('Failed to fetch unread notifications: ' + error.message);
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
      const response = await axiosInstance.get('/api/all-users/');
      setUsers(response?.data || []);
    } catch (error) {
      setError('Failed to fetch users: ' + (error?.message || 'Unknown error'));
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
      fetchSentNotifications();
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

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    // Only mark as read if not in sent view and notification is unread
    if (currentView !== 'sent' && !notification.read) {
      markAsRead(notification.id);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axiosInstance.post(`/api/notifications/${notificationId}/mark_as_read/`);
      refreshCurrentView();
    } catch (error) {
      setError('Failed to mark notification as read: ' + error.message);
    }
  };

  const markAsUnread = async (notificationId) => {
    try {
      await axiosInstance.post(`/api/notifications/${notificationId}/mark_as_unread/`);
      refreshCurrentView();
    } catch (error) {
      setError('Failed to mark notification as unread: ' + error.message);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axiosInstance.post(`/api/notifications/${notificationId}/delete_notification/`);
      setSuccess('Notification deleted');
      refreshCurrentView();
    } catch (error) {
      setError('Failed to delete notification: ' + error.message);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedNotifications.length === 0) {
      setError('Please select notifications first');
      return;
    }

    try {
      await axiosInstance.post('/api/notifications/bulk_action/', {
        action: action,
        notification_ids: selectedNotifications
      });
      setSuccess(`Bulk ${action} completed`);
      setSelectedNotifications([]);
      refreshCurrentView();
    } catch (error) {
      setError(`Failed to perform bulk ${action}: ` + error.message);
    }
  };

  const markAllRead = async () => {
    try {
      await axiosInstance.post('/api/notifications/mark_all_read/');
      setSuccess('All notifications marked as read');
      refreshCurrentView();
    } catch (error) {
      setError('Failed to mark all as read: ' + error.message);
    }
  };

  const refreshCurrentView = () => {
    fetchNotifications();
    fetchUnreadNotifications();
    if (canSendNotifications) {
      fetchSentNotifications();
    }
  };

  const getCurrentNotifications = () => {
    switch (currentView) {
      case 'sent': return sentNotifications;
      case 'unread': return unreadNotifications;
      default: return notifications;
    }
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId) 
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    const currentNotifications = getCurrentNotifications();
    setSelectedNotifications(
      selectedNotifications.length === currentNotifications.length 
        ? [] 
        : currentNotifications.map(n => n.id)
    );
  };

  const toggleRecipients = (notificationId) => {
    setExpandedRecipients(prev => ({
      ...prev,
      [notificationId]: !prev[notificationId]
    }));
  };

  return (
    <Layout>
          <div className="p-2 p-md-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Notifications</h2>
              {canSendNotifications && (
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Compose
                </Button>
              )}
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            {/* Navigation Tabs */}
            <div className="d-flex gap-3 mb-4">
              <Button 
                variant={currentView === 'inbox' ? 'primary' : 'outline-primary'}
                onClick={() => setCurrentView('inbox')}
              >
                <i className="bi bi-inbox me-2"></i>
                Inbox ({notifications.length})
              </Button>
              <Button 
                variant={currentView === 'unread' ? 'primary' : 'outline-primary'}
                onClick={() => setCurrentView('unread')}
              >
                <i className="bi bi-envelope me-2"></i>
                Unread ({unreadNotifications.length})
              </Button>
              {canSendNotifications && (
                <Button 
                  variant={currentView === 'sent' ? 'primary' : 'outline-primary'}
                  onClick={() => setCurrentView('sent')}
                >
                  <i className="bi bi-send me-2"></i>
                  Sent ({sentNotifications.length})
                </Button>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="d-flex justify-content-between mb-3">
              <div className="d-flex gap-2">
                <Form.Check
                  type="checkbox"
                  checked={selectedNotifications.length === getCurrentNotifications().length && getCurrentNotifications().length > 0}
                  onChange={handleSelectAll}
                  label="Select All"
                />
                {selectedNotifications.length > 0 && (
                  <ButtonGroup>
                    {currentView !== 'sent' && (
                      <>
                        <Button 
                          variant="outline-success" 
                          size="sm"
                          onClick={() => handleBulkAction('mark_read')}
                        >
                          Mark Read
                        </Button>
                        <Button 
                          variant="outline-warning" 
                          size="sm"
                          onClick={() => handleBulkAction('mark_unread')}
                        >
                          Mark Unread
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleBulkAction('delete')}
                    >
                      Delete
                    </Button>
                  </ButtonGroup>
                )}
              </div>
              {currentView !== 'sent' && (
                <Button variant="outline-secondary" size="sm" onClick={markAllRead}>
                  Mark All Read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <Card>
              <Table hover className="mb-0">
                <tbody>
                  {getCurrentNotifications().map((notification) => (
                    <tr key={notification.id} className={!notification.read ? 'table-warning' : ''}>
                      <td style={{ width: '40px' }}>
                        <Form.Check
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={() => handleSelectNotification(notification.id)}
                        />
                      </td>
                      <td 
                        className="cursor-pointer" 
                        onClick={() => handleNotificationClick(notification)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="d-flex align-items-center gap-2">
                              <strong>{notification.title}</strong>
                              {!notification.read && <Badge bg="primary">New</Badge>}
                            </div>
                            <div className="text-muted small">
                              From: {notification.sent_by_name}
                            </div>
                            <div className="text-truncate" style={{ maxWidth: '500px' }}>
                              {notification.message}
                            </div>
                          </div>
                          <div className="text-end">
                            <small className="text-muted">
                              {moment(notification.created_at).fromNow()}
                            </small>
                            <div className="mt-1">
                              <ButtonGroup size="sm">
                                {currentView !== 'sent' && (
                                  <Button 
                                    variant="outline-secondary" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      notification.read ? markAsUnread(notification.id) : markAsRead(notification.id);
                                    }}
                                  >
                                    {notification.read ? 'Mark Unread' : 'Mark Read'}
                                  </Button>
                                )}
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              </ButtonGroup>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {getCurrentNotifications().length === 0 && (
                    <tr>
                      <td colSpan="2" className="text-center text-muted py-4">
                        No notifications to display
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>

            {/* Compose Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>Compose Notification</Modal.Title>
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
                      rows={4}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Recipients</Form.Label>
                    <Form.Select
                      multiple
                      name="sent_to_ids"
                      value={formData.sent_to_ids}
                      onChange={handleInputChange}
                      style={{ height: '200px' }}
                      required
                    >
                      {users.filter(user => user.id !== currentUserId).map(user => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} - ({user.role})
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
                      <i className="bi bi-send me-2"></i>
                      Send Notification
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal>

            {/* Detail Modal */}
            <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
              <Modal.Header closeButton>
                <Modal.Title>{selectedNotification?.title}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {selectedNotification && (
                  <div>
                    <div className="mb-3">
                      <strong>From:</strong> {selectedNotification.sent_by_name}
                    </div>
                    <div className="mb-3">
                      <strong>Date:</strong> {moment(selectedNotification.created_at).format('MMMM D, YYYY h:mm A')}
                    </div>
                    <div className="mb-3">
                      <strong>Message:</strong>
                      <div className="border p-3 mt-2 bg-light rounded">
                        {selectedNotification.message}
                      </div>
                    </div>
                    {currentView === 'sent' && (
                      <div className="mb-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <strong>Recipients:</strong> 
                          <span className="badge bg-primary">{selectedNotification.recipients ? selectedNotification.recipients.length : 0} users</span>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => toggleRecipients(selectedNotification.id)}
                          >
                            {expandedRecipients[selectedNotification.id] ? 'Hide Details' : 'Show Details'}
                          </Button>
                        </div>
                        {expandedRecipients[selectedNotification.id] && selectedNotification.recipients && (
                          <div className="border p-3 bg-light rounded">
                            {selectedNotification.recipients.map((recipient, index) => (
                              <div key={index} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                                <div>
                                  <div className="fw-bold">{recipient.name}</div>
                                  <div className="text-muted small">{recipient.role}</div>
                                </div>
                                <div>
                                  {recipient.read ? (
                                    <Badge bg="success">Read</Badge>
                                  ) : (
                                    <Badge bg="secondary">Unread</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
                {selectedNotification && currentView !== 'sent' && (
                  <>
                    <Button 
                      variant="outline-warning"
                      onClick={() => {
                        selectedNotification.read ? markAsUnread(selectedNotification.id) : markAsRead(selectedNotification.id);
                        setShowDetailModal(false);
                      }}
                    >
                      {selectedNotification.read ? 'Mark Unread' : 'Mark Read'}
                    </Button>
                    <Button 
                      variant="danger"
                      onClick={() => {
                        deleteNotification(selectedNotification.id);
                        setShowDetailModal(false);
                      }}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {selectedNotification && currentView === 'sent' && (
                  <Button 
                    variant="danger"
                    onClick={() => {
                      deleteNotification(selectedNotification.id);
                      setShowDetailModal(false);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </Modal.Footer>
            </Modal>
          </div>
    </Layout>
  );
};

export default NotificationManagement;