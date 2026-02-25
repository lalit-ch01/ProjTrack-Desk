import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Alert, ProgressBar } from 'react-bootstrap';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

const ProjectWorkflowDemo = () => {
  const [workflowData, setWorkflowData] = useState({
    activities: [],
    topics: [],
    milestones: [],
    submissions: [],
    evaluations: []
  });
  const [dashboardStats, setDashboardStats] = useState({
    total_activities: 0,
    active_activities: 0,
    total_topics: 0,
    pending_topics: 0,
    approved_topics: 0,
    total_submissions: 0,
    pending_evaluations: 0,
    evaluated_submissions: 0,
    upcoming_milestones: 0,
    overdue_milestones: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userRole = localStorage.getItem('role');

  useEffect(() => {
    fetchWorkflowData();
    fetchDashboardStats();
    fetchRecentActivities();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axiosInstance.get('/api/dashboard/workflow-stats/');
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await axiosInstance.get('/api/dashboard/recent-activities/');
      setRecentActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
    }
  };

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      
      // Fetch all workflow-related data (milestone system removed)
      const [activitiesRes, topicsRes, reviewsRes, submissionsRes] = await Promise.all([
        axiosInstance.get('/api/project-activities/'),
        axiosInstance.get('/api/topic-submissions/'),
        axiosInstance.get('/api/project-reviews/'),
        axiosInstance.get('/api/event-submissions/')
      ]);

      setWorkflowData({
        activities: activitiesRes.data,
        topics: topicsRes.data,
        reviews: reviewsRes.data,
        submissions: submissionsRes.data,
        evaluations: []
      });

      // Determine current workflow step
      determineCurrentStep(activitiesRes.data, topicsRes.data, reviewsRes.data, submissionsRes.data);

    } catch (error) {
      setError('Failed to fetch workflow data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const determineCurrentStep = (activities, topics, reviews, submissions) => {
    // Use dashboard stats for more accurate step determination
    if (dashboardStats.total_activities === 0) {
      setCurrentStep(1); // Create Activity
    } else if (dashboardStats.total_topics === 0) {
      setCurrentStep(2); // Submit Topic
    } else if (dashboardStats.pending_topics > 0) {
      setCurrentStep(3); // Topic Review
    } else if (dashboardStats.approved_topics > 0 && reviews.length === 0) {
      setCurrentStep(4); // Schedule Reviews
    } else if (reviews.length > 0 && dashboardStats.total_submissions === 0) {
      setCurrentStep(5); // Submit Work
    } else if (dashboardStats.total_submissions > 0) {
      setCurrentStep(6); // Evaluation & Progress
    }
  };

  const workflowSteps = [
    {
      step: 1,
      title: 'Create Project Activity',
      description: 'Coordinator creates a new project activity',
      icon: '📋',
      role: 'coordinator',
      status: dashboardStats.total_activities > 0 ? 'completed' : 'pending'
    },
    {
      step: 2,
      title: 'Topic Submission',
      description: 'Students submit project topics',
      icon: '📝',
      role: 'student',
      status: dashboardStats.total_topics > 0 ? 'completed' : 'pending'
    },
    {
      step: 3,
      title: 'Topic Review & Approval',
      description: 'Guides review and approve topics',
      icon: '✅',
      role: 'guide',
      status: dashboardStats.approved_topics > 0 ? 'completed' : 
              dashboardStats.pending_topics > 0 ? 'in-progress' : 'pending'
    },
    {
      step: 4,
      title: 'Milestone Creation',
      description: 'Coordinator creates project milestones',
      icon: '🎯',
      role: 'coordinator',
      status: workflowData.milestones.length > 0 ? 'completed' : 'pending'
    },
    {
      step: 5,
      title: 'Milestone Submissions',
      description: 'Students submit milestone deliverables',
      icon: '📤',
      role: 'student',
      status: dashboardStats.total_submissions > 0 ? 'completed' : 'pending'
    },
    {
      step: 6,
      title: 'Evaluation & Progress',
      description: 'Guides evaluate submissions and track progress',
      icon: '📊',
      role: 'guide',
      status: dashboardStats.evaluated_submissions > 0 ? 'completed' : 
              dashboardStats.pending_evaluations > 0 ? 'in-progress' : 'pending'
    }
  ];

  const getStepStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'pending': return 'secondary';
      default: return 'light';
    }
  };

  const getStepProgress = () => {
    const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / workflowSteps.length) * 100;
  };

  const renderWorkflowStep = (step) => (
    <Col key={step.step} lg={4} className="mb-4">
      <Card className={`h-100 border-3 ${step.step === currentStep ? 'border-primary' : 'border-light'} shadow-sm`}>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <span className="me-2 fs-3">{step.icon}</span>
            <span className="fw-bold">Step {step.step}</span>
          </div>
          <Badge bg={getStepStatusColor(step.status)}>
            {step.status.toUpperCase()}
          </Badge>
        </Card.Header>
        <Card.Body>
          <h6 className="mb-2">{step.title}</h6>
          <p className="text-muted small mb-3">{step.description}</p>
          <div className="mb-2">
            <Badge bg="info" className="me-2">
              Role: {step.role.toUpperCase()}
            </Badge>
          </div>
          
          {/* Show specific data for each step */}
          {step.step === 1 && dashboardStats.total_activities > 0 && (
            <div className="mt-3">
              <small className="text-success d-block">
                ✓ {dashboardStats.total_activities} activities created
              </small>
              <small className="text-info d-block">
                Active: {dashboardStats.active_activities}
              </small>
            </div>
          )}
          
          {step.step === 2 && dashboardStats.total_topics > 0 && (
            <div className="mt-3">
              <small className="text-success">
                ✓ {dashboardStats.total_topics} topics submitted
              </small>
            </div>
          )}
          
          {step.step === 3 && dashboardStats.total_topics > 0 && (
            <div className="mt-3">
              <small className="text-info d-block">
                Pending: {dashboardStats.pending_topics}
              </small>
              <small className="text-success d-block">
                Approved: {dashboardStats.approved_topics}
              </small>
              <small className="text-danger d-block">
                Rejected: {dashboardStats.rejected_topics}
              </small>
            </div>
          )}
          
          {step.step === 4 && workflowData.milestones.length > 0 && (
            <div className="mt-3">
              <small className="text-success">
                ✓ {workflowData.milestones.length} milestones created
              </small>
            </div>
          )}
          
          {step.step === 5 && dashboardStats.total_submissions > 0 && (
            <div className="mt-3">
              <small className="text-success">
                ✓ {dashboardStats.total_submissions} submissions made
              </small>
            </div>
          )}
          
          {step.step === 6 && dashboardStats.total_submissions > 0 && (
            <div className="mt-3">
              <small className="text-info d-block">
                Pending: {dashboardStats.pending_evaluations}
              </small>
              <small className="text-success d-block">
                Evaluated: {dashboardStats.evaluated_submissions}
              </small>
            </div>
          )}
        </Card.Body>
        <Card.Footer>
          {step.step === currentStep && (
            <Button 
              variant="primary" 
              size="sm" 
              className="w-100"
              onClick={() => {
                // Navigate to appropriate page based on step
                const navigationMap = {
                  1: '/projects',
                  2: '/projects',
                  3: '/guide-dashboard',
                  4: '/milestones',
                  5: '/milestones',
                  6: '/guide-dashboard'
                };
                window.location.href = navigationMap[step.step];
              }}
            >
              {step.status === 'pending' ? 'Start Step' : 
               step.status === 'in-progress' ? 'Continue' : 'View Details'}
            </Button>
          )}
        </Card.Footer>
      </Card>
    </Col>
  );

  const renderOverallProgress = () => (
    <Card className="mb-4 border-info">
      <Card.Header className="bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-graph-up me-2"></i>
          Overall Project Workflow Progress
        </h5>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <span>Progress</span>
            <span>{Math.round(getStepProgress())}% Complete</span>
          </div>
          <ProgressBar 
            now={getStepProgress()} 
            variant="info"
            className="mb-3"
            style={{ height: '10px' }}
          />
        </div>
        
        <Row>
          <Col md={3}>
            <div className="text-center">
              <h4 className="text-primary">{dashboardStats.total_activities}</h4>
              <small className="text-muted">Total Activities</small>
            </div>
          </Col>
          <Col md={3}>
            <div className="text-center">
              <h4 className="text-warning">{dashboardStats.total_topics}</h4>
              <small className="text-muted">Topics Submitted</small>
            </div>
          </Col>
          <Col md={3}>
            <div className="text-center">
              <h4 className="text-info">{workflowData.milestones.length}</h4>
              <small className="text-muted">Milestones Created</small>
            </div>
          </Col>
          <Col md={3}>
            <div className="text-center">
              <h4 className="text-success">{dashboardStats.total_submissions}</h4>
              <small className="text-muted">Submissions Made</small>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  return (
    <Layout>
      <div className="p-2 p-md-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Project Workflow Dashboard</h2>
          <Button 
            variant="outline-primary" 
            onClick={fetchWorkflowData}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

        {renderOverallProgress()}

        <h4 className="mb-4">Workflow Steps</h4>
        <Row>
          {workflowSteps.map(renderWorkflowStep)}
        </Row>



      </div>
    </Layout>
  );
};

export default ProjectWorkflowDemo;