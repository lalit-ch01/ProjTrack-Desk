import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Alert, Badge, Row, Col, Tabs, Tab } from 'react-bootstrap';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';
import moment from 'moment';

const StudentActivities = () => {
  const [activities, setActivities] = useState([]);
  const [myTopics, setMyTopics] = useState([]);
  const [upcomingReviews, setUpcomingReviews] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [isFinalReport, setIsFinalReport] = useState(false);

  const [submissionFormData, setSubmissionFormData] = useState({
    submission_text: '',
    submission_files: null
  });

  const [topicFormData, setTopicFormData] = useState({
    topic_title: '',
    topic_description: '',
    objectives: '',
    methodology: '',
    expected_outcomes: '',
    technologies: '',
    domain: ''
  });

  useEffect(() => {
    fetchActivities();
    fetchMyTopics();
    fetchUpcomingReviews();
    fetchMySubmissions();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/project-activities/?status=active');
      // Filter only visible activities
      const visibleActivities = response.data.filter(act => act.is_visible_to_students);
      setActivities(visibleActivities);
    } catch (error) {
      setError('Failed to fetch activities: ' + (error.response?.data?.detail || error.message));
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTopics = async () => {
    try {
      const response = await axiosInstance.get('/api/topic-submissions/');
      setMyTopics(response.data);
    } catch (error) {
      console.error('Failed to fetch my topics:', error);
    }
  };

  const fetchUpcomingReviews = async () => {
    try {
      const response = await axiosInstance.get('/api/project-reviews/');
      // Filter reviews that are upcoming (future dates)
      const upcoming = (response.data.results || response.data).filter(review => 
        moment(review.review_date).isAfter(moment())
      );
      setUpcomingReviews(upcoming);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchMySubmissions = async () => {
    try {
      const response = await axiosInstance.get('/api/event-submissions/my_submissions/');
      setMySubmissions(response.data);
    } catch (error) {
      console.error('Failed to fetch my submissions:', error);
    }
  };

  const getTopicForActivity = (activityId) => {
    return myTopics.find(topic => topic.activity === activityId);
  };

  const canSubmitTopic = (activityId) => {
    const existingTopic = getTopicForActivity(activityId);
    
    // Can submit if no topic exists OR if status is revision_required
    if (!existingTopic) return true;
    if (existingTopic.status === 'revision_required') return true;
    
    return false;
  };

  const handleOpenTopicModal = (activity) => {
    const existingTopic = getTopicForActivity(activity.id);
    
    setSelectedActivity(activity);
    
    if (existingTopic && existingTopic.status === 'revision_required') {
      // Pre-fill form with existing data for revision
      setTopicFormData({
        topic_title: existingTopic.topic_title,
        topic_description: existingTopic.topic_description,
        objectives: existingTopic.objectives,
        methodology: existingTopic.methodology || '',
        expected_outcomes: existingTopic.expected_outcomes || '',
        technologies: existingTopic.technologies,
        domain: existingTopic.domain
      });
    } else {
      // Reset form for new submission
      resetForm();
    }
    
    setShowTopicModal(true);
  };

  const handleTopicSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const existingTopic = getTopicForActivity(selectedActivity.id);
      
      const submitData = {
        ...topicFormData,
        activity: selectedActivity.id,
        status: 'submitted'
      };

      if (existingTopic && existingTopic.status === 'revision_required') {
        // Update existing topic
        await axiosInstance.put(`/api/topic-submissions/${existingTopic.id}/`, submitData);
        setSuccess('Topic resubmitted successfully! Your guide will review it.');
      } else {
        // Create new topic submission
        await axiosInstance.post('/api/topic-submissions/', submitData);
        setSuccess('Topic submitted successfully! Your guide will review it.');
      }
      
      setShowTopicModal(false);
      fetchMyTopics();
      resetForm();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 
                      error.response?.data?.error ||
                      JSON.stringify(error.response?.data) ||
                      'Failed to submit topic';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTopicFormData({
      topic_title: '',
      topic_description: '',
      objectives: '',
      methodology: '',
      expected_outcomes: '',
      technologies: '',
      domain: ''
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'draft': { bg: 'secondary', text: 'Draft' },
      'submitted': { bg: 'info', text: 'Submitted' },
      'under_review': { bg: 'warning', text: 'Under Review' },
      'approved': { bg: 'success', text: '✓ Approved' },
      'rejected': { bg: 'danger', text: '✗ Rejected' },
      'revision_required': { bg: 'warning', text: '⚠ Revision Required' }
    };
    const config = statusMap[status] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
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

  return (
    <Layout>
      <div className="container-fluid px-4 py-3">
        <h2 className="mb-4">📚 My Project Activities</h2>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        <Tabs defaultActiveKey="available" className="mb-4">
          {/* Available Activities Tab */}
          <Tab eventKey="available" title={`Available Activities (${activities.length})`}>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : activities.length === 0 ? (
              <Alert variant="info">
                <h5>No Active Activities</h5>
                <p>There are no active project activities available at the moment. Please check back later.</p>
              </Alert>
            ) : (
              <Row>
                {activities.map(activity => {
                  const existingTopic = getTopicForActivity(activity.id);
                  const canSubmit = canSubmitTopic(activity.id);
                  // Set deadline to end of day (23:59:59) to allow submissions throughout the deadline day
                  const deadlinePassed = moment(activity.topic_submission_deadline).endOf('day').isBefore(moment());
                  
                  return (
                    <Col md={6} lg={4} key={activity.id} className="mb-4">
                      <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-primary text-white">
                          <h5 className="mb-0">
                            {getActivityTypeIcon(activity.activity_type)} {activity.title}
                          </h5>
                          <small>{activity.activity_type.replace('_', ' ').toUpperCase()}</small>
                        </Card.Header>
                        <Card.Body>
                          <p className="text-muted small mb-2">{activity.description}</p>
                          
                          <div className="mb-2">
                            <strong>📅 Duration:</strong><br />
                            <small>
                              {moment(activity.start_date).format('MMM D, YYYY')} - {moment(activity.end_date).format('MMM D, YYYY')}
                            </small>
                          </div>
                          
                          <div className="mb-2">
                            <strong>⏰ Topic Deadline:</strong><br />
                            <small className={deadlinePassed ? 'text-danger' : 'text-success'}>
                              {moment(activity.topic_submission_deadline).format('MMM D, YYYY')}
                              {deadlinePassed && ' (Passed)'}
                            </small>
                          </div>
                          
                          {activity.guidelines && (
                            <div className="mb-2">
                              <strong>📌 Guidelines:</strong><br />
                              <small className="text-muted">{activity.guidelines.substring(0, 100)}...</small>
                            </div>
                          )}
                          
                          {existingTopic && (
                            <div className="mt-3 p-2 bg-light rounded">
                              <strong>Your Submission:</strong><br />
                              <div className="d-flex justify-content-between align-items-center mt-1">
                                <span className="small text-truncate me-2">{existingTopic.topic_title}</span>
                                {getStatusBadge(existingTopic.status)}
                              </div>
                              {existingTopic.review_comments && (
                                <div className="mt-2 small text-danger">
                                  <strong>Feedback:</strong> {existingTopic.review_comments}
                                </div>
                              )}
                            </div>
                          )}
                        </Card.Body>
                        <Card.Footer>
                          {canSubmit && !deadlinePassed ? (
                            <Button 
                              variant={existingTopic ? 'warning' : 'primary'} 
                              size="sm" 
                              className="w-100"
                              onClick={() => handleOpenTopicModal(activity)}
                            >
                              {existingTopic ? '🔄 Resubmit Topic' : '➕ Submit Topic'}
                            </Button>
                          ) : deadlinePassed ? (
                            <Alert variant="danger" className="mb-0 py-2 small">
                              Submission deadline has passed
                            </Alert>
                          ) : (
                            <Alert variant="info" className="mb-0 py-2 small">
                              {existingTopic?.status === 'submitted' && 'Waiting for guide review'}
                              {existingTopic?.status === 'under_review' && 'Guide is reviewing your topic'}
                              {existingTopic?.status === 'approved' && '✓ Topic approved! Proceed with project'}
                              {existingTopic?.status === 'rejected' && 'Topic rejected. Contact your guide'}
                            </Alert>
                          )}
                        </Card.Footer>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Tab>

          {/* Upcoming Reviews & Final Submissions Tab */}
          <Tab eventKey="reviews" title={`Reviews & Final Report (${upcomingReviews.length + activities.length})`}>
            {upcomingReviews.length === 0 && activities.length === 0 ? (
              <Alert variant="info">
                <h5>No Upcoming Reviews</h5>
                <p>There are no scheduled reviews at the moment. Reviews will appear here once your coordinator schedules them.</p>
              </Alert>
            ) : (
              <Row>
                {/* Regular Reviews */}
                {upcomingReviews.map(review => {
                  const mySubmission = mySubmissions.find(sub => sub.event === review.calendar_event);
                  const canSubmit = !mySubmission || mySubmission.status === 'revision_required';
                  
                  return (
                    <Col md={6} lg={4} key={`review-${review.id}`} className="mb-4">
                      <Card className="h-100 shadow-sm">
                        <Card.Header className="bg-info text-white">
                          <h5 className="mb-0">📋 {review.title}</h5>
                          <small>Review #{review.review_number}</small>
                        </Card.Header>
                        <Card.Body>
                          <p className="text-muted small mb-2">{review.description}</p>
                          
                          <div className="mb-2">
                            <strong>📚 Activity:</strong><br />
                            <small>{review.activity_title}</small>
                          </div>
                          
                          <div className="mb-2">
                            <strong>📅 Review Date:</strong><br />
                            <small className={moment(review.review_date).isBefore(moment().add(3, 'days')) ? 'text-danger fw-bold' : 'text-success'}>
                              {moment(review.review_date).format('MMM D, YYYY h:mm A')}
                              {moment(review.review_date).isBefore(moment().add(3, 'days')) && ' (Soon!)'}
                            </small>
                          </div>

                          {mySubmission && (
                            <div className="mt-3 p-2 bg-light rounded">
                              <strong>Your Submission:</strong><br />
                              <div className="d-flex justify-content-between align-items-center mt-1">
                                <span className="small">Status:</span>
                                {getStatusBadge(mySubmission.status)}
                              </div>
                              {mySubmission.feedback && (
                                <div className="mt-2 small text-info">
                                  <strong>Feedback:</strong> {mySubmission.feedback}
                                </div>
                              )}
                            </div>
                          )}
                        </Card.Body>
                        <Card.Footer>
                          {canSubmit ? (
                            <Button 
                              variant={mySubmission ? 'warning' : 'primary'} 
                              size="sm" 
                              className="w-100"
                              onClick={() => {
                                setSelectedReview(review);
                                setSelectedActivity(null);
                                setIsFinalReport(false);
                                setShowSubmissionModal(true);
                              }}
                            >
                              {mySubmission ? '🔄 Resubmit Work' : '📤 Submit Work'}
                            </Button>
                          ) : (
                            <Alert variant="success" className="mb-0 py-2 small">
                              ✓ Submission completed - waiting for evaluation
                            </Alert>
                          )}
                        </Card.Footer>
                      </Card>
                    </Col>
                  );
                })}

                {/* Final Report Cards */}
                {activities.map(activity => {
                  // Only show final report card if student has an approved topic for this activity
                  const approvedTopic = myTopics.find(
                    topic => topic.activity === activity.id && topic.status === 'approved'
                  );
                  
                  if (!approvedTopic) return null;

                  // Check if there's already a final report submission for this activity
                  const finalSubmission = mySubmissions.find(
                    sub => sub.activity === activity.id && !sub.event
                  );
                  
                  const canSubmit = !finalSubmission || finalSubmission.status === 'revision_required';
                  const isPastDueDate = moment().isAfter(moment(activity.end_date).endOf('day'));

                  return (
                    <Col md={6} lg={4} key={`final-${activity.id}`} className="mb-4">
                      <Card className="h-100 shadow-sm border-success">
                        <Card.Header className="bg-success text-white">
                          <h5 className="mb-0">🎯 Final Report</h5>
                          <small>{activity.title}</small>
                        </Card.Header>
                        <Card.Body>
                          <p className="mb-2">
                            <strong>Due Date:</strong><br />
                            {moment(activity.end_date).format('MMMM D, YYYY')}
                          </p>
                          <p className="mb-2">
                            <strong>Status:</strong><br />
                            {isPastDueDate ? (
                              <Badge bg="danger">Overdue</Badge>
                            ) : (
                              <Badge bg="warning">Due {moment(activity.end_date).fromNow()}</Badge>
                            )}
                          </p>
                          {finalSubmission && (
                            <>
                              <hr />
                              <p className="mb-2">
                                <strong>Submitted:</strong><br />
                                <small>{moment(finalSubmission.submitted_at).format('MMM D, h:mm A')}</small>
                              </p>
                              {finalSubmission.status === 'pending' && (
                                <Badge bg="warning">Under Review</Badge>
                              )}
                              {finalSubmission.status === 'approved' && (
                                <>
                                  <Badge bg="success">Approved</Badge>
                                  {finalSubmission.grade && (
                                    <div className="mt-2">
                                      <strong>Grade: {finalSubmission.grade}</strong><br />
                                      {finalSubmission.score && <small>Score: {finalSubmission.score}/100</small>}
                                    </div>
                                  )}
                                </>
                              )}
                              {finalSubmission.status === 'revision_required' && (
                                <>
                                  <Badge bg="warning">Revision Required</Badge>
                                  {finalSubmission.feedback && (
                                    <Alert variant="warning" className="mt-2 small">
                                      <strong>Feedback:</strong> {finalSubmission.feedback}
                                    </Alert>
                                  )}
                                </>
                              )}
                              {finalSubmission.status === 'rejected' && (
                                <>
                                  <Badge bg="danger">Rejected</Badge>
                                  {finalSubmission.feedback && (
                                    <Alert variant="danger" className="mt-2 small">
                                      <strong>Feedback:</strong> {finalSubmission.feedback}
                                    </Alert>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </Card.Body>
                        <Card.Footer className="bg-light">
                          {canSubmit ? (
                            <Button
                              variant={finalSubmission?.status === 'revision_required' ? 'warning' : 'primary'}
                              size="sm"
                              className="w-100"
                              onClick={() => {
                                setSelectedActivity(activity);
                                setSelectedReview(null);
                                setIsFinalReport(true);
                                setShowSubmissionModal(true);
                              }}
                            >
                              {finalSubmission?.status === 'revision_required' ? 'Resubmit Final Report' : 'Submit Final Report'}
                            </Button>
                          ) : (
                            <Alert variant="success" className="mb-0 py-2 small">
                              ✓ Final report submitted - waiting for evaluation
                            </Alert>
                          )}
                        </Card.Footer>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Tab>

          {/* My Topic Submissions Tab */}
          <Tab eventKey="submissions" title={`My Topic Submissions (${myTopics.length})`}>
            {myTopics.length === 0 ? (
              <Alert variant="info">
                <h5>No Topic Submissions Yet</h5>
                <p>You haven't submitted any project topics yet. Check the "Available Activities" tab to submit your first topic!</p>
              </Alert>
            ) : (
              <Row>
                {myTopics.map(topic => (
                  <Col md={12} key={topic.id} className="mb-3">
                    <Card>
                      <Card.Header>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0">{topic.topic_title}</h5>
                          {getStatusBadge(topic.status)}
                        </div>
                        <small className="text-muted">Activity: {topic.activity_title}</small>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={8}>
                            <p><strong>Description:</strong> {topic.topic_description}</p>
                            <p><strong>Objectives:</strong> {topic.objectives}</p>
                            {topic.methodology && <p><strong>Methodology:</strong> {topic.methodology}</p>}
                            {topic.expected_outcomes && <p><strong>Expected Outcomes:</strong> {topic.expected_outcomes}</p>}
                            <p><strong>Technologies:</strong> {topic.technologies}</p>
                            <p><strong>Domain:</strong> {topic.domain}</p>
                          </Col>
                          <Col md={4}>
                            <div className="bg-light p-3 rounded">
                              <p className="mb-2"><strong>Guide:</strong> {topic.guide_name}</p>
                              <p className="mb-2"><strong>Submitted:</strong><br />
                                <small>{moment(topic.submitted_at).format('MMM D, YYYY h:mm A')}</small>
                              </p>
                              {topic.reviewed_at && (
                                <p className="mb-2"><strong>Reviewed:</strong><br />
                                  <small>{moment(topic.reviewed_at).format('MMM D, YYYY h:mm A')}</small>
                                </p>
                              )}
                              {topic.review_comments && (
                                <Alert variant={topic.status === 'approved' ? 'success' : 'warning'} className="mt-2 small">
                                  <strong>Feedback:</strong><br />
                                  {topic.review_comments}
                                </Alert>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Tab>
        </Tabs>

        {/* Review/Final Report Submission Modal */}
        <Modal show={showSubmissionModal} onHide={() => setShowSubmissionModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {isFinalReport 
                ? `🎯 Submit Final Report for ${selectedActivity?.title}` 
                : `📤 Submit Work for ${selectedReview?.title}`
              }
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {isFinalReport ? (
              <Alert variant="success" className="mb-3">
                <strong>Activity:</strong> {selectedActivity?.title}<br />
                <strong>Due Date:</strong> {moment(selectedActivity?.end_date).format('MMM D, YYYY')}<br />
                <strong>Type:</strong> Final Report Submission
              </Alert>
            ) : selectedReview && (
              <Alert variant="info" className="mb-3">
                <strong>Review:</strong> {selectedReview.title} (#{selectedReview.review_number})<br />
                <strong>Activity:</strong> {selectedReview.activity_title}<br />
                <strong>Review Date:</strong> {moment(selectedReview.review_date).format('MMM D, YYYY h:mm A')}
              </Alert>
            )}

            <Form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError('');
              
              try {
                // Determine which activity we're submitting for
                const activityId = isFinalReport ? selectedActivity.id : selectedReview.activity;

                // Validate that review has calendar_event (not needed for final reports)
                if (!isFinalReport && !selectedReview.calendar_event) {
                  setError('This review does not have a calendar event associated. Please contact your coordinator.');
                  setLoading(false);
                  return;
                }

                // Find the approved topic for this activity to link the submission
                const approvedTopic = myTopics.find(
                  t => t.activity === activityId && t.status === 'approved'
                );

                const formData = new FormData();
                
                // For reviews, add event field; for final reports, add activity field
                if (isFinalReport) {
                  formData.append('activity', selectedActivity.id);
                } else {
                  formData.append('event', selectedReview.calendar_event);
                }
                
                formData.append('submission_text', submissionFormData.submission_text);
                formData.append('status', 'submitted');
                
                // Link to approved topic if exists
                if (approvedTopic) {
                  formData.append('topic_submission', approvedTopic.id);
                }
                
                if (submissionFormData.submission_files) {
                  formData.append('submission_files', submissionFormData.submission_files);
                }

                const response = await axiosInstance.post('/api/event-submissions/', formData, {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                });

                setSuccess('Work submitted successfully! Your guide will evaluate it soon.');
                setShowSubmissionModal(false);
                setSubmissionFormData({ submission_text: '', submission_files: null });
                fetchMySubmissions();
              } catch (error) {
                console.error('Submission error:', error.response?.data);
                const errorMsg = error.response?.data?.detail || 
                               error.response?.data?.error ||
                               (error.response?.data?.event && `Event error: ${JSON.stringify(error.response.data.event)}`) ||
                               JSON.stringify(error.response?.data) ||
                               'Failed to submit work. Please try again.';
                setError(errorMsg);
              } finally {
                setLoading(false);
              }
            }}>
              <Form.Group className="mb-3">
                <Form.Label>Submission Description <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={submissionFormData.submission_text}
                  onChange={(e) => setSubmissionFormData({...submissionFormData, submission_text: e.target.value})}
                  placeholder="Describe what you've completed for this review..."
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Upload Files <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setSubmissionFormData({...submissionFormData, submission_files: e.target.files[0]})}
                  accept=".pdf,.doc,.docx,.zip,.rar,.ppt,.pptx,.jpg,.png"
                  required
                />
                <Form.Text className="text-muted">
                  Upload your project files (PDF, Word, ZIP, RAR, PowerPoint, Images)
                </Form.Text>
              </Form.Group>

              <Alert variant="info" className="small">
                <strong>Tip:</strong> Include screenshots, documentation, source code (in ZIP), or presentation slides.
              </Alert>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowSubmissionModal(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Work'}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Topic Submission Modal */}
        <Modal show={showTopicModal} onHide={() => setShowTopicModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {getTopicForActivity(selectedActivity?.id)?.status === 'revision_required' 
                ? '🔄 Resubmit Topic Proposal' 
                : '➕ Submit Topic Proposal'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedActivity && (
              <Alert variant="info" className="mb-3">
                <strong>Activity:</strong> {selectedActivity.title}<br />
                <strong>Deadline:</strong> {moment(selectedActivity.topic_submission_deadline).format('MMM D, YYYY h:mm A')}
              </Alert>
            )}

            <Form onSubmit={handleTopicSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Topic Title <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  value={topicFormData.topic_title}
                  onChange={(e) => setTopicFormData({...topicFormData, topic_title: e.target.value})}
                  placeholder="Enter your project topic title"
                  required
                  maxLength={300}
                />
                <Form.Text className="text-muted">
                  A clear, concise title for your project
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Topic Description <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={topicFormData.topic_description}
                  onChange={(e) => setTopicFormData({...topicFormData, topic_description: e.target.value})}
                  placeholder="Describe your project in detail..."
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Objectives <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={topicFormData.objectives}
                  onChange={(e) => setTopicFormData({...topicFormData, objectives: e.target.value})}
                  placeholder="What are the main objectives of this project?"
                  required
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Technologies <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={topicFormData.technologies}
                      onChange={(e) => setTopicFormData({...topicFormData, technologies: e.target.value})}
                      placeholder="e.g., React, Node.js, MongoDB"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Domain <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      value={topicFormData.domain}
                      onChange={(e) => setTopicFormData({...topicFormData, domain: e.target.value})}
                      placeholder="e.g., Web Development, AI/ML, Mobile App"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Methodology (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={topicFormData.methodology}
                  onChange={(e) => setTopicFormData({...topicFormData, methodology: e.target.value})}
                  placeholder="Explain your approach and methodology..."
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Expected Outcomes (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={topicFormData.expected_outcomes}
                  onChange={(e) => setTopicFormData({...topicFormData, expected_outcomes: e.target.value})}
                  placeholder="What outcomes do you expect from this project?"
                />
              </Form.Group>

              <Alert variant="info" className="small mb-3">
                <strong>📌 Note:</strong> Your topic will be automatically submitted to your assigned guide for review.
              </Alert>

              <Alert variant="warning" className="small">
                <strong>Note:</strong> No file upload is required at this stage. You'll submit project files during review phases.
              </Alert>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setShowTopicModal(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Topic'}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    </Layout>
  );
};

export default StudentActivities;
