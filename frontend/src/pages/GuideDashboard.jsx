import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Alert, Badge, Card, Row, Col, Tab, Tabs } from 'react-bootstrap';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';
import moment from 'moment';

const GuideDashboard = () => {
  // Topic Review State
  const [pendingTopics, setPendingTopics] = useState([]);
  const [approvedTopics, setApprovedTopics] = useState([]);
  const [rejectedTopics, setRejectedTopics] = useState([]);
  const [revisionTopics, setRevisionTopics] = useState([]);
  
  // Review Evaluation State
  const [pendingEvaluations, setPendingEvaluations] = useState([]);
  const [evaluatedSubmissions, setEvaluatedSubmissions] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Topic Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // approve, reject, revision
  const [reviewComments, setReviewComments] = useState('');

  // Evaluation Modal
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [evaluationData, setEvaluationData] = useState({
    status: 'approved',
    grade: '',
    score: '',
    feedback: ''
  });

  useEffect(() => {
    fetchAllTopics();
    fetchReviewSubmissions();
  }, []);

  const fetchAllTopics = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all topics for this guide
      const response = await axiosInstance.get('/api/topic-submissions/my_students_topics/');
      const allTopics = response.data;
      
      // Categorize by status
      setPendingTopics(allTopics.filter(t => t.status === 'submitted'));
      setApprovedTopics(allTopics.filter(t => t.status === 'approved'));
      setRejectedTopics(allTopics.filter(t => t.status === 'rejected'));
      setRevisionTopics(allTopics.filter(t => t.status === 'revision_required'));
      
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      setError(error.response?.data?.detail || 'Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewSubmissions = async () => {
    try {
      // Fetch all submissions for this guide's students
      const response = await axiosInstance.get('/api/event-submissions/');
      const allSubmissions = response.data;
      
      // Categorize by status
      setPendingEvaluations(allSubmissions.filter(s => s.status === 'submitted'));
      setEvaluatedSubmissions(allSubmissions.filter(s => 
        ['approved', 'revision_required'].includes(s.status)
      ));
      
    } catch (error) {
      console.error('Failed to fetch review submissions:', error);
    }
  };

  const handleOpenReview = (topic, action) => {
    setSelectedTopic(topic);
    setReviewAction(action);
    setReviewComments('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedTopic) return;
    
    // Validate comments for revision
    if (reviewAction === 'revision' && !reviewComments.trim()) {
      setError('Comments are required for revision request');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let response;
      const actionData = {
        comments: reviewComments
      };

      if (reviewAction === 'approve') {
        response = await axiosInstance.post(
          `/api/topic-submissions/${selectedTopic.id}/approve_topic/`,
          actionData
        );
        setSuccess('Topic approved successfully!');
      } else if (reviewAction === 'revision') {
        response = await axiosInstance.post(
          `/api/topic-submissions/${selectedTopic.id}/request_revision/`,
          actionData
        );
        setSuccess('Revision requested successfully!');
      }

      setShowReviewModal(false);
      setSelectedTopic(null);
      setReviewComments('');
      fetchAllTopics(); // Refresh all topics
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.detail || `Failed to ${reviewAction} topic`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEvaluation = (submission) => {
    setSelectedSubmission(submission);
    setEvaluationData({
      status: 'approved',
      grade: submission.grade || '',
      score: submission.score || '',
      feedback: submission.feedback || ''
    });
    setShowEvaluationModal(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedSubmission) return;
    
    // Validate feedback for revision
    if (evaluationData.status === 'revision_required' && !evaluationData.feedback.trim()) {
      setError('Feedback is required for revision request');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axiosInstance.post(
        `/api/event-submissions/${selectedSubmission.id}/evaluate/`,
        evaluationData
      );
      
      setSuccess(`Submission ${evaluationData.status} successfully!`);
      setShowEvaluationModal(false);
      setSelectedSubmission(null);
      setEvaluationData({ status: 'approved', grade: '', score: '', feedback: '' });
      fetchReviewSubmissions(); // Refresh submissions
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.detail || 'Failed to evaluate submission');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'submitted': 'warning',
      'under_review': 'info',
      'approved': 'success',
      'rejected': 'danger',
      'revision_required': 'warning',
      'draft': 'secondary'
    };
    return <Badge bg={statusMap[status] || 'secondary'}>{status.replace('_', ' ').toUpperCase()}</Badge>;
  };

  const renderTopicTable = (topics, showActions = true) => {
    if (topics.length === 0) {
      return (
        <Alert variant="info">
          No topics found in this category.
        </Alert>
      );
    }

    return (
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Student</th>
              <th>Activity</th>
              <th>Topic Title</th>
              <th>Domain</th>
              <th>Technologies</th>
              <th>Submitted</th>
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id}>
                <td>
                  <strong>{topic.submitted_by_name}</strong>
                </td>
                <td>
                  <small className="text-muted">{topic.activity_title}</small>
                </td>
                <td>
                  <strong>{topic.topic_title}</strong>
                  <br />
                  <small className="text-muted">{topic.topic_description?.substring(0, 60)}...</small>
                </td>
                <td>
                  <Badge bg="secondary">{topic.domain}</Badge>
                </td>
                <td>
                  <small>{topic.technologies}</small>
                </td>
                <td>
                  <small>{moment(topic.submitted_at).format('MMM D, YYYY')}</small>
                  <br />
                  <small className="text-muted">{moment(topic.submitted_at).fromNow()}</small>
                </td>
                {showActions && (
                  <td>
                    <div className="d-flex flex-column gap-1">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => handleOpenReview(topic, 'approve')}
                        disabled={loading}
                      >
                        ✓ Approve
                      </Button>
                      <Button 
                        variant="warning" 
                        size="sm"
                        onClick={() => handleOpenReview(topic, 'revision')}
                        disabled={loading}
                      >
                        ↻ Request Revision
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const renderPendingTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Pending Topic Approvals</h4>
        <Badge bg="warning" className="fs-5 px-3 py-2">
          {pendingTopics.length} Pending
        </Badge>
      </div>
      {renderTopicTable(pendingTopics, true)}
    </div>
  );

  const renderApprovedTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Approved Topics</h4>
        <Badge bg="success" className="fs-5 px-3 py-2">
          {approvedTopics.length} Approved
        </Badge>
      </div>
      {renderTopicTable(approvedTopics, false)}
    </div>
  );

  const renderRejectedTab = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Revision Required</h4>
        <div>
          <Badge bg="warning" className="fs-6 px-2 py-1">
            {revisionTopics.length} Revision Pending
          </Badge>
        </div>
      </div>
      
      {revisionTopics.length > 0 ? (
        renderTopicTable(revisionTopics, false)
      ) : (
        <Alert variant="info">No revision-required topics.</Alert>
      )}
    </div>
  );

  const renderEvaluationsTab = () => (
    <div>
      <Tabs defaultActiveKey="pending_eval" className="mb-3">
        <Tab eventKey="pending_eval" title={`Pending (${pendingEvaluations.length})`}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Pending Evaluations</h5>
            <Badge bg="warning" className="fs-6 px-3 py-2">
              {pendingEvaluations.length} Need Evaluation
            </Badge>
          </div>
          {renderSubmissionsTable(pendingEvaluations, true)}
        </Tab>
        
        <Tab eventKey="evaluated" title={`Evaluated (${evaluatedSubmissions.length})`}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Evaluated Submissions</h5>
          </div>
          {renderSubmissionsTable(evaluatedSubmissions, false)}
        </Tab>
      </Tabs>
    </div>
  );

  const renderSubmissionsTable = (submissions, showActions) => {
    if (submissions.length === 0) {
      return (
        <Alert variant="info">
          {showActions ? 'No pending evaluations.' : 'No evaluated submissions yet.'}
        </Alert>
      );
    }

    return (
      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Student</th>
              <th>Event/Review</th>
              <th>Topic</th>
              <th>Submitted</th>
              <th>Status</th>
              {!showActions && <th>Grade</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td>
                  <strong>{submission.student_name}</strong>
                </td>
                <td>
                  {submission.event_title ? (
                    <>
                      <small className="text-muted">{submission.event_title}</small>
                    </>
                  ) : submission.activity_title ? (
                    <>
                      <Badge bg="success">Final Report</Badge>
                      <br />
                      <small className="text-muted">{submission.activity_title}</small>
                    </>
                  ) : (
                    <small className="text-muted">N/A</small>
                  )}
                </td>
                <td>
                  <small>{submission.topic_title || 'N/A'}</small>
                </td>
                <td>
                  <small>{moment(submission.submitted_at).format('MMM D, YYYY')}</small>
                  <br />
                  <small className="text-muted">{moment(submission.submitted_at).fromNow()}</small>
                </td>
                <td>
                  {getStatusBadge(submission.status)}
                </td>
                {!showActions && (
                  <td>
                    {submission.grade ? (
                      <>
                        <Badge bg="success">{submission.grade}</Badge>
                        {submission.score && <div className="small">{submission.score}/100</div>}
                      </>
                    ) : (
                      <small className="text-muted">-</small>
                    )}
                  </td>
                )}
                <td>
                  <div className="d-flex flex-column gap-1">
                    <Button 
                      variant="outline-info" 
                      size="sm"
                      onClick={() => handleOpenEvaluation(submission)}
                    >
                      {showActions ? '✏️ Evaluate' : '👁️ View'}
                    </Button>
                    {submission.submission_file_url && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        href={submission.submission_file_url}
                        target="_blank"
                      >
                        📎 Download
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-2 p-md-4">
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">🎓 Guide Dashboard</h2>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={fetchAllTopics}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </Button>
        </div>

        {/* Summary Cards */}
        <Row className="mb-4">
          <Col md={6} lg={3}>
            <Card className="text-center border-warning shadow-sm mb-3">
              <Card.Body>
                <h2 className="text-warning mb-2">{pendingTopics.length}</h2>
                <small className="text-muted">Topic Approvals Pending</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="text-center border-success shadow-sm mb-3">
              <Card.Body>
                <h2 className="text-success mb-2">{approvedTopics.length}</h2>
                <small className="text-muted">Topics Approved</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="text-center border-primary shadow-sm mb-3">
              <Card.Body>
                <h2 className="text-primary mb-2">{pendingEvaluations.length}</h2>
                <small className="text-muted">Reviews to Evaluate</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="text-center border-info shadow-sm mb-3">
              <Card.Body>
                <h2 className="text-info mb-2">{evaluatedSubmissions.length}</h2>
                <small className="text-muted">Reviews Evaluated</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Tabs */}
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
          <Tab 
            eventKey="pending" 
            title={
              <span>
                ⏳ Pending {pendingTopics.length > 0 && <Badge bg="warning" className="ms-2">{pendingTopics.length}</Badge>}
              </span>
            }
          >
            {renderPendingTab()}
          </Tab>
          <Tab 
            eventKey="approved" 
            title={
              <span>
                ✓ Approved {approvedTopics.length > 0 && <Badge bg="success" className="ms-2">{approvedTopics.length}</Badge>}
              </span>
            }
          >
            {renderApprovedTab()}
          </Tab>
          <Tab 
            eventKey="revision" 
            title={
              <span>
                ↻ Revision Required {revisionTopics.length > 0 && <Badge bg="warning" className="ms-2">{revisionTopics.length}</Badge>}
              </span>
            }
          >
            {renderRejectedTab()}
          </Tab>
          <Tab 
            eventKey="evaluations" 
            title={
              <span>
                📝 Review Evaluations {pendingEvaluations.length > 0 && <Badge bg="primary" className="ms-2">{pendingEvaluations.length}</Badge>}
              </span>
            }
          >
            {renderEvaluationsTab()}
          </Tab>
        </Tabs>

        {/* Topic Review Modal */}
        <Modal show={showReviewModal} onHide={() => setShowReviewModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              {reviewAction === 'approve' && '✓ Approve Topic'}
              {reviewAction === 'reject' && '✗ Reject Topic'}
              {reviewAction === 'revision' && '↻ Request Revision'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedTopic && (
              <>
                <Card className="mb-3 border-info">
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p className="mb-2"><strong>Student:</strong> {selectedTopic.submitted_by_name}</p>
                        <p className="mb-2"><strong>Activity:</strong> {selectedTopic.activity_title}</p>
                      </Col>
                      <Col md={6}>
                        <p className="mb-2"><strong>Domain:</strong> <Badge bg="secondary">{selectedTopic.domain}</Badge></p>
                        <p className="mb-2"><strong>Submitted:</strong> {moment(selectedTopic.submitted_at).format('MMM D, YYYY')}</p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="mb-3">
                  <Card.Header className="bg-light">
                    <strong>Topic Details</strong>
                  </Card.Header>
                  <Card.Body>
                    <h5 className="text-primary">{selectedTopic.topic_title}</h5>
                    <p className="mt-3"><strong>Description:</strong><br/>{selectedTopic.topic_description}</p>
                    <p><strong>Objectives:</strong><br/>{selectedTopic.objectives}</p>
                    {selectedTopic.methodology && <p><strong>Methodology:</strong><br/>{selectedTopic.methodology}</p>}
                    {selectedTopic.expected_outcomes && <p><strong>Expected Outcomes:</strong><br/>{selectedTopic.expected_outcomes}</p>}
                    <p><strong>Technologies:</strong> {selectedTopic.technologies}</p>
                  </Card.Body>
                </Card>
                
                <Form>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      {reviewAction === 'approve' && 'Approval Comments (Optional)'}
                      {reviewAction === 'reject' && 'Rejection Reason (Required)'}
                      {reviewAction === 'revision' && 'Revision Comments (Required)'}
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      placeholder={
                        reviewAction === 'approve' ? 'Optional: Provide encouraging feedback or suggestions' :
                        'Required: Specify what needs to be revised'
                      }
                      required={reviewAction !== 'approve'}
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowReviewModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant={
                        reviewAction === 'approve' ? 'success' : 'warning'
                      }
                      onClick={handleSubmitReview}
                      disabled={loading || (reviewAction === 'revision' && !reviewComments.trim())}
                    >
                      {loading ? 'Processing...' : 
                        reviewAction === 'approve' ? 'Approve Topic' : 'Request Revision'
                      }
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Modal.Body>
        </Modal>

        {/* Evaluation Modal */}
        <Modal show={showEvaluationModal} onHide={() => setShowEvaluationModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>📝 Evaluate Submission</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedSubmission && (
              <>
                <Card className="mb-3 border-info">
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p className="mb-2"><strong>Student:</strong> {selectedSubmission.student_name}</p>
                        <p className="mb-2">
                          <strong>{selectedSubmission.event_title ? 'Event:' : 'Type:'}</strong>{' '}
                          {selectedSubmission.event_title || <Badge bg="success">Final Report</Badge>}
                        </p>
                        {selectedSubmission.activity_title && (
                          <p className="mb-2"><strong>Activity:</strong> {selectedSubmission.activity_title}</p>
                        )}
                      </Col>
                      <Col md={6}>
                        <p className="mb-2"><strong>Topic:</strong> {selectedSubmission.topic_title || 'N/A'}</p>
                        <p className="mb-2"><strong>Submitted:</strong> {moment(selectedSubmission.submitted_at).format('MMM D, YYYY h:mm A')}</p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <Card className="mb-3">
                  <Card.Header className="bg-light">
                    <strong>Submission Details</strong>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Description:</strong></p>
                    <p className="bg-light p-2 rounded">{selectedSubmission.submission_text || 'No description provided'}</p>
                    
                    {selectedSubmission.submission_file_url && (
                      <div className="mt-2">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          href={selectedSubmission.submission_file_url}
                          target="_blank"
                        >
                          📎 Download Submission File
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>

                <Form>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Grade</Form.Label>
                        <Form.Select
                          value={evaluationData.grade}
                          onChange={(e) => setEvaluationData({...evaluationData, grade: e.target.value})}
                        >
                          <option value="">Select Grade</option>
                          <option value="A+">A+ (Outstanding)</option>
                          <option value="A">A (Excellent)</option>
                          <option value="B+">B+ (Very Good)</option>
                          <option value="B">B (Good)</option>
                          <option value="C+">C+ (Above Average)</option>
                          <option value="C">C (Average)</option>
                          <option value="D">D (Below Average)</option>
                          <option value="F">F (Fail)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Score (out of 100)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          max="100"
                          value={evaluationData.score}
                          onChange={(e) => setEvaluationData({...evaluationData, score: e.target.value})}
                          placeholder="Enter score"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={evaluationData.status}
                      onChange={(e) => setEvaluationData({...evaluationData, status: e.target.value})}
                    >
                      <option value="approved">✓ Approved</option>
                      <option value="revision_required">↻ Revision Required</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      Feedback 
                      {evaluationData.status === 'revision_required' && 
                        <span className="text-danger"> *</span>
                      }
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={evaluationData.feedback}
                      onChange={(e) => setEvaluationData({...evaluationData, feedback: e.target.value})}
                      placeholder={
                        evaluationData.status === 'approved' ? 'Optional: Provide positive feedback and suggestions' :
                        evaluationData.status === 'rejected' ? 'Required: Explain why this submission is rejected' :
                        'Required: Specify what needs to be improved'
                      }
                      required={evaluationData.status !== 'approved'}
                    />
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" onClick={() => setShowEvaluationModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant={
                        evaluationData.status === 'approved' ? 'success' :
                        evaluationData.status === 'rejected' ? 'danger' : 'warning'
                      }
                      onClick={handleSubmitEvaluation}
                      disabled={loading || 
                        ((evaluationData.status === 'rejected' || evaluationData.status === 'revision_required') && 
                        !evaluationData.feedback.trim())}
                    >
                      {loading ? 'Processing...' : 
                        evaluationData.status === 'approved' ? 'Approve Submission' :
                        evaluationData.status === 'rejected' ? 'Reject Submission' : 'Request Revision'
                      }
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Modal.Body>
        </Modal>

      </div>
    </Layout>
  );
};

export default GuideDashboard;