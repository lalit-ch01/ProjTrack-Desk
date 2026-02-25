import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Card, Row, Col, ProgressBar, Dropdown } from 'react-bootstrap';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

const ProjectManagement = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Handle status change (activate/deactivate)
  const handleStatusChange = async (id, newStatus) => {
    setLoading(true);
    setError('');
    try {
      await axiosInstance.patch(`/api/project-activities/${id}/`, { status: newStatus });
      setSuccess(`Activity ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      fetchActivities();
    } catch (err) {
      setError('Failed to update activity status');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete activity
  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await axiosInstance.delete(`/api/project-activities/${id}/`);
      setSuccess('Activity deleted successfully!');
      fetchActivities();
    } catch (err) {
      setError('Failed to delete activity');
    } finally {
      setLoading(false);
    }
  };

  // Handle view details
  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setShowDetailModal(true);
  };

  // Handle edit
  const handleEditClick = async (activity) => {
    try {
      // Fetch fresh activity data with reviews
      const response = await axiosInstance.get(`/api/project-activities/${activity.id}/`);
      const freshActivity = response.data;
      
      // Format review dates for date inputs
      const formattedReviews = (freshActivity.reviews || []).map(review => ({
        ...review,
        review_date: review.review_date ? review.review_date.slice(0, 10) : ''
      }));
      
      setSelectedActivity(freshActivity);
      setActivityFormData({
        ...freshActivity,
        start_date: freshActivity.start_date ? freshActivity.start_date.slice(0, 10) : '',
        end_date: freshActivity.end_date ? freshActivity.end_date.slice(0, 10) : '',
        topic_submission_deadline: freshActivity.topic_submission_deadline ? freshActivity.topic_submission_deadline.slice(0, 10) : '',
        reviews: formattedReviews
      });
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching activity details:', error);
      setError('Failed to load activity details');
    }
  };

  // Modals
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Form data
  const [activityFormData, setActivityFormData] = useState({
    title: '',
    description: '',
    activity_type: 'mini_project',
    start_date: '',
    end_date: '',
    topic_submission_deadline: '',
    guidelines: '',
    max_team_size: 1,
    min_team_size: 1,
    status: 'draft',
    is_visible_to_students: true,  // Always true by default
    assigned_to_all_students: true,  // Always true by default
    reviews: []
  });

  const [reviewFormData, setReviewFormData] = useState({
    review_number: 1,
    title: '',
    review_date: ''
  });

  const userRole = localStorage.getItem('role');

  useEffect(() => {
    // Only fetch activities for coordinators
    if (userRole === 'coordinator') {
      fetchActivities();
    }
  }, [userRole]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/project-activities/');
      setActivities(response.data);
    } catch (error) {
      setError('Failed to fetch project activities');
    } finally {
      setLoading(false);
    }
  };



  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      const isEditing = showEditModal && selectedActivity?.id;
      
      Object.keys(activityFormData).forEach(key => {
        if (key === 'reviews' || key === 'id' || key === 'created_by' || key === 'created_at' || key === 'updated_at') {
          // Skip reviews and read-only fields
          return;
        }
        if (activityFormData[key] !== null && activityFormData[key] !== '') {
          formData.append(key, activityFormData[key]);
        }
      });

      let response;
      if (isEditing) {
        // Update existing activity
        response = await axiosInstance.put(`/api/project-activities/${selectedActivity.id}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Create new activity
        response = await axiosInstance.post('/api/project-activities/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // Handle reviews
      let reviewErrors = [];
      const activityId = response.data.id;
      
      if (activityFormData.reviews && activityFormData.reviews.length > 0) {
        // Get existing reviews if editing
        let existingReviews = [];
        if (isEditing) {
          try {
            const existingResponse = await axiosInstance.get(`/api/project-reviews/?activity=${activityId}`);
            existingReviews = existingResponse.data.results || existingResponse.data;
          } catch (err) {
            console.error('Error fetching existing reviews:', err);
          }
        }

        // Process each review in the form
        for (const review of activityFormData.reviews) {
          try {
            const reviewData = {
              activity: activityId,
              review_number: review.review_number,
              title: review.title,
              description: review.description || '',
              review_date: review.review_date.includes('T') ? review.review_date : new Date(review.review_date).toISOString()
            };

            if (review.id) {
              // Update existing review
              await axiosInstance.put(`/api/project-reviews/${review.id}/`, reviewData);
            } else {
              // Create new review
              await axiosInstance.post('/api/project-reviews/', reviewData);
            }
          } catch (reviewError) {
            console.error('Error saving review:', reviewError);
            reviewErrors.push(`Review ${review.review_number}: ${reviewError.response?.data?.detail || reviewError.message}`);
          }
        }

        // Delete reviews that were removed (only when editing)
        if (isEditing && existingReviews.length > 0) {
          const currentReviewIds = activityFormData.reviews.filter(r => r.id).map(r => r.id);
          const reviewsToDelete = existingReviews.filter(er => !currentReviewIds.includes(er.id));
          
          for (const reviewToDelete of reviewsToDelete) {
            try {
              await axiosInstance.delete(`/api/project-reviews/${reviewToDelete.id}/`);
            } catch (deleteError) {
              console.error('Error deleting review:', deleteError);
            }
          }
        }
      }

      if (reviewErrors.length > 0) {
        setSuccess(`Project activity ${isEditing ? 'updated' : 'created'}, but some reviews failed: ${reviewErrors.join(', ')}`);
      } else {
        setSuccess(`Project activity ${isEditing ? 'updated' : 'created'} successfully!`);
      }
      
      setShowActivityModal(false);
      setShowEditModal(false);
      fetchActivities();
      resetActivityForm();
    } catch (error) {
      console.error('Error saving activity:', error);
      setError(error.response?.data?.detail || error.response?.data?.error || 'Failed to save project activity');
    } finally {
      setLoading(false);
    }
  };



  const resetActivityForm = () => {
    setActivityFormData({
      title: '',
      description: '',
      activity_type: 'mini_project',
      start_date: '',
      end_date: '',
      topic_submission_deadline: '',
      guidelines: '',
      max_team_size: 1,
      min_team_size: 1,
      status: 'draft',
      is_visible_to_students: true,  // Always true by default
      assigned_to_all_students: true,  // Always true by default
      reviews: []
    });
  };

  const addReview = () => {
    // Validate review data
    if (!reviewFormData.title || !reviewFormData.title.trim()) {
      setError('Please enter a review title');
      return;
    }
    if (!reviewFormData.review_date) {
      setError('Please select a review date');
      return;
    }

    // Add review to the list
    setActivityFormData({
      ...activityFormData,
      reviews: [
        ...activityFormData.reviews,
        { ...reviewFormData }
      ]
    });

    // Reset review form with next review number
    setReviewFormData({
      review_number: activityFormData.reviews.length + 2,
      title: '',
      review_date: ''
    });

    // Don't show success message here - wait until the activity is actually saved
  };

  const removeReview = (index) => {
    const newReviews = activityFormData.reviews.filter((_, i) => i !== index);
    setActivityFormData({
      ...activityFormData,
      reviews: newReviews
    });
  };



  const getStatusBadge = (status) => {
    const statusMap = {
      'draft': 'secondary',
      'active': 'success',
      'completed': 'primary',
      'archived': 'dark',
      'submitted': 'warning',
      'approved': 'success',
      'rejected': 'danger',
      'under_review': 'info'
    };
    return <Badge bg={statusMap[status] || 'secondary'}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const getActivityTypeIcon = (type) => {
    const iconMap = {
      'mini_project': '💻',
      'major_project': '🚀',
      'seminar': '📊',
      'assignment': '📝',
      'research': '🔬',
      'internship': '🏢'
    };
    return iconMap[type] || '📋';
  };

  const renderCoordinatorView = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Project Management</h2>
        <Button 
          variant="primary" 
          onClick={() => setShowActivityModal(true)}
          disabled={loading}
        >
          Create New Activity
        </Button>
      </div>

      {/* Activity Cards */}
      <Row>
        {activities.map((activity) => (
          <Col key={activity.id} lg={6} xl={4} className="mb-4">
            <Card className="h-100 border border-3 border-light shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <span className="me-2 fs-4">{getActivityTypeIcon(activity.activity_type)}</span>
                  <span className="fw-bold">{activity.title}</span>
                </div>
                {getStatusBadge(activity.status)}
              </Card.Header>
              <Card.Body>
                <p className="text-muted small mb-2">{activity.description}</p>
                <div className="mb-3">
                  <small className="text-muted d-block">
                    <strong>Timeline:</strong> {new Date(activity.start_date).toLocaleDateString()} - {new Date(activity.end_date).toLocaleDateString()}
                  </small>
                  <small className="text-muted d-block">
                    <strong>Topic Deadline:</strong> {new Date(activity.topic_submission_deadline).toLocaleDateString()}
                  </small>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small><strong>Students:</strong> {activity.total_assigned_students}</small>
                  <small><strong>Topics:</strong> {activity.topics_submitted_count}/{activity.total_assigned_students}</small>
                </div>
                <ProgressBar 
                  now={activity.total_assigned_students > 0 ? (activity.topics_submitted_count / activity.total_assigned_students) * 100 : 0} 
                  label={`${Math.round(activity.total_assigned_students > 0 ? (activity.topics_submitted_count / activity.total_assigned_students) * 100 : 0)}%`}
                  variant="info"
                  className="mb-3"
                />
              </Card.Body>
              <Card.Footer className="d-flex gap-2 flex-wrap">
                <Button variant="outline-primary" size="sm" onClick={() => handleViewDetails(activity)}>
                  View Details
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={() => handleEditClick(activity)}>
                  Edit
                </Button>
                {activity.status === 'draft' ? (
                  <Button variant="success" size="sm" onClick={() => handleStatusChange(activity.id, 'active')}>
                    Activate
                  </Button>
                ) : (
                  <Button variant="warning" size="sm" onClick={() => handleStatusChange(activity.id, 'draft')}>
                    Deactivate
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => handleDeleteActivity(activity.id)}>
                  Delete
                </Button>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>

      {/* View Details Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Activity Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedActivity && (
            <div>
              <h4>{selectedActivity.title}</h4>
              <div className="mb-2">{getStatusBadge(selectedActivity.status)}</div>
              <p>{selectedActivity.description}</p>
              <div><strong>Timeline:</strong> {new Date(selectedActivity.start_date).toLocaleDateString()} - {new Date(selectedActivity.end_date).toLocaleDateString()}</div>
              <div><strong>Topic Deadline:</strong> {new Date(selectedActivity.topic_submission_deadline).toLocaleDateString()}</div>
              <div><strong>Students:</strong> {selectedActivity.total_assigned_students}</div>
              <div><strong>Topics:</strong> {selectedActivity.topics_submitted_count}/{selectedActivity.total_assigned_students}</div>
              <div className="d-flex gap-2 mt-3">
                {selectedActivity.status === 'draft' ? (
                  <Button variant="success" size="sm" onClick={() => { handleStatusChange(selectedActivity.id, 'active'); setShowDetailModal(false); }}>
                    Activate
                  </Button>
                ) : (
                  <Button variant="warning" size="sm" onClick={() => { handleStatusChange(selectedActivity.id, 'draft'); setShowDetailModal(false); }}>
                    Deactivate
                  </Button>
                )}
                <Button variant="outline-secondary" size="sm" onClick={() => { setShowDetailModal(false); handleEditClick(selectedActivity); }}>
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Activity</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleActivitySubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" value={activityFormData.title} onChange={e => setActivityFormData({ ...activityFormData, title: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={activityFormData.description} onChange={e => setActivityFormData({ ...activityFormData, description: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="date" value={activityFormData.start_date} onChange={e => setActivityFormData({ ...activityFormData, start_date: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>End Date</Form.Label>
              <Form.Control type="date" value={activityFormData.end_date} onChange={e => setActivityFormData({ ...activityFormData, end_date: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Topic Submission Deadline</Form.Label>
              <Form.Control type="date" value={activityFormData.topic_submission_deadline} onChange={e => setActivityFormData({ ...activityFormData, topic_submission_deadline: e.target.value })} required />
            </Form.Group>

            {/* Review Scheduling Section */}
            <Card className="mb-3 border-info">
              <Card.Header className="bg-info text-white">
                <h6 className="mb-0">Schedule Reviews</h6>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-end">
                  <Col md={3}>
                    <Form.Group className="mb-2">
                      <Form.Label>Review <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={reviewFormData.review_number}
                        onChange={(e) => setReviewFormData({...reviewFormData, review_number: parseInt(e.target.value)})}
                        placeholder="1"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Review Title <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        value={reviewFormData.title}
                        onChange={(e) => setReviewFormData({...reviewFormData, title: e.target.value})}
                        placeholder="e.g., First Review, Mid-term Review"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Review Date<span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="date"
                        value={reviewFormData.review_date}
                        onChange={(e) => setReviewFormData({...reviewFormData, review_date: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={1}>
                    <Button 
                      variant="success" 
                      size="sm" 
                      className="w-100 mb-2" 
                      onClick={addReview}
                      disabled={!reviewFormData.title || !reviewFormData.review_date}
                    >
                      ➕
                    </Button>
                  </Col>
                </Row>
                
                {activityFormData.reviews && activityFormData.reviews.length > 0 && (
                  <div className="mt-3">
                    <h6>Scheduled Reviews:</h6>
                    {activityFormData.reviews.map((review, index) => (
                      <Badge key={index} bg="info" className="me-2 mb-2 p-2">
                        Review {review.review_number}: {review.title} - {new Date(review.review_date).toLocaleDateString()}
                        <Button
                          variant="link"
                          size="sm"
                          className="text-white p-0 ms-2"
                          onClick={() => removeReview(index)}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit">Update</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );

  const renderStudentView = () => (
    <div className="text-center py-5">
      <div className="mb-4">
        <i className="bi bi-shield-lock" style={{ fontSize: '4rem', color: '#6c757d' }}></i>
      </div>
      <h3 className="mb-3">Access Restricted</h3>
      <p className="text-muted mb-4">
        Project Management is only available for Coordinators and Administrators.
      </p>
      <p className="text-muted">
        Students can view their project activities and progress from the <strong>Home Dashboard</strong>.
      </p>
      <Button 
        variant="primary" 
        onClick={() => window.location.href = '/'}
        className="mt-3"
      >
        Go to Dashboard
      </Button>
    </div>
  );

  return (
    <Layout>
      <div className="p-2 p-md-4">
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        {userRole === 'coordinator' || userRole === 'admin' ? renderCoordinatorView() : renderStudentView()}

        {/* Create Activity Modal */}
        <Modal show={showActivityModal} onHide={() => setShowActivityModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Create New Project Activity</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleActivitySubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Activity Title</Form.Label>
                    <Form.Control
                      type="text"
                      value={activityFormData.title}
                      onChange={(e) => setActivityFormData({...activityFormData, title: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Activity Type</Form.Label>
                    <Form.Select
                      value={activityFormData.activity_type}
                      onChange={(e) => setActivityFormData({...activityFormData, activity_type: e.target.value})}
                    >
                      <option value="mini_project">Mini Project</option>
                      <option value="major_project">Major Project</option>
                      <option value="seminar">Seminar</option>
                      <option value="assignment">Assignment</option>
                      <option value="research">Research Project</option>
                      <option value="internship">Internship Project</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({...activityFormData, description: e.target.value})}
                  required
                />
              </Form.Group>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={activityFormData.start_date}
                      onChange={(e) => setActivityFormData({...activityFormData, start_date: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={activityFormData.end_date}
                      onChange={(e) => setActivityFormData({...activityFormData, end_date: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Topic Submission Deadline</Form.Label>
                    <Form.Control
                      type="date"
                      value={activityFormData.topic_submission_deadline}
                      onChange={(e) => setActivityFormData({...activityFormData, topic_submission_deadline: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Guidelines</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={activityFormData.guidelines}
                  onChange={(e) => setActivityFormData({...activityFormData, guidelines: e.target.value})}
                  placeholder="Provide guidelines for students (technologies to use, project scope, etc.)"
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Minimum Team Size</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={activityFormData.min_team_size}
                      onChange={(e) => setActivityFormData({...activityFormData, min_team_size: parseInt(e.target.value)})}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Maximum Team Size</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={activityFormData.max_team_size}
                      onChange={(e) => setActivityFormData({...activityFormData, max_team_size: parseInt(e.target.value)})}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Review Scheduling Section */}
              <Card className="mb-3 border-info">
                <Card.Header className="bg-info text-white">
                  <h6 className="mb-0">Schedule Reviews</h6>
                </Card.Header>
                <Card.Body>
                  <Row className="align-items-end">
                    <Col md={3}>
                      <Form.Group className="mb-2">
                        <Form.Label>Review <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          value={reviewFormData.review_number}
                          onChange={(e) => setReviewFormData({...reviewFormData, review_number: parseInt(e.target.value)})}
                          placeholder="1"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-2">
                        <Form.Label>Review Title <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          value={reviewFormData.title}
                          onChange={(e) => setReviewFormData({...reviewFormData, title: e.target.value})}
                          placeholder="e.g., First Review, Mid-term Review"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-2">
                        <Form.Label>Review Date<span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="date"
                          value={reviewFormData.review_date}
                          onChange={(e) => setReviewFormData({...reviewFormData, review_date: e.target.value})}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={1}>
                      <Button 
                        variant="success" 
                        size="sm" 
                        className="w-100 mb-2" 
                        onClick={addReview}
                        disabled={!reviewFormData.title || !reviewFormData.review_date}
                      >
                        ➕
                      </Button>
                    </Col>
                  </Row>
                  
                  {activityFormData.reviews && activityFormData.reviews.length > 0 && (
                    <div className="mt-3">
                      <h6>Scheduled Reviews:</h6>
                      {activityFormData.reviews.map((review, index) => (
                        <Badge key={index} bg="info" className="me-2 mb-2 p-2">
                          Review {review.review_number}: {review.title} - {new Date(review.review_date).toLocaleDateString()}
                          <Button
                            variant="link"
                            size="sm"
                            className="text-white p-0 ms-2"
                            onClick={() => removeReview(index)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowActivityModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Activity'}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>


      </div>
    </Layout>
  );
};

export default ProjectManagement;